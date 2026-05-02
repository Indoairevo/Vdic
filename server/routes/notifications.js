import express from 'express';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sqliteDb = require('../db.cjs');
const pg = require('../db_pg.cjs');
import { sendEmail } from '../utils/emailService.cjs';

const router = express.Router();

async function ensureTables() {
  if (pg) {
    await pg.query(`CREATE TABLE IF NOT EXISTS email_logs (
      id SERIAL PRIMARY KEY,
      date TEXT NOT NULL UNIQUE,
      count INTEGER DEFAULT 0
    )`);
  } else {
    sqliteDb.prepare(`CREATE TABLE IF NOT EXISTS email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      count INTEGER DEFAULT 0
    )`).run();
  }
}
ensureTables();

async function getEmailCount() {
  const today = new Date().toISOString().split('T')[0];
  let log;
  if (pg) {
    const { rows } = await pg.query('SELECT count FROM email_logs WHERE date = $1', [today]);
    log = rows[0];
  } else {
    log = sqliteDb.prepare('SELECT count FROM email_logs WHERE date = ?').get(today);
  }
  return log ? log.count : 0;
}

async function incrementEmailCount(count) {
  const today = new Date().toISOString().split('T')[0];
  if (pg) {
    await pg.query(`INSERT INTO email_logs (date, count) VALUES ($1, $2) 
      ON CONFLICT(date) DO UPDATE SET count = email_logs.count + $2`, [today, count]);
  } else {
    // SQLite doesn't support ON CONFLICT in INSERT easily without UPSERT syntax in newer versions
    // Simple approach: try insert, if fail, update
    try {
      sqliteDb.prepare('INSERT INTO email_logs (date, count) VALUES (?, ?)').run(today, count);
    } catch (e) {
      sqliteDb.prepare('UPDATE email_logs SET count = count + ? WHERE date = ?').run(count, today);
    }
  }
}

router.post('/test-config', async (req, res) => {
  try {
    const result = await sendEmail(req.body.email || 'test@example.com', 'Test Email Configuration', 'This is a test email to verify SMTP configuration.', '<p>This is a test email to verify SMTP configuration.</p>');
    if (result.mock) {
      return res.status(400).json({ error: 'SMTP is not configured. Please add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM to your secrets.' });
    }
    res.json({ ok: true, message: 'Test email sent successfully!' });
  } catch (err) {
    console.error('Test email failed:', err);
    res.status(500).json({ error: 'Failed to send test email: ' + err.message });
  }
});

router.post('/send', async (req, res) => {
  const { emails } = req.body; // Expecting list of {email, subject, message}
  
  try {
    const currentCount = await getEmailCount();
    if (currentCount + emails.length > 450) {
      return res.status(429).json({ error: 'Daily email limit of 450 reached.' });
    }

    let sentCount = 0;
    let isMocked = false;
    for (const { email, subject, message } of emails) {
      try {
        const result = await sendEmail(email, subject, message);
        if (result.mock) {
          isMocked = true;
          break; // Stop processing if SMTP is not configured
        }
        sentCount++;
      } catch (err) {
        console.error(`Failed to send email to ${email}`, err);
      }
    }

    if (isMocked) {
      return res.status(400).json({ error: 'SMTP is not configured. Please add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM to your secrets.' });
    }

    await incrementEmailCount(sentCount);
    res.json({ ok: true, sentCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send notifications' });
  }
});

export default router;
