import express from 'express';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sqliteDb = require('../db.cjs');
const pg = require('../db_pg.cjs');
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { logAction } from '../logger.js';
import { triggerAutomation } from '../automation.js';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

const router = express.Router();

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET environment variable is missing in production. Using default.');
}
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login requests per windowMs
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 forgot password requests per hour
  message: { error: 'Too many password reset requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/login', loginLimiter, async (req, res) => {
  const { userId, key } = req.body;
  console.log('Login attempt for user:', userId);
  if (!userId || !key) return res.status(400).json({ error: 'User ID and Key required' });

  // Try Postgres first if configured
  if (pg) {
    try {
      const { rows } = await pg.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [userId]);
      if (rows.length > 0) {
        const u = rows[0];
        const match = await bcrypt.compare(key, u.key_hash);
        if (match) {
          console.log('PG Login successful for:', u.id);
          const user = { ...u };
          delete user.key_hash;
          const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
          
          logAction({
            userId: user.id,
            userName: user.name,
            action: 'User logged in',
            type: 'login',
            ip: req.ip,
            device: req.headers['user-agent']
          });

          return res.json({ user, token });
        }
      }
      console.log('PG Login failed: Invalid credentials');
      triggerAutomation('login_failed', { ip: req.ip, device: req.headers['user-agent'] });
      return res.status(401).json({ error: 'Invalid credentials' });
    } catch (err) {
      console.error('PG login error', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // Fallback to sqlite
  const u = sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (u) {
    const match = await bcrypt.compare(key, u.key_hash);
    if (match) {
      console.log('SQLite Login successful for:', u.id);
      const user = { ...u };
      delete user.key_hash;
      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
      
      logAction({
        userId: user.id,
        userName: user.name,
        action: 'User logged in',
        type: 'login',
        ip: req.ip,
        device: req.headers['user-agent']
      });

      return res.json({ user, token });
    }
  }

  console.log('SQLite Login failed: Invalid credentials');
  triggerAutomation('login_failed', { ip: req.ip, device: req.headers['user-agent'] });
  return res.status(401).json({ error: 'Invalid credentials' });
});

// Password reset request (creates token and logs email stub)
router.post('/forgot', forgotLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  // find user by email
  let user;
  if (pg) {
    const { rows } = await pg.query('SELECT id,email FROM users WHERE email = $1 LIMIT 1', [email]);
    user = rows[0];
  } else {
    user = sqliteDb.prepare('SELECT id,email FROM users WHERE email = ?').get(email);
  }
  
  // Return success even if user not found to prevent enumeration
  if (!user) {
    return res.json({ ok: true, message: 'If an account with that email exists, a password reset link has been sent.' });
  }

  const token = crypto.randomBytes(20).toString('hex');
  const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
  if (pg) {
    await pg.query('INSERT INTO password_resets (user_id,token,expires_at,used) VALUES ($1,$2,$3,$4)', [user.id, token, expires.toISOString(), false]);
  } else {
    sqliteDb.prepare('INSERT INTO password_resets (user_id,token,expires_at,used) VALUES (?,?,?,?)').run(user.id, token, expires.toISOString(), 0);
  }
  
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await transporter.sendMail({
        from: `"VDIC ERP" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Password Reset Request',
        text: `You requested a password reset. Use this token: ${token}\n\nIf you did not request this, please ignore this email.`
      });
      console.log(`Password reset email actually sent to ${email}`);
    } else {
      console.log(`SMTP credentials not configured. Email not sent to ${email}`);
    }
  } catch (emailError) {
    console.error('Failed to send password reset email:', emailError);
  }

  return res.json({ ok: true, message: 'Password reset email sent.' });
});

function validatePassword(password) {
  if (password.length < 8) return 'Password must be at least 8 characters long';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  return null;
}

// Reset password using token
router.post('/reset', async (req, res) => {
  const { token, newKey } = req.body;
  if (!token || !newKey) return res.status(400).json({ error: 'Missing fields' });
  
  const passwordError = validatePassword(newKey);
  if (passwordError) return res.status(400).json({ error: passwordError });

  let row;
  if (pg) {
    const r = await pg.query('SELECT * FROM password_resets WHERE token = $1 AND used = false LIMIT 1', [token]);
    row = r.rows[0];
  } else {
    row = sqliteDb.prepare('SELECT * FROM password_resets WHERE token = ? AND used = 0').get(token);
  }
  if (!row) return res.status(400).json({ error: 'Invalid or used token' });
  if (new Date(row.expires_at) < new Date()) return res.status(400).json({ error: 'Token expired' });
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(newKey, salt);
  if (pg) {
    await pg.query('UPDATE users SET key_hash = $1 WHERE id = $2', [hash, row.user_id]);
    await pg.query('UPDATE password_resets SET used = true WHERE id = $1', [row.id]);
  } else {
    sqliteDb.prepare('UPDATE users SET key_hash = ? WHERE id = ?').run(hash, row.user_id);
    sqliteDb.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(row.id);
  }
  return res.json({ ok: true, message: 'Password reset successful' });
});

// Change password for logged in user
router.post('/change-password', async (req, res) => {
  const token = req.headers['x-access-token'] || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  if (!token) return res.status(401).json({ error: 'Missing token' });
  
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Missing fields' });

  const passwordError = validatePassword(newPassword);
  if (passwordError) return res.status(400).json({ error: passwordError });

  let user;
  if (pg) {
    const { rows } = await pg.query('SELECT * FROM users WHERE id = $1', [payload.id]);
    user = rows[0];
  } else {
    user = sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(payload.id);
  }

  if (!user) return res.status(404).json({ error: 'User not found' });

  const match = await bcrypt.compare(oldPassword, user.key_hash);
  if (!match) return res.status(400).json({ error: 'Incorrect current password' });

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(newPassword, salt);

  if (pg) {
    await pg.query('UPDATE users SET key_hash = $1 WHERE id = $2', [hash, user.id]);
  } else {
    sqliteDb.prepare('UPDATE users SET key_hash = ? WHERE id = ?').run(hash, user.id);
  }

  return res.json({ ok: true, message: 'Password changed successfully' });
});

export default router;
