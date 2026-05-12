import express from 'express';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sqliteDb = require('../db.cjs');
const pg = require('../db_pg.cjs');
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { logAction } from '../logger.js';
import { triggerAutomation } from '../automation.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';

router.use(express.json());

// Transaction route moved to top and renamed to avoid conflicts
router.post('/transactions', requireAuth, requireRole('admin'), async (req, res) => {
  console.log('HIT: POST /transactions');
  console.log('Body:', req.body);
  const { type, description, amount } = req.body; // type: 'income' or 'expense'
  if (!type || amount === undefined || amount === null || amount === '') return res.status(400).json({ error: 'Missing fields' });
  
  const val = Number(amount);
  if (!Number.isInteger(val) || val <= 0) return res.status(400).json({ error: 'Amount must be a positive integer (in cents/paise)' });

  const date = new Date().toLocaleDateString();

  try {
    if (pg) {
      await pg.query('BEGIN');
      try {
        // Ensure finance row exists
        const check = await pg.query('SELECT id FROM finances WHERE id = 1');
        if (check.rows.length === 0) {
          await pg.query('INSERT INTO finances (id, balance, income, expense) VALUES (1, 0, 0, 0)');
        }

        await pg.query('INSERT INTO finance_history (type, description, amount, date) VALUES ($1, $2, $3, $4)', [type, description, val, date]);
        if (type === 'income') {
          await pg.query('UPDATE finances SET balance = balance + $1, income = income + $1 WHERE id = 1', [val]);
        } else {
          await pg.query('UPDATE finances SET balance = balance - $1, expense = expense + $1 WHERE id = 1', [val]);
        }
        await pg.query('COMMIT');
        return res.json({ ok: true });
      } catch (e) {
        await pg.query('ROLLBACK');
        throw e;
      }
    }

    const updateFin = sqliteDb.transaction(() => {
      // Ensure finance row exists
      const check = sqliteDb.prepare('SELECT id FROM finances WHERE id = 1').get();
      if (!check) {
        sqliteDb.prepare('INSERT INTO finances (id, balance, income, expense) VALUES (1, 0, 0, 0)').run();
      }

      sqliteDb.prepare('INSERT INTO finance_history (type, description, amount, date) VALUES (?, ?, ?, ?)').run(type, description, val, date);
      if (type === 'income') {
        sqliteDb.prepare('UPDATE finances SET balance = balance + ?, income = income + ? WHERE id = 1').run(val, val);
      } else {
        sqliteDb.prepare('UPDATE finances SET balance = balance - ?, expense = expense + ? WHERE id = 1').run(val, val);
      }
    });
    updateFin();
    res.json({ ok: true });
  } catch (err) {
    console.error('Error adding transaction:', err);
    res.status(500).json({ error: 'Failed to add transaction' });
  }
});

async function requireAuth(req, res, next) {
  const token = req.headers['x-access-token'] || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // load user from DB by id
    if (pg) {
      const { rows } = await pg.query('SELECT id,role,name,email,className,rollNo,subject,assignedClass,phone,status,freePeriods FROM users WHERE id = $1', [payload.id]);
      if (rows.length === 0) return res.status(401).json({ error: 'Invalid token (user)' });
      req.user = rows[0];
      return next();
    }
    // fallback sqlite
    const user = sqliteDb.prepare('SELECT id,role,name,email,className,rollNo,subject,assignedClass,phone,status,freePeriods FROM users WHERE id = ?').get(payload.id);
    if (!user) return res.status(401).json({ error: 'Invalid token (user)' });
    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    const allowed = Array.isArray(roles) ? roles : [roles];
    if (!allowed.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    return next();
  };
}

// Public endpoint for submitting admission applications
router.post('/admissions', async (req, res) => {
  const { studentName, dob, gender, bloodGroup, aadhaarNumber, category, appliedClass, previousSchool, fatherName, motherName, annualIncome, phone, emergencyContact, address } = req.body;
  if (!studentName || !dob || !appliedClass || !fatherName || !motherName || !phone || !address) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    if (pg) {
      await pg.query(
        'INSERT INTO admission_applications (studentName, dob, gender, bloodGroup, aadhaarNumber, category, appliedClass, previousSchool, fatherName, motherName, annualIncome, phone, emergencyContact, address) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)',
        [studentName, dob, gender, bloodGroup, aadhaarNumber, category, appliedClass, previousSchool, fatherName, motherName, annualIncome, phone, emergencyContact, address]
      );
    } else {
      sqliteDb.prepare(
        'INSERT INTO admission_applications (studentName, dob, gender, bloodGroup, aadhaarNumber, category, appliedClass, previousSchool, fatherName, motherName, annualIncome, phone, emergencyContact, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(studentName, dob, gender, bloodGroup, aadhaarNumber, category, appliedClass, previousSchool, fatherName, motherName, annualIncome, phone, emergencyContact, address);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Error submitting admission:', err);
    res.status(500).json({ error: 'Failed to submit admission application' });
  }
});

// Admin/Staff endpoint to get admission applications
router.get('/admissions', requireAuth, requireRole(['admin', 'staff']), async (req, res) => {
  try {
    if (pg) {
      const { rows } = await pg.query('SELECT * FROM admission_applications ORDER BY created_at DESC');
      res.json(rows);
    } else {
      const rows = sqliteDb.prepare('SELECT * FROM admission_applications ORDER BY created_at DESC').all();
      res.json(rows);
    }
  } catch (err) {
    console.error('Error fetching admissions:', err);
    res.status(500).json({ error: 'Failed to fetch admissions' });
  }
});

// Admin/Staff endpoint to update admission status
router.put('/admissions/:id', requireAuth, requireRole(['admin', 'staff']), async (req, res) => {
  const { id } = req.params;
  const { status, message } = req.body;
  if (!status) return res.status(400).json({ error: 'Missing status' });

  try {
    if (pg) {
      await pg.query('UPDATE admission_applications SET status = $1, message = $2 WHERE id = $3', [status, message || null, id]);
    } else {
      sqliteDb.prepare('UPDATE admission_applications SET status = ?, message = ? WHERE id = ?').run(status, message || null, id);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Error updating admission:', err);
    res.status(500).json({ error: 'Failed to update admission' });
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.get('/notices', requireAuth, async (req, res) => {
  if (pg) {
    const { rows } = await pg.query('SELECT * FROM notices ORDER BY id DESC');
    return res.json(rows);
  }
  const list = sqliteDb.prepare('SELECT * FROM notices ORDER BY id DESC').all();
  res.json(list);
});

router.post('/notices', requireAuth, async (req, res) => {
  const { title, content, target } = req.body;
  // allow admin or teacher to publish notices
  if (!['admin','teacher'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  if (pg) {
    const info = await pg.query('INSERT INTO notices (title,content,target,date,author) VALUES ($1,$2,$3,$4,$5) RETURNING id', [title, content, target || 'all', new Date().toLocaleDateString(), req.user.name]);
    const id = info.rows[0].id;
    // emit notice via socket
    const io = req.app.get('io');
    if (io) {
      io.emit('notice', { id, title, content, target: target || 'all', date: new Date().toLocaleDateString(), author: req.user.name });
    }
    return res.json({ id });
  }
  const stmt = sqliteDb.prepare('INSERT INTO notices (title,content,target,date,author) VALUES (?,?,?,?,?)');
  const info = stmt.run(title, content, target || 'all', new Date().toLocaleDateString(), req.user.name);
  const id = info.lastInsertRowid;
  const io = req.app.get('io');
  if (io) io.emit('notice', { id, title, content, target: target || 'all', date: new Date().toLocaleDateString(), author: req.user.name });
  res.json({ id });
});

router.delete('/notices/:id', requireAuth, requireRole(['admin', 'teacher']), async (req, res) => {
  const { id } = req.params;
  try {
    if (pg) {
      await pg.query('DELETE FROM notices WHERE id = $1', [id]);
    } else {
      sqliteDb.prepare('DELETE FROM notices WHERE id = ?').run(id);
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete notice' });
  }
});

// Attendance endpoints
router.get('/parent/student/:studentId', requireAuth, requireRole('parent'), async (req, res) => {
  const { studentId } = req.params;
  // Verify parent has access to this student (simplified: assume studentId is linked to parent in users table)
  try {
    let student;
    if (pg) {
      const r = await pg.query('SELECT * FROM users WHERE id = $1 AND parent_id = $2', [studentId, req.user.id]);
      student = r.rows[0];
    } else {
      student = sqliteDb.prepare('SELECT * FROM users WHERE id = ? AND parent_id = ?').get(studentId, req.user.id);
    }
    if (!student) return res.status(404).json({ error: 'Student not found or access denied' });
    
    // Fetch attendance and marks
    let attendance = [];
    let marks = [];
    if (pg) {
      attendance = (await pg.query('SELECT * FROM attendance WHERE userId = $1', [studentId])).rows;
      marks = (await pg.query('SELECT * FROM marks WHERE student_id = $1', [studentId])).rows;
    } else {
      attendance = sqliteDb.prepare('SELECT * FROM attendance WHERE userId = ?').all(studentId);
      marks = sqliteDb.prepare('SELECT * FROM marks WHERE student_id = ?').all(studentId);
    }
    
    res.json({ student, attendance, marks });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch student data' });
  }
});

router.post('/attendance', requireAuth, async (req, res) => {
  const { userId, date, status } = req.body;
  if (!userId || !date || !status) return res.status(400).json({ error: 'Missing fields' });
  // enforce upload rules:
  // - if target user is a teacher -> only admin may upload
  // - if target user is a student -> only teachers may upload
  let targetUser;
  if (pg) {
    const r = await pg.query('SELECT id,role FROM users WHERE id = $1 LIMIT 1', [userId]);
    targetUser = r.rows[0];
  } else {
    targetUser = sqliteDb.prepare('SELECT id,role FROM users WHERE id = ?').get(userId);
  }
  if (!targetUser) return res.status(404).json({ error: 'Target user not found' });
  if (targetUser.role === 'teacher' && req.user.role !== 'admin') return res.status(403).json({ error: 'Only admin may upload teacher attendance' });
  if (targetUser.role === 'student' && req.user.role !== 'teacher') return res.status(403).json({ error: 'Only teachers may upload student attendance' });

  if (pg) {
    const info = await pg.query('INSERT INTO attendance (userId,date,status) VALUES ($1,$2,$3) RETURNING id', [userId, date, status]);
    await pg.query('UPDATE users SET status = $1 WHERE id = $2', [status, userId]);
    const io = req.app.get('io');
    if (io) io.emit('attendance', { id: info.rows[0].id, userId, date, status });
    return res.json({ id: info.rows[0].id });
  }
  const stmt = sqliteDb.prepare('INSERT INTO attendance (userId,date,status) VALUES (?,?,?)');
  const info = stmt.run(userId, date, status);
  sqliteDb.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, userId);
  const io = req.app.get('io');
  if (io) io.emit('attendance', { id: info.lastInsertRowid, userId, date, status });
  res.json({ id: info.lastInsertRowid });
});

router.get('/attendance/:userId', requireAuth, async (req, res) => {
  const { userId } = req.params;
  if (pg) {
    const { rows } = await pg.query('SELECT * FROM attendance WHERE "userId" = $1 ORDER BY id DESC', [userId]);
    return res.json(rows);
  }
  const rows = sqliteDb.prepare('SELECT * FROM attendance WHERE userId = ? ORDER BY id DESC').all(userId);
  res.json(rows);
});

router.get('/attendance/date/:date', requireAuth, async (req, res) => {
  const { date } = req.params;
  if (pg) {
    const { rows } = await pg.query('SELECT * FROM attendance WHERE date = $1', [date]);
    return res.json(rows);
  }
  const rows = sqliteDb.prepare('SELECT * FROM attendance WHERE date = ?').all(date);
  res.json(rows);
});

// Complaints
router.post('/complaints', requireAuth, async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Missing text' });
  if (pg) {
    const info = await pg.query('INSERT INTO complaints (byName,role,text,status,date) VALUES ($1,$2,$3,$4,$5) RETURNING id', [req.user.name, req.user.role, text, 'Pending', new Date().toLocaleDateString()]);
    const io = req.app.get('io');
    if (io) io.emit('complaint', { id: info.rows[0].id, byName: req.user.name, role: req.user.role, text });
    return res.json({ id: info.rows[0].id });
  }
  const stmt = sqliteDb.prepare('INSERT INTO complaints (byName,role,text,status,date) VALUES (?,?,?,?,?)');
  const info = stmt.run(req.user.name, req.user.role, text, 'Pending', new Date().toLocaleDateString());
  const io = req.app.get('io');
  if (io) io.emit('complaint', { id: info.lastInsertRowid, byName: req.user.name, role: req.user.role, text });
  res.json({ id: info.lastInsertRowid });
});

  // File upload endpoint (single file)
  const uploadDir = path.join(__dirname, '..', 'uploads');
  const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, uploadDir); },
    filename: function (req, file, cb) { cb(null, Date.now() + '-' + file.originalname); }
  });
  const upload = multer({ storage });

  router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const filepath = `/uploads/${req.file.filename}`;
    if (pg) {
      await pg.query('INSERT INTO files (filename,path,uploader_id) VALUES ($1,$2,$3)', [req.file.originalname, filepath, req.user.id]);
    } else {
      sqliteDb.prepare('INSERT INTO files (filename,path,uploader_id,created_at) VALUES (?,?,?,?)').run(req.file.originalname, filepath, req.user.id, new Date().toLocaleString());
    }

    logAction({
      userId: req.user.id,
      userName: req.user.name,
      action: `Uploaded file: ${req.file.originalname}`,
      type: 'file',
      details: { filename: req.file.originalname, path: filepath }
    });

    triggerAutomation('file_uploaded', { filename: req.file.originalname, uploader: req.user.name });

    res.json({ ok: true, path: filepath });
  });

  // PDF generation stub: accepts JSON, returns a placeholder URL
  router.post('/pdf/generate', requireAuth, async (req, res) => {
    const { title } = req.body;
    // In production generate PDF; here return stub path
    const pdfPath = `/uploads/${Date.now()}-${(title||'report').replace(/\s+/g,'_')}.pdf`;
    res.json({ ok: true, url: pdfPath });
  });

  // Payments: create payment record (stub integration)
  router.post('/payments/create', requireAuth, requireRole('admin'), async (req, res) => {
    const { student_id, amount } = req.body;
    if (!student_id || !amount) return res.status(400).json({ error: 'Missing fields' });
    const providerRef = `STUB-${Date.now()}`;
    if (pg) {
      const info = await pg.query('INSERT INTO payments (student_id,amount,status,provider_ref) VALUES ($1,$2,$3,$4) RETURNING id', [student_id, amount, 'pending', providerRef]);
      return res.json({ id: info.rows[0].id, providerRef });
    }
    const stmt = sqliteDb.prepare('INSERT INTO payments (student_id,amount,status,provider_ref,created_at) VALUES (?,?,?,?,?)');
    const info = stmt.run(student_id, amount, 'pending', providerRef, new Date().toLocaleString());
    res.json({ id: info.lastInsertRowid, providerRef });
  });

  // Payments webhook stub
  router.post('/payments/webhook', express.json(), async (req, res) => {
    const { providerRef, status } = req.body;
    if (!providerRef || !status) return res.status(400).json({ error: 'Missing fields' });
    if (pg) {
      await pg.query('UPDATE payments SET status = $1 WHERE provider_ref = $2', [status, providerRef]);
    } else {
      sqliteDb.prepare('UPDATE payments SET status = ? WHERE provider_ref = ?').run(status, providerRef);
    }
    res.json({ ok: true });
  });

router.get('/complaints', requireAuth, requireRole('admin'), async (req, res) => {
  if (pg) { const { rows } = await pg.query('SELECT * FROM complaints ORDER BY id DESC'); return res.json(rows); }
  const rows = sqliteDb.prepare('SELECT * FROM complaints ORDER BY id DESC').all();
  res.json(rows);
});

// Substitute suggestion: when marking teacher absent, create sub-request and notify matches
router.post('/substitute/request', requireAuth, requireRole('admin'), async (req, res) => {
  const { teacherId } = req.body;
  if (!teacherId) return res.status(400).json({ error: 'Missing teacherId' });
  // find teacher record
  let teacher;
  if (pg) {
    const { rows } = await pg.query('SELECT * FROM users WHERE id = $1', [teacherId]);
    teacher = rows[0];
  } else {
    teacher = sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(teacherId);
  }
  if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
  // find substitutes: same subject, status Present, has freePeriods
  let candidates = [];
  if (pg) {
    const { rows } = await pg.query('SELECT * FROM users WHERE role = $1 AND status = $2', ['teacher', 'Present']);
    candidates = rows.filter(r => r.subject === teacher.subject && r.freeperiods && r.freeperiods.length > 0);
  } else {
    const rows = sqliteDb.prepare('SELECT * FROM users WHERE role = ? AND status = ?').all('teacher', 'Present');
    candidates = rows.filter(r => r.subject === teacher.subject && r.freePeriods && r.freePeriods.length > 0);
  }
  const io = req.app.get('io');
  if (io) {
    candidates.forEach(c => io.to(c.id).emit('sub_request', { absentTeacher: teacher.name, subject: teacher.subject, freePeriods: c.freePeriods }));
  }
  res.json({ candidates: candidates.map(c => ({ id: c.id, name: c.name, freePeriods: c.freePeriods })) });
});

router.get('/homeworks', requireAuth, async (req, res) => {
  let homeworks = [];
  if (pg) {
    const { rows } = await pg.query('SELECT * FROM homeworks ORDER BY id DESC');
    homeworks = rows;
  } else {
    homeworks = sqliteDb.prepare('SELECT * FROM homeworks ORDER BY id DESC').all();
  }

  // Fetch submissions and doubts for each homework
  for (let hw of homeworks) {
    if (pg) {
      const subRes = await pg.query('SELECT hs.*, u.name as student_name FROM homework_submissions hs JOIN users u ON hs.student_id = u.id WHERE hs.homework_id = $1', [hw.id]);
      hw.submissions = subRes.rows;
      const doubtRes = await pg.query('SELECT hd.*, u.name as student_name FROM homework_doubts hd JOIN users u ON hd.student_id = u.id WHERE hd.homework_id = $1', [hw.id]);
      hw.doubts = doubtRes.rows;
    } else {
      hw.submissions = sqliteDb.prepare('SELECT hs.*, u.name as student_name FROM homework_submissions hs JOIN users u ON hs.student_id = u.id WHERE hs.homework_id = ?').all(hw.id);
      hw.doubts = sqliteDb.prepare('SELECT hd.*, u.name as student_name FROM homework_doubts hd JOIN users u ON hd.student_id = u.id WHERE hd.homework_id = ?').all(hw.id);
    }
  }

  res.json(homeworks);
});

router.post('/homeworks', requireAuth, requireRole('teacher'), async (req, res) => {
  const { title, description, date, className, subject, image_url } = req.body;
  if (pg) {
    const info = await pg.query('INSERT INTO homeworks (title,description,date,publishDate,className,subject,teacherName,image_url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id', [title, description, date, new Date().toLocaleDateString(), className, subject, req.user.name, image_url]);
    return res.json({ id: info.rows[0].id });
  }
  const stmt = sqliteDb.prepare('INSERT INTO homeworks (title,description,date,publishDate,className,subject,teacherName,image_url) VALUES (?,?,?,?,?,?,?,?)');
  const info = stmt.run(title, description, date, new Date().toLocaleDateString(), className, subject, req.user.name, image_url);
  res.json({ id: info.lastInsertRowid });
});

router.delete('/homeworks/:id', requireAuth, requireRole(['teacher', 'admin']), async (req, res) => {
  const { id } = req.params;
  try {
    if (pg) {
      await pg.query('DELETE FROM homework_doubts WHERE homework_id = $1', [id]);
      await pg.query('DELETE FROM homework_submissions WHERE homework_id = $1', [id]);
      await pg.query('DELETE FROM homeworks WHERE id = $1', [id]);
    } else {
      sqliteDb.prepare('DELETE FROM homework_doubts WHERE homework_id = ?').run(id);
      sqliteDb.prepare('DELETE FROM homework_submissions WHERE homework_id = ?').run(id);
      sqliteDb.prepare('DELETE FROM homeworks WHERE id = ?').run(id);
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete homework' });
  }
});

router.post('/homeworks/:id/submit', requireAuth, requireRole('student'), async (req, res) => {
  const { id } = req.params;
  const { image_url } = req.body;
  const submitted_at = new Date().toISOString();
  if (pg) {
    await pg.query('INSERT INTO homework_submissions (homework_id, student_id, image_url, submitted_at) VALUES ($1, $2, $3, $4)', [id, req.user.id, image_url, submitted_at]);
  } else {
    sqliteDb.prepare('INSERT INTO homework_submissions (homework_id, student_id, image_url, submitted_at) VALUES (?, ?, ?, ?)').run(id, req.user.id, image_url, submitted_at);
  }
  res.json({ success: true });
});

router.post('/homeworks/:id/doubt', requireAuth, requireRole('student'), async (req, res) => {
  const { id } = req.params;
  const { doubt_text } = req.body;
  const created_at = new Date().toISOString();
  if (pg) {
    await pg.query('INSERT INTO homework_doubts (homework_id, student_id, doubt_text, created_at) VALUES ($1, $2, $3, $4)', [id, req.user.id, doubt_text, created_at]);
  } else {
    sqliteDb.prepare('INSERT INTO homework_doubts (homework_id, student_id, doubt_text, created_at) VALUES (?, ?, ?, ?)').run(id, req.user.id, doubt_text, created_at);
  }
  res.json({ success: true });
});

router.post('/homeworks/doubts/:doubtId/reply', requireAuth, requireRole('teacher'), async (req, res) => {
  const { doubtId } = req.params;
  const { teacher_reply } = req.body;
  if (pg) {
    await pg.query('UPDATE homework_doubts SET teacher_reply = $1 WHERE id = $2', [teacher_reply, doubtId]);
  } else {
    sqliteDb.prepare('UPDATE homework_doubts SET teacher_reply = ? WHERE id = ?').run(teacher_reply, doubtId);
  }
  res.json({ success: true });
});

router.get('/users', requireAuth, requireRole(['admin', 'teacher', 'staff']), async (req, res) => {
  if (pg) { const { rows } = await pg.query('SELECT id,role,name,email,className,rollNo,subject,assignedClass,phone,status,freePeriods FROM users'); return res.json(rows); }
  const list = sqliteDb.prepare('SELECT id,role,name,email,className,rollNo,subject,assignedClass,phone,status,freePeriods FROM users').all();
  res.json(list);
});

function validatePassword(password) {
  if (password.length < 8) return 'Password must be at least 8 characters long';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  return null;
}

router.post('/users', requireAuth, requireRole(['admin', 'teacher', 'staff']), async (req, res) => {
  console.log('POST /users body:', req.body);
  const { id, role, name, email, key, className, rollNo, subject, assignedClass, phone, status, freePeriods } = req.body;
  
  if (['teacher', 'staff'].includes(req.user.role)) {
    if (role !== 'student') return res.status(403).json({ error: 'Teachers and staff can only add students' });
  }

  if (!key) return res.status(400).json({ error: 'Login Key is required' });

  const passwordError = validatePassword(key);
  if (passwordError) return res.status(400).json({ error: passwordError });

  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(key, salt);
    const uid = id || uuidv4();
    if (pg) {
      await pg.query('INSERT INTO users (id,role,name,email,key_hash,className,rollNo,subject,assignedClass,phone,status,freePeriods) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)', [uid, role, name, email || null, hash, className || null, rollNo || null, subject || null, assignedClass || null, phone || null, status || null, freePeriods || null]);
      return res.json({ ok: true, id: uid });
    }
    const stmt = sqliteDb.prepare('INSERT OR REPLACE INTO users (id,role,name,email,key_hash,className,rollNo,subject,assignedClass,phone,status,freePeriods) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
    stmt.run(uid, role, name, email || null, hash, className || null, rollNo || null, subject || null, assignedClass || null, phone || null, status || null, freePeriods || null);
    
    logAction({
      userId: req.user.id,
      userName: req.user.name,
      action: `Added user: ${name} (${role})`,
      type: 'activity',
      details: { targetId: uid, role }
    });

    triggerAutomation('user_added', { userId: uid, name, role });

    res.json({ ok: true, id: uid });
  } catch (err) {
    console.error('Error adding user:', err);
    res.status(500).json({ error: 'Failed to add user' });
  }
});

router.put('/users/:id', requireAuth, requireRole(['admin', 'teacher', 'staff']), async (req, res) => {
  const { id } = req.params;
  const { role, name, email, className, rollNo, subject, assignedClass, phone, status, freePeriods } = req.body;

  try {
    let targetUser;
    if (pg) {
      const { rows } = await pg.query('SELECT role FROM users WHERE id = $1', [id]);
      targetUser = rows[0];
    } else {
      targetUser = sqliteDb.prepare('SELECT role FROM users WHERE id = ?').get(id);
    }

    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    if (['teacher', 'staff'].includes(req.user.role) && targetUser.role !== 'student') {
      return res.status(403).json({ error: 'Teachers and staff can only edit students' });
    }

    if (pg) {
      await pg.query(
        'UPDATE users SET role = COALESCE($1, role), name = COALESCE($2, name), email = COALESCE($3, email), className = COALESCE($4, className), rollNo = COALESCE($5, rollNo), subject = COALESCE($6, subject), assignedClass = COALESCE($7, assignedClass), phone = COALESCE($8, phone), status = COALESCE($9, status), freePeriods = COALESCE($10, freePeriods) WHERE id = $11',
        [role, name, email, className, rollNo, subject, assignedClass, phone, status, freePeriods, id]
      );
    } else {
      const stmt = sqliteDb.prepare(
        'UPDATE users SET role = COALESCE(?, role), name = COALESCE(?, name), email = COALESCE(?, email), className = COALESCE(?, className), rollNo = COALESCE(?, rollNo), subject = COALESCE(?, subject), assignedClass = COALESCE(?, assignedClass), phone = COALESCE(?, phone), status = COALESCE(?, status), freePeriods = COALESCE(?, freePeriods) WHERE id = ?'
      );
      stmt.run(role, name, email, className, rollNo, subject, assignedClass, phone, status, freePeriods, id);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/users/:id', requireAuth, requireRole(['admin', 'teacher']), async (req, res) => {
  const { id } = req.params;
  
  try {
    let targetUser;
    if (pg) {
      const { rows } = await pg.query('SELECT role FROM users WHERE id = $1', [id]);
      targetUser = rows[0];
    } else {
      targetUser = sqliteDb.prepare('SELECT role FROM users WHERE id = ?').get(id);
    }

    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    if (req.user.role === 'teacher' && targetUser.role !== 'student') {
      return res.status(403).json({ error: 'Teachers can only delete students' });
    }

    if (pg) {
      await pg.query('DELETE FROM users WHERE id = $1', [id]);
    } else {
      sqliteDb.prepare('DELETE FROM users WHERE id = ?').run(id);
    }

    logAction({
      userId: req.user.id,
      userName: req.user.name,
      action: `Deleted user ID: ${id}`,
      type: 'activity',
      details: { targetId: id }
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});


// FEES & FINANCE
let qrCodeUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=UPI_ID_HERE';

router.get('/settings/qr', requireAuth, (req, res) => {
  res.json({ url: qrCodeUrl });
});

router.post('/settings/qr', requireAuth, requireRole(['admin']), (req, res) => {
  const { url } = req.body;
  qrCodeUrl = url;
  res.json({ ok: true });
});

router.get('/fees', requireAuth, async (req, res) => {
  try {
    if (pg) {
      let rows;
      if (req.user.role === 'student') {
        const result = await pg.query('SELECT f.*, u.name as student_name, u.className, u.rollNo FROM fees f JOIN users u ON f.student_id = u.id WHERE f.student_id = $1', [req.user.id]);
        rows = result.rows;
      } else {
        const result = await pg.query('SELECT f.*, u.name as student_name, u.className, u.rollNo FROM fees f JOIN users u ON f.student_id = u.id');
        rows = result.rows;
      }
      return res.json(rows);
    } else {
      let rows;
      if (req.user.role === 'student') {
        rows = sqliteDb.prepare('SELECT f.*, u.name as student_name, u.className, u.rollNo FROM fees f JOIN users u ON f.student_id = u.id WHERE f.student_id = ?').all(req.user.id);
      } else {
        rows = sqliteDb.prepare('SELECT f.*, u.name as student_name, u.className, u.rollNo FROM fees f JOIN users u ON f.student_id = u.id').all();
      }
      res.json(rows);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/fees/pay', requireAuth, requireRole(['student']), async (req, res) => {
  const { feeId, providerRef } = req.body;
  try {
    if (pg) {
      await pg.query('UPDATE fees SET status = $1, payment_date = $2, provider_ref = $3 WHERE id = $4', ['Pending Verification', new Date().toISOString(), providerRef, feeId]);
    } else {
      sqliteDb.prepare('UPDATE fees SET status = ?, payment_date = ?, provider_ref = ? WHERE id = ?').run('Pending Verification', new Date().toISOString(), providerRef, feeId);
    }
    
    // Emit notification
    const io = req.app.get('io');
    if (io) {
      io.emit('notification', {
        title: 'Fee Payment',
        message: `Student ${req.user.name} has initiated a fee payment.`,
        type: 'fee_payment',
        studentId: req.user.id,
        feeId: feeId
      });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/fees/verify', requireAuth, requireRole(['admin', 'teacher']), async (req, res) => {
  const { feeId } = req.body;
  try {
    let fee;
    if (pg) {
      const { rows } = await pg.query('SELECT * FROM fees WHERE id = $1', [feeId]);
      fee = rows[0];
    } else {
      fee = sqliteDb.prepare('SELECT * FROM fees WHERE id = ?').get(feeId);
    }

    if (!fee) return res.status(404).json({ error: 'Fee record not found' });
    if (fee.status === 'Paid') return res.status(400).json({ error: 'Already paid' });

    if (pg) {
      await pg.query('UPDATE fees SET status = $1 WHERE id = $2', ['Paid', feeId]);
      await pg.query('UPDATE finances SET balance = balance + $1, income = income + $1 WHERE id = 1', [fee.amount]);
      await pg.query('INSERT INTO finance_history (type, description, amount, date) VALUES ($1, $2, $3, $4)', ['Income', `Fee Payment: Student ${fee.student_id}`, fee.amount, new Date().toISOString()]);
    } else {
      sqliteDb.prepare('UPDATE fees SET status = ? WHERE id = ?').run('Paid', feeId);
      sqliteDb.prepare('UPDATE finances SET balance = balance + ?, income = income + ? WHERE id = 1').run(fee.amount, fee.amount);
      sqliteDb.prepare('INSERT INTO finance_history (type, description, amount, date) VALUES (?, ?, ?, ?)').run('Income', `Fee Payment: Student ${fee.student_id}`, fee.amount, new Date().toISOString());
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});







router.get('/finances', requireAuth, requireRole('admin'), async (req, res) => {
  if (pg) {
    const fin = await pg.query('SELECT * FROM finances WHERE id = 1');
    const history = await pg.query('SELECT * FROM finance_history ORDER BY id DESC');
    return res.json({ finances: fin.rows[0] || { balance: 0, income: 0, expense: 0 }, history: history.rows });
  }
  let fin = sqliteDb.prepare('SELECT * FROM finances WHERE id = 1').get();
  if (!fin) {
    sqliteDb.prepare('INSERT INTO finances (id, balance, income, expense) VALUES (1, 0, 0, 0)').run();
    fin = { balance: 0, income: 0, expense: 0 };
  }
  const history = sqliteDb.prepare('SELECT * FROM finance_history ORDER BY id DESC').all();
  res.json({ finances: fin, history });
});

// Classes endpoints
router.post('/classes', requireAuth, requireRole('admin'), async (req, res) => {
  console.log('POST /classes body:', req.body);
  const { class_name, section, class_teacher_id } = req.body;
  if (!class_name) return res.status(400).json({ error: 'Missing class_name' });
  
  try {
    if (pg) {
      const info = await pg.query('INSERT INTO classes (class_name,section,class_teacher_id) VALUES ($1,$2,$3) RETURNING id', [class_name, section || null, class_teacher_id || null]);
      return res.json({ id: info.rows[0].id });
    }
    const stmt = sqliteDb.prepare('INSERT INTO classes (class_name,section,class_teacher_id) VALUES (?,?,?)');
    const info = stmt.run(class_name, section || null, class_teacher_id || null);
    res.json({ id: info.lastInsertRowid });
  } catch (err) {
    console.error('Error adding class:', err);
    res.status(500).json({ error: 'Failed to add class' });
  }
});

router.get('/classes', requireAuth, async (req, res) => {
  if (pg) { const { rows } = await pg.query('SELECT * FROM classes ORDER BY id'); return res.json(rows); }
  const rows = sqliteDb.prepare('SELECT * FROM classes ORDER BY id').all();
  res.json(rows);
});

router.delete('/classes/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    if (pg) {
      await pg.query('DELETE FROM classes WHERE id = $1', [id]);
    } else {
      sqliteDb.prepare('DELETE FROM classes WHERE id = ?').run(id);
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete class' });
  }
});

// Subjects
router.post('/subjects', requireAuth, requireRole('admin'), async (req, res) => {
  const { subject_name, teacher_id, class_id, stream } = req.body;
  if (!subject_name) return res.status(400).json({ error: 'Missing subject_name' });
  if (pg) {
    const info = await pg.query('INSERT INTO subjects (subject_name,teacher_id,class_id,stream) VALUES ($1,$2,$3,$4) RETURNING id', [subject_name, teacher_id || null, class_id || null, stream || null]);
    return res.json({ id: info.rows[0].id });
  }
  const stmt = sqliteDb.prepare('INSERT INTO subjects (subject_name,teacher_id,class_id,stream) VALUES (?,?,?,?)');
  const info = stmt.run(subject_name, teacher_id || null, class_id || null, stream || null);
  res.json({ id: info.lastInsertRowid });
});

router.get('/subjects', requireAuth, async (req, res) => {
  if (pg) { const { rows } = await pg.query('SELECT * FROM subjects ORDER BY id'); return res.json(rows); }
  const rows = sqliteDb.prepare('SELECT * FROM subjects ORDER BY id').all();
  res.json(rows);
});

router.delete('/subjects/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    if (pg) {
      await pg.query('DELETE FROM subjects WHERE id = $1', [id]);
    } else {
      sqliteDb.prepare('DELETE FROM subjects WHERE id = ?').run(id);
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete subject' });
  }
});

// Exams and marks
router.post('/exams', requireAuth, requireRole('admin'), async (req, res) => {
  const { exam_name, start_date, end_date, class_name, subject, exam_date, start_time, end_time, seating_plan } = req.body;
  if (!exam_name || !class_name) return res.status(400).json({ error: 'Missing fields' });
  
  const class_id = parseInt(class_name) || 0;
  const subject_id = parseInt(subject) || 0;

  if (pg) {
    const info = await pg.query(
      'INSERT INTO exams (exam_type, class_id, date, subject_id, exam_name, start_date, end_date, class_name, subject, exam_date, start_time, end_time, seating_plan) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id', 
      [exam_name, class_id, exam_date, subject_id, exam_name, start_date, end_date, class_name, subject, exam_date, start_time, end_time, seating_plan]
    );
    return res.json({ id: info.rows[0].id });
  }
  
  const stmt = sqliteDb.prepare('INSERT INTO exams (exam_type, class_id, date, subject_id, exam_name, start_date, end_date, class_name, subject, exam_date, start_time, end_time, seating_plan) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
  const info = stmt.run(exam_name, class_id, exam_date, subject_id, exam_name, start_date, end_date, class_name, subject, exam_date, start_time, end_time, seating_plan);
  res.json({ id: info.lastInsertRowid });
});

router.delete('/exams/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  if (pg) {
    await pg.query('DELETE FROM exams WHERE id = $1', [id]);
    return res.json({ success: true });
  }
  sqliteDb.prepare('DELETE FROM exams WHERE id = ?').run(id);
  res.json({ success: true });
});

router.post('/marks', requireAuth, requireRole('teacher'), async (req, res) => {
  const { student_id, subject_id, exam_id, marks, max_marks } = req.body;
  if (!student_id || !subject_id || !exam_id) return res.status(400).json({ error: 'Missing fields' });
  if (pg) {
    const info = await pg.query('INSERT INTO marks (student_id,subject_id,exam_id,marks,max_marks) VALUES ($1,$2,$3,$4,$5) RETURNING id', [student_id, subject_id, exam_id, marks || 0, max_marks || 100]);
    return res.json({ id: info.rows[0].id });
  }
  const stmt = sqliteDb.prepare('INSERT INTO marks (student_id,subject_id,exam_id,marks,max_marks) VALUES (?,?,?,?,?)');
  const info = stmt.run(student_id, subject_id, exam_id, marks || 0, max_marks || 100);
  res.json({ id: info.lastInsertRowid });
});

router.get('/marks/student/:studentId', requireAuth, async (req, res) => {
  const { studentId } = req.params;
  if (pg) { const { rows } = await pg.query('SELECT * FROM marks WHERE student_id = $1 ORDER BY id DESC', [studentId]); return res.json(rows); }
  const rows = sqliteDb.prepare('SELECT * FROM marks WHERE student_id = ? ORDER BY id DESC').all(studentId);
  res.json(rows);
});

router.put('/marks/:id', requireAuth, requireRole(['admin', 'teacher']), async (req, res) => {
  const { id } = req.params;
  const { marks, status } = req.body;
  try {
    if (pg) {
      await pg.query('UPDATE marks SET marks = COALESCE($1, marks), status = COALESCE($2, status) WHERE id = $3', [marks, status, id]);
    } else {
      const stmt = sqliteDb.prepare('UPDATE marks SET marks = COALESCE(?, marks), status = COALESCE(?, status) WHERE id = ?');
      stmt.run(marks, status, id);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating mark:', err);
    res.status(500).json({ error: 'Failed to update mark' });
  }
});

router.delete('/marks/:id', requireAuth, requireRole(['admin', 'teacher']), async (req, res) => {
  const { id } = req.params;
  try {
    if (pg) {
      await pg.query('DELETE FROM marks WHERE id = $1', [id]);
    } else {
      sqliteDb.prepare('DELETE FROM marks WHERE id = ?').run(id);
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete mark' });
  }
});

// QR Code Config
router.post('/fees/config', requireAuth, requireRole('admin'), async (req, res) => {
  const { qrUrl } = req.body;
  if (!qrUrl) return res.status(400).json({ error: 'Missing QR URL' });
  
  // Store in a simple key-value table or just a file. For simplicity, let's use a new table 'settings' or just 'files' with a specific name.
  // Let's create a 'settings' table if not exists, or just use a file.
  // Actually, let's just use a dedicated row in 'files' or a new table.
  // Let's use a new table 'app_config'
  try {
    if (pg) {
      await pg.query('CREATE TABLE IF NOT EXISTS app_config (key TEXT PRIMARY KEY, value TEXT)');
      await pg.query('INSERT INTO app_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', ['qr_code_url', qrUrl]);
    } else {
      sqliteDb.exec('CREATE TABLE IF NOT EXISTS app_config (key TEXT PRIMARY KEY, value TEXT)');
      sqliteDb.prepare('INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)').run('qr_code_url', qrUrl);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save config' });
  }
});

router.get('/fees/config', requireAuth, async (req, res) => {
  try {
    let url = '';
    if (pg) {
      // Check if table exists first to avoid error on first run
      const check = await pg.query("SELECT to_regclass('public.app_config')");
      if (check.rows[0].to_regclass) {
        const { rows } = await pg.query("SELECT value FROM app_config WHERE key = 'qr_code_url'");
        if (rows.length > 0) url = rows[0].value;
      }
    } else {
      const check = sqliteDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='app_config'").get();
      if (check) {
        const row = sqliteDb.prepare("SELECT value FROM app_config WHERE key = 'qr_code_url'").get();
        if (row) url = row.value;
      }
    }
    res.json({ qrUrl: url });
  } catch (err) {
    console.error(err);
    res.json({ qrUrl: '' }); // Default empty
  }
});

// Fees
router.get('/fees', requireAuth, async (req, res) => {
  try {
    let query = '';
    let params = [];
    
    if (req.user.role === 'student') {
      query = `
        SELECT f.*, u.name as student_name, u.rollNo, u.className 
        FROM fees f 
        JOIN users u ON f.student_id = u.id 
        WHERE f.student_id = ? 
        ORDER BY f.due_date DESC
      `;
      params = [req.user.id];
    } else {
      query = `
        SELECT f.*, u.name as student_name, u.rollNo, u.className 
        FROM fees f 
        JOIN users u ON f.student_id = u.id 
        ORDER BY f.due_date DESC
      `;
    }

    if (pg) {
      // Adjust query for PG ($1, $2)
      const pgQuery = query.replace('?', '$1');
      const { rows } = await pg.query(pgQuery, params);
      return res.json(rows);
    }
    
    const rows = sqliteDb.prepare(query).all(...params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch fees' });
  }
});

router.post('/fees', requireAuth, requireRole('admin'), async (req, res) => {
  const { student_id, amount, due_date, description } = req.body;
  if (!student_id || !amount) return res.status(400).json({ error: 'Missing fields' });
  
  try {
    if (pg) {
      const info = await pg.query('INSERT INTO fees (student_id, amount, due_date, description, status) VALUES ($1, $2, $3, $4, $5) RETURNING id', [student_id, amount, due_date || null, description || 'Tuition Fee', 'Pending']);
      return res.json({ id: info.rows[0].id });
    }
    const stmt = sqliteDb.prepare('INSERT INTO fees (student_id, amount, due_date, description, status) VALUES (?, ?, ?, ?, ?)');
    const info = stmt.run(student_id, amount, due_date || null, description || 'Tuition Fee', 'Pending');
    res.json({ id: info.lastInsertRowid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create fee' });
  }
});

router.delete('/fees/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    if (pg) {
      await pg.query('DELETE FROM fees WHERE id = $1', [id]);
    } else {
      sqliteDb.prepare('DELETE FROM fees WHERE id = ?').run(id);
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete fee' });
  }
});

router.get('/fees/student/:studentId', requireAuth, async (req, res) => {
  const { studentId } = req.params;
  if (pg) { const { rows } = await pg.query('SELECT * FROM fees WHERE student_id = $1 ORDER BY id DESC', [studentId]); return res.json(rows); }
  const rows = sqliteDb.prepare('SELECT * FROM fees WHERE student_id = ? ORDER BY id DESC').all(studentId);
  res.json(rows);
});

// Substitute simple endpoints
router.post('/substitutes/suggest', requireAuth, requireRole('admin'), async (req, res) => {
  const { absentTeacherId, classId, period } = req.body;
  if (!absentTeacherId) return res.status(400).json({ error: 'Missing absentTeacherId' });
  // find candidates (same subject)
  let teacher;
  if (pg) {
    const t = await pg.query('SELECT * FROM users WHERE id = $1', [absentTeacherId]);
    teacher = t.rows[0];
    const candidatesRes = await pg.query('SELECT * FROM users WHERE role = $1 AND id != $2', ['teacher', absentTeacherId]);
    const candidates = candidatesRes.rows.filter(r => r.subject === teacher.subject && r.status === 'Present');
    // create substitute records for top candidate
    if (candidates.length) {
      const cand = candidates[0];
      const info = await pg.query('INSERT INTO substitutes (absent_teacher_id,suggested_teacher_id,class_id,period,status) VALUES ($1,$2,$3,$4,$5) RETURNING id', [absentTeacherId, cand.id, classId || null, period || null, 'suggested']);
      const io = req.app.get('io'); if (io) io.emit('substitute:suggested', { id: info.rows[0].id, suggested: cand });
      return res.json({ suggested: cand, id: info.rows[0].id });
    }
    return res.json({ suggested: null });
  }
  const t = sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(absentTeacherId);
  teacher = t;
  const rows = sqliteDb.prepare('SELECT * FROM users WHERE role = ? AND id != ?').all('teacher', absentTeacherId);
  const candidates = rows.filter(r => r.subject === teacher.subject && r.status === 'Present');
  if (candidates.length) {
    const cand = candidates[0];
    const stmt = sqliteDb.prepare('INSERT INTO substitutes (absent_teacher_id,suggested_teacher_id,class_id,period,status) VALUES (?,?,?,?,?)');
    const info = stmt.run(absentTeacherId, cand.id, classId || null, period || null, 'suggested');
    const io = req.app.get('io'); if (io) io.emit('substitute:suggested', { id: info.lastInsertRowid, suggested: cand });
    return res.json({ suggested: cand, id: info.lastInsertRowid });
  }
  res.json({ suggested: null });
});

// GET exams
router.get('/exams', requireAuth, async (req, res) => {
  const query = `
    SELECT e.*, c.class_name as class_name, c.section as class_section, s.name as subject_name 
    FROM exams e 
    LEFT JOIN classes c ON e.class_id = c.id 
    LEFT JOIN subjects s ON e.subject_id = s.id 
    ORDER BY e.date DESC, e.start_time ASC
  `;
  if (pg) { 
    const { rows } = await pg.query(query); 
    return res.json(rows); 
  }
  const rows = sqliteDb.prepare(query).all();
  res.json(rows);
});

// GET marks (admin/teacher see all)
router.get('/marks', requireAuth, async (req, res) => {
  if (pg) { const { rows } = await pg.query('SELECT * FROM marks ORDER BY id DESC'); return res.json(rows); }
  const rows = sqliteDb.prepare('SELECT * FROM marks ORDER BY id DESC').all();
  res.json(rows);
});

// GET substitutes
router.get('/substitutes', requireAuth, async (req, res) => {
  if (pg) { const { rows } = await pg.query('SELECT * FROM substitutes ORDER BY id DESC'); return res.json(rows); }
  const rows = sqliteDb.prepare('SELECT * FROM substitutes ORDER BY id DESC').all();
  res.json(rows);
});

// GET files
router.get('/files', requireAuth, async (req, res) => {
  if (pg) { const { rows } = await pg.query('SELECT * FROM files ORDER BY id DESC'); return res.json(rows); }
  const rows = sqliteDb.prepare('SELECT * FROM files ORDER BY id DESC').all();
  res.json(rows);
});

router.delete('/files/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    if (pg) {
      await pg.query('DELETE FROM files WHERE id = $1', [id]);
    } else {
      sqliteDb.prepare('DELETE FROM files WHERE id = ?').run(id);
    }
    logAction({
      userId: req.user.id,
      userName: req.user.name,
      action: `Deleted file ID: ${id}`,
      type: 'file'
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// GET payments
router.get('/payments', requireAuth, requireRole('admin'), async (req, res) => {
  if (pg) { const { rows } = await pg.query('SELECT * FROM payments ORDER BY id DESC'); return res.json(rows); }
  const rows = sqliteDb.prepare('SELECT * FROM payments ORDER BY id DESC').all();
  res.json(rows);
});

// Update complaint status
router.put('/complaints/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;
  if (pg) {
    await pg.query('UPDATE complaints SET status = $1 WHERE id = $2', [status, id]);
  } else {
    sqliteDb.prepare('UPDATE complaints SET status = ? WHERE id = ?').run(status, id);
  }
  res.json({ ok: true });
});

router.delete('/complaints/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    if (pg) {
      await pg.query('DELETE FROM complaints WHERE id = $1', [id]);
    } else {
      sqliteDb.prepare('DELETE FROM complaints WHERE id = ?').run(id);
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete complaint' });
  }
});

// Timetable endpoints
router.get('/timetable', requireAuth, async (req, res) => {
  if (pg) { const { rows } = await pg.query('SELECT * FROM timetable ORDER BY day, period'); return res.json(rows); }
  const rows = sqliteDb.prepare('SELECT * FROM timetable ORDER BY day, period').all();
  res.json(rows);
});

router.post('/timetable', requireAuth, requireRole('admin'), async (req, res) => {
  const { class_id, day, period, subject_id, teacher_id } = req.body;
  if (pg) {
    const info = await pg.query('INSERT INTO timetable (class_id,day,period,subject_id,teacher_id) VALUES ($1,$2,$3,$4,$5) RETURNING id', [class_id, day, period, subject_id, teacher_id]);
    return res.json({ id: info.rows[0].id });
  }
  const stmt = sqliteDb.prepare('INSERT INTO timetable (class_id,day,period,subject_id,teacher_id) VALUES (?,?,?,?,?)');
  const info = stmt.run(class_id, day, period, subject_id, teacher_id);
  res.json({ id: info.lastInsertRowid });
});

router.delete('/timetable/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  if (pg) {
    await pg.query('DELETE FROM timetable WHERE id = $1', [id]);
  } else {
    sqliteDb.prepare('DELETE FROM timetable WHERE id = ?').run(id);
  }
  res.json({ ok: true });
});

router.put('/profile', requireAuth, async (req, res) => {
  const { name, email, phone } = req.body;
  try {
    if (pg) {
      await pg.query('UPDATE users SET name = $1, email = $2, phone = $3 WHERE id = $4', [name, email, phone, req.user.id]);
    } else {
      sqliteDb.prepare('UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?').run(name, email, phone, req.user.id);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.put('/profile/password', requireAuth, async (req, res) => {
  const { currentKey, newKey } = req.body;
  try {
    let user;
    if (pg) {
      const { rows } = await pg.query('SELECT key_hash FROM users WHERE id = $1', [req.user.id]);
      user = rows[0];
    } else {
      user = sqliteDb.prepare('SELECT key_hash FROM users WHERE id = ?').get(req.user.id);
    }

    const match = await bcrypt.compare(currentKey, user.key_hash);
    if (!match) return res.status(400).json({ error: 'Current login key is incorrect' });

    const hash = await bcrypt.hash(newKey, 10);
    if (pg) {
      await pg.query('UPDATE users SET key_hash = $1 WHERE id = $2', [hash, req.user.id]);
    } else {
      sqliteDb.prepare('UPDATE users SET key_hash = ? WHERE id = ?').run(hash, req.user.id);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update login key' });
  }
});

// Library endpoints
router.get('/library/books', requireAuth, async (req, res) => {
  if (pg) { const { rows } = await pg.query('SELECT * FROM library_books ORDER BY title'); return res.json(rows); }
  const rows = sqliteDb.prepare('SELECT * FROM library_books ORDER BY title').all();
  res.json(rows);
});

router.post('/library/books', requireAuth, requireRole('admin'), async (req, res) => {
  const { title, author, isbn, quantity } = req.body;
  if (pg) {
    await pg.query('INSERT INTO library_books (title, author, isbn, quantity, available) VALUES ($1, $2, $3, $4, $4)', [title, author, isbn, quantity]);
  } else {
    sqliteDb.prepare('INSERT INTO library_books (title, author, isbn, quantity, available) VALUES (?, ?, ?, ?, ?)').run(title, author, isbn, quantity, quantity);
  }
  res.json({ ok: true });
});

router.delete('/library/books/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    if (pg) {
      await pg.query('DELETE FROM library_issues WHERE book_id = $1', [id]);
      await pg.query('DELETE FROM library_books WHERE id = $1', [id]);
    } else {
      sqliteDb.prepare('DELETE FROM library_issues WHERE book_id = ?').run(id);
      sqliteDb.prepare('DELETE FROM library_books WHERE id = ?').run(id);
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete book' });
  }
});

router.get('/library/issues', requireAuth, async (req, res) => {
  const sql = `
    SELECT library_issues.*, library_books.title as book_title, users.name as user_name 
    FROM library_issues 
    JOIN library_books ON library_issues.book_id = library_books.id 
    JOIN users ON library_issues.user_id = users.id
    ORDER BY issue_date DESC
  `;
  if (pg) { const { rows } = await pg.query(sql); return res.json(rows); }
  const rows = sqliteDb.prepare(sql).all();
  res.json(rows);
});

router.post('/library/issue', requireAuth, requireRole('admin'), async (req, res) => {
  const { book_id, user_id, issue_date } = req.body;
  try {
    if (pg) {
      await pg.query('BEGIN');
      const book = await pg.query('SELECT available FROM library_books WHERE id = $1', [book_id]);
      if (book.rows[0].available <= 0) {
        await pg.query('ROLLBACK');
        return res.status(400).json({ error: 'Book not available' });
      }
      await pg.query('INSERT INTO library_issues (book_id, user_id, issue_date, status) VALUES ($1, $2, $3, $4)', [book_id, user_id, issue_date, 'Issued']);
      await pg.query('UPDATE library_books SET available = available - 1 WHERE id = $1', [book_id]);
      await pg.query('COMMIT');
    } else {
      const issue = sqliteDb.transaction(() => {
        const book = sqliteDb.prepare('SELECT available FROM library_books WHERE id = ?').get(book_id);
        if (book.available <= 0) throw new Error('Book not available');
        sqliteDb.prepare('INSERT INTO library_issues (book_id, user_id, issue_date, status) VALUES (?, ?, ?, ?)').run(book_id, user_id, issue_date, 'Issued');
        sqliteDb.prepare('UPDATE library_books SET available = available - 1 WHERE id = ?').run(book_id);
      });
      issue();
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/library/return/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const return_date = new Date().toISOString().slice(0,10);
  try {
    if (pg) {
      await pg.query('BEGIN');
      const issue = await pg.query('SELECT book_id FROM library_issues WHERE id = $1', [id]);
      await pg.query('UPDATE library_issues SET return_date = $1, status = $2 WHERE id = $3', [return_date, 'Returned', id]);
      await pg.query('UPDATE library_books SET available = available + 1 WHERE id = $1', [issue.rows[0].book_id]);
      await pg.query('COMMIT');
    } else {
      const ret = sqliteDb.transaction(() => {
        const issue = sqliteDb.prepare('SELECT book_id FROM library_issues WHERE id = ?').get(id);
        sqliteDb.prepare('UPDATE library_issues SET return_date = ?, status = ? WHERE id = ?').run(return_date, 'Returned', id);
        sqliteDb.prepare('UPDATE library_books SET available = available + 1 WHERE id = ?').run(issue.book_id);
      });
      ret();
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to return book' });
  }
});

router.get('/leaves', requireAuth, async (req, res) => {
  try {
    if (pg) {
      let q = 'SELECT l.*, u.name as teacher_name FROM leaves l JOIN users u ON l.teacher_id = u.id';
      if (req.user.role === 'teacher') q += ` WHERE l.teacher_id = '${req.user.id}'`;
      q += ' ORDER BY l.id DESC';
      const { rows } = await pg.query(q);
      return res.json(rows);
    }
    let q = 'SELECT l.*, u.name as teacher_name FROM leaves l JOIN users u ON l.teacher_id = u.id';
    if (req.user.role === 'teacher') q += ` WHERE l.teacher_id = ?`;
    q += ' ORDER BY l.id DESC';
    const rows = req.user.role === 'teacher' 
      ? sqliteDb.prepare(q).all(req.user.id)
      : sqliteDb.prepare(q).all();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch leaves' });
  }
});

router.post('/leaves', requireAuth, requireRole('teacher'), async (req, res) => {
  const { date, reason } = req.body;
  if (pg) {
    const info = await pg.query('INSERT INTO leaves (teacher_id,date,reason,status) VALUES ($1,$2,$3,$4) RETURNING id', [req.user.id, date, reason, 'Pending']);
    return res.json({ id: info.rows[0].id });
  }
  const stmt = sqliteDb.prepare('INSERT INTO leaves (teacher_id,date,reason,status) VALUES (?,?,?,?)');
  const info = stmt.run(req.user.id, date, reason, 'Pending');
  res.json({ id: info.lastInsertRowid });
});

router.put('/leaves/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;
  if (pg) {
    await pg.query('UPDATE leaves SET status = $1 WHERE id = $2', [status, id]);
  } else {
    sqliteDb.prepare('UPDATE leaves SET status = ? WHERE id = ?').run(status, id);
  }
  res.json({ ok: true });
});

router.delete('/leaves/:id', requireAuth, requireRole(['admin', 'teacher']), async (req, res) => {
  const { id } = req.params;
  try {
    if (pg) {
      if (req.user.role === 'teacher') {
        await pg.query('DELETE FROM leaves WHERE id = $1 AND teacher_id = $2', [id, req.user.id]);
      } else {
        await pg.query('DELETE FROM leaves WHERE id = $1', [id]);
      }
    } else {
      if (req.user.role === 'teacher') {
        sqliteDb.prepare('DELETE FROM leaves WHERE id = ? AND teacher_id = ?').run(id, req.user.id);
      } else {
        sqliteDb.prepare('DELETE FROM leaves WHERE id = ?').run(id);
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete leave request' });
  }
});

router.post('/ai/substitute-suggestion', requireAuth, requireRole('admin'), async (req, res) => {
  const { absentTeacherId } = req.body;
  if (!absentTeacherId) return res.status(400).json({ error: 'Missing teacher ID' });

  try {
    const { GoogleGenAI } = await import("@google/genai");
    let absentTeacher;
    let allTeachers;

    if (pg) {
      const t = await pg.query('SELECT * FROM users WHERE id = $1', [absentTeacherId]);
      absentTeacher = t.rows[0];
      const all = await pg.query('SELECT * FROM users WHERE role = $1 AND id != $2', ['teacher', absentTeacherId]);
      allTeachers = all.rows;
    } else {
      absentTeacher = sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(absentTeacherId);
      allTeachers = sqliteDb.prepare('SELECT * FROM users WHERE role = ? AND id != ?').all('teacher', absentTeacherId);
    }

    if (!absentTeacher) return res.status(404).json({ error: 'Teacher not found' });

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const model = "gemini-3-flash-preview";
    
    const prompt = `
      You are a school administrator assistant. 
      Teacher ${absentTeacher.name} (Subject: ${absentTeacher.subject}) is absent.
      Here is a list of other teachers and their subjects/free periods:
      ${JSON.stringify(allTeachers.map(t => ({ id: t.id, name: t.name, subject: t.subject, freePeriods: t.freePeriods })))}
      
      Suggest the best substitute teacher based on subject match and availability.
      Return a JSON object with: { "suggestedTeacherId": "...", "reason": "..." }
    `;

    const result = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    res.json(JSON.parse(result.text));
  } catch (err) {
    console.error('AI Error:', err);
    res.status(500).json({ error: 'AI suggestion failed' });
  }
});



// --- Events Routes ---
router.get('/events', requireAuth, async (req, res) => {
  if (pg) {
    const r = await pg.query('SELECT * FROM events ORDER BY start_date');
    return res.json(r.rows);
  }
  const events = sqliteDb.prepare('SELECT * FROM events ORDER BY start_date').all();
  res.json(events);
});

router.post('/events', requireAuth, requireRole('admin'), async (req, res) => {
  const { title, description, start_date, end_date, type } = req.body;
  if (pg) {
    await pg.query('INSERT INTO events (title, description, start_date, end_date, type) VALUES ($1, $2, $3, $4, $5)', [title, description, start_date, end_date, type]);
  } else {
    sqliteDb.prepare('INSERT INTO events (title, description, start_date, end_date, type) VALUES (?, ?, ?, ?, ?)').run(title, description, start_date, end_date, type);
  }
  res.json({ ok: true });
});

router.delete('/events/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    if (pg) {
      await pg.query('DELETE FROM events WHERE id = $1', [id]);
    } else {
      sqliteDb.prepare('DELETE FROM events WHERE id = ?').run(id);
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// --- Messaging Routes ---
router.get('/available-recipients', requireAuth, async (req, res) => {
  try {
    let query;
    let params = [];
    if (req.user.role === 'teacher') {
      query = "SELECT id, name, role, className FROM users WHERE role = 'student'";
    } else if (req.user.role === 'student') {
      query = "SELECT id, name, role, subject FROM users WHERE role = 'teacher'";
    } else {
      query = "SELECT id, name, role FROM users WHERE id != ?";
      params = [req.user.id];
    }

    if (pg) {
      const { rows } = await pg.query(query.replace('?', '$1'), params);
      return res.json(rows);
    }
    const list = sqliteDb.prepare(query).all(params);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch recipients' });
  }
});

router.get('/messages', requireAuth, async (req, res) => {
  try {
    const query = `
      SELECT m.*, u.name as other_name 
      FROM messages m 
      JOIN users u ON (m.sender_id = u.id OR m.receiver_id = u.id)
      WHERE (m.sender_id = ? OR m.receiver_id = ?) AND u.id != ?
      ORDER BY m.timestamp ASC
    `;
    const params = [req.user.id, req.user.id, req.user.id];

    if (pg) {
      const { rows } = await pg.query(query.replace(/\?/g, (m, i) => `$${i+1}`), params);
      return res.json(rows);
    }
    const list = sqliteDb.prepare(query).all(params);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.post('/messages', requireAuth, async (req, res) => {
  const { receiver_id, content } = req.body;
  if (!receiver_id || !content) return res.status(400).json({ error: 'Missing fields' });

  try {
    if (pg) {
      const { rows } = await pg.query('SELECT role FROM users WHERE id = $1', [receiver_id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Recipient not found' });
      const receiverRole = rows[0].role;
      if (req.user.role === 'teacher' && receiverRole !== 'student') {
        return res.status(403).json({ error: 'Teachers can only message students' });
      }
      if (req.user.role === 'student' && receiverRole !== 'teacher') {
         return res.status(403).json({ error: 'Students can only message teachers' });
      }
      
      const insert = await pg.query('INSERT INTO messages (sender_id, receiver_id, content, timestamp) VALUES ($1, $2, $3, $4) RETURNING id', [req.user.id, receiver_id, content, new Date().toISOString()]);
      return res.json({ id: insert.rows[0].id });
    }
    
    const receiver = sqliteDb.prepare('SELECT role FROM users WHERE id = ?').get(receiver_id);
    if (!receiver) return res.status(404).json({ error: 'Recipient not found' });
    if (req.user.role === 'teacher' && receiver.role !== 'student') {
      return res.status(403).json({ error: 'Teachers can only message students' });
    }
    if (req.user.role === 'student' && receiver.role !== 'teacher') {
      return res.status(403).json({ error: 'Students can only message teachers' });
    }

    const stmt = sqliteDb.prepare('INSERT INTO messages (sender_id, receiver_id, content, timestamp) VALUES (?, ?, ?, ?)');
    const info = stmt.run(req.user.id, receiver_id, content, new Date().toISOString());
    res.json({ id: info.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

router.post('/ai/log', requireAuth, (req, res) => {
  const { prompt, response } = req.body;
  logAction({
    userId: req.user.id,
    userName: req.user.name,
    action: 'AI Usage',
    details: { prompt, response },
    type: 'ai'
  });
  res.json({ ok: true });
});

router.get('/logs', requireAuth, requireRole('admin'), async (req, res) => {
  const { type, limit = 100 } = req.query;
  let query = 'SELECT * FROM logs';
  const params = [];
  if (type) {
    query += ' WHERE type = ?';
    params.push(type);
  }
  query += ' ORDER BY id DESC LIMIT ?';
  params.push(parseInt(limit));
  
  try {
    const list = sqliteDb.prepare(query).all(...params);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

router.get('/online-users', requireAuth, requireRole('admin'), (req, res) => {
  const onlineUsers = req.app.locals.onlineUsers;
  if (!onlineUsers) return res.json([]);
  res.json(Array.from(onlineUsers.values()));
});

router.get('/admin/stats', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const userCount = sqliteDb.prepare('SELECT role, COUNT(*) as count FROM users GROUP BY role').all();
    const aiUsage = sqliteDb.prepare("SELECT userName, COUNT(*) as count FROM logs WHERE type = 'ai' GROUP BY userName").all();
    const recentActivity = sqliteDb.prepare('SELECT * FROM logs ORDER BY id DESC LIMIT 20').all();
    const fileStats = sqliteDb.prepare("SELECT action, COUNT(*) as count FROM logs WHERE type = 'file' GROUP BY action").all();
    
    res.json({
      userCount,
      aiUsage,
      recentActivity,
      fileStats
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Automation Rules Endpoints
router.get('/automation/rules', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    let rules = [];
    if (pg) {
      const { rows } = await pg.query('SELECT * FROM automation_rules ORDER BY id DESC');
      rules = rows;
    } else {
      rules = sqliteDb.prepare('SELECT * FROM automation_rules ORDER BY id DESC').all();
    }
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rules' });
  }
});

router.post('/automation/rules', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, trigger_type, trigger_event, action_type, action_params } = req.body;
  const created_at = new Date().toISOString();
  try {
    if (pg) {
      const { rows } = await pg.query(
        'INSERT INTO automation_rules (name, trigger_type, trigger_event, action_type, action_params, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [name, trigger_type, trigger_event, action_type, JSON.stringify(action_params || {}), created_at]
      );
      res.json(rows[0]);
    } else {
      const info = sqliteDb.prepare(
        'INSERT INTO automation_rules (name, trigger_type, trigger_event, action_type, action_params, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(name, trigger_type, trigger_event, action_type, JSON.stringify(action_params || {}), created_at);
      const rule = sqliteDb.prepare('SELECT * FROM automation_rules WHERE id = ?').get(info.lastInsertRowid);
      res.json(rule);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to create rule' });
  }
});

router.delete('/automation/rules/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    if (pg) {
      await pg.query('DELETE FROM automation_rules WHERE id = $1', [req.params.id]);
    } else {
      sqliteDb.prepare('DELETE FROM automation_rules WHERE id = ?').run(req.params.id);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete rule' });
  }
});

// API Key Management
router.get('/admin/keys', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    let keys = [];
    if (pg) {
      const { rows } = await pg.query('SELECT id, key_value, provider, is_active, error_count, last_used, created_at FROM api_keys ORDER BY created_at DESC');
      keys = rows;
    } else {
      keys = sqliteDb.prepare('SELECT id, key_value, provider, is_active, error_count, last_used, created_at FROM api_keys ORDER BY created_at DESC').all();
    }
    // Mask keys for security
    const maskedKeys = keys.map(k => ({
      ...k,
      key_value: k.key_value.substring(0, 8) + '...' + k.key_value.substring(k.key_value.length - 4)
    }));
    res.json(maskedKeys);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch keys' });
  }
});

router.post('/admin/keys', requireAuth, requireRole('admin'), async (req, res) => {
  const { key_value, provider } = req.body;
  if (!key_value) return res.status(400).json({ error: 'Key value is required' });
  
  try {
    if (pg) {
      await pg.query('INSERT INTO api_keys (key_value, provider) VALUES ($1, $2)', [key_value, provider || 'gemini']);
    } else {
      sqliteDb.prepare('INSERT INTO api_keys (key_value, provider) VALUES (?, ?)').run(key_value, provider || 'gemini');
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add key' });
  }
});

router.delete('/admin/keys/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    if (pg) {
      await pg.query('DELETE FROM api_keys WHERE id = $1', [req.params.id]);
    } else {
      sqliteDb.prepare('DELETE FROM api_keys WHERE id = ?').run(req.params.id);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete key' });
  }
});

// AI Generation Endpoint with Key Rotation
router.post('/ai/generate', requireAuth, async (req, res) => {
  const { prompt, systemPrompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  // Fetch active keys
  let keys = [];
  try {
    if (pg) {
      const { rows } = await pg.query('SELECT * FROM api_keys WHERE is_active = true ORDER BY last_used ASC NULLS FIRST');
      keys = rows;
    } else {
      keys = sqliteDb.prepare('SELECT * FROM api_keys WHERE is_active = 1 ORDER BY last_used ASC NULLS FIRST').all();
    }
  } catch (err) {
    console.error('Error fetching keys:', err);
  }

  // Add env key as fallback if not in DB
  if (process.env.GEMINI_API_KEY) {
    keys.push({ key_value: process.env.GEMINI_API_KEY, provider: 'gemini' });
  }

  if (keys.length === 0) return res.status(503).json({ error: 'No active AI service keys available' });

  const { GoogleGenAI } = await import("@google/genai");

  for (const keyObj of keys) {
    try {
      const ai = new GoogleGenAI({ apiKey: keyObj.key_value });
      
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-09-2025",
        contents: prompt,
        config: {
          systemInstruction: systemPrompt,
        }
      });
      
      const text = result.text;
      
      // Update usage stats
      if (keyObj.id) {
        const now = new Date().toISOString();
        if (pg) {
          await pg.query('UPDATE api_keys SET last_used = $1, error_count = 0 WHERE id = $2', [now, keyObj.id]);
        } else {
          sqliteDb.prepare('UPDATE api_keys SET last_used = ?, error_count = 0 WHERE id = ?').run(now, keyObj.id);
        }
      }

      return res.json({ text });
    } catch (err) {
      console.error(`Key ${keyObj.key_value.substring(0,8)}... failed:`, err.message);
      
      // Update error stats
      if (keyObj.id) {
        if (pg) {
          await pg.query('UPDATE api_keys SET error_count = error_count + 1 WHERE id = $1', [keyObj.id]);
        } else {
          sqliteDb.prepare('UPDATE api_keys SET error_count = error_count + 1 WHERE id = ?').run(keyObj.id);
        }
        // Deactivate if too many errors (e.g., > 5)
        if (keyObj.error_count > 5) {
           if (pg) {
            await pg.query('UPDATE api_keys SET is_active = false WHERE id = $1', [keyObj.id]);
          } else {
            sqliteDb.prepare('UPDATE api_keys SET is_active = 0 WHERE id = ?').run(keyObj.id);
          }
        }
      }
      // Continue to next key
    }
  }

  res.status(503).json({ error: 'All AI keys failed. Please try again later.' });
});

router.use((err, req, res, next) => {
  console.error(err.stack);
  logAction({
    userId: req.user ? req.user.id : null,
    userName: req.user ? req.user.name : null,
    action: `API Error: ${err.message}`,
    type: 'error',
    details: { stack: err.stack, path: req.path, method: req.method }
  });
  res.status(500).json({ error: 'Internal Server Error' });
});

// Camera Endpoints
router.get('/cameras', requireAuth, async (req, res) => {
  try {
    let cameras = [];
    if (pg) {
      const { rows } = await pg.query('SELECT * FROM cameras ORDER BY created_at DESC');
      cameras = rows;
    } else {
      cameras = sqliteDb.prepare('SELECT * FROM cameras ORDER BY created_at DESC').all();
    }
    res.json(cameras);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cameras' });
  }
});

router.post('/cameras', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, location, stream_url, type } = req.body;
  try {
    if (pg) {
      const { rows } = await pg.query(
        'INSERT INTO cameras (name, location, stream_url, type) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, location, stream_url, type || 'IP Camera']
      );
      res.json(rows[0]);
    } else {
      const info = sqliteDb.prepare(
        'INSERT INTO cameras (name, location, stream_url, type) VALUES (?, ?, ?, ?)'
      ).run(name, location, stream_url, type || 'IP Camera');
      res.json({ id: info.lastInsertRowid, name, location, stream_url, type: type || 'IP Camera', status: 'Active' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to add camera' });
  }
});

router.delete('/cameras/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    if (pg) {
      await pg.query('DELETE FROM cameras WHERE id = $1', [id]);
    } else {
      sqliteDb.prepare('DELETE FROM cameras WHERE id = ?').run(id);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete camera' });
  }
});

// Biometric Endpoints
router.post('/biometric/identify', requireAuth, requireRole('admin'), async (req, res) => {
  const { user_id, camera_id, type } = req.body;
  try {
    let user;
    if (user_id) {
      if (pg) {
        const { rows } = await pg.query('SELECT * FROM users WHERE id = $1', [user_id]);
        user = rows[0];
      } else {
        user = sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(user_id);
      }
    } else {
      // Fallback if no user_id provided (e.g. from an old client)
      if (pg) {
        const { rows } = await pg.query('SELECT * FROM users WHERE biometric_enrolled = 1 ORDER BY RANDOM() LIMIT 1');
        user = rows[0];
      } else {
        user = sqliteDb.prepare('SELECT * FROM users WHERE biometric_enrolled = 1 ORDER BY RANDOM() LIMIT 1').get();
      }
    }

    if (!user) {
      return res.status(404).json({ error: 'No enrolled person identified' });
    }

    const confidence = 0.85 + Math.random() * 0.14;
    
    // Log the recognition
    if (pg) {
      await pg.query(
        'INSERT INTO biometric_logs (user_id, camera_id, type, confidence) VALUES ($1, $2, $3, $4)',
        [user.id, camera_id, type || 'face', confidence]
      );
      
      // Mark attendance automatically
      const today = new Date().toISOString().split('T')[0];
      const { rows: existing } = await pg.query('SELECT id FROM attendance WHERE "userId" = $1 AND date = $2', [user.id, today]);
      if (existing.length === 0) {
        await pg.query('INSERT INTO attendance ("userId", date, status) VALUES ($1, $2, $3)', [user.id, today, 'Present']);
      }
    } else {
      sqliteDb.prepare(
        'INSERT INTO biometric_logs (user_id, camera_id, type, confidence) VALUES (?, ?, ?, ?)'
      ).run(user.id, camera_id, type || 'face', confidence);
      
      // Mark attendance automatically
      const today = new Date().toISOString().split('T')[0];
      const existing = sqliteDb.prepare('SELECT id FROM attendance WHERE userId = ? AND date = ?').get(user.id, today);
      if (!existing) {
        sqliteDb.prepare('INSERT INTO attendance (userId, date, status) VALUES (?, ?, ?)').run(user.id, today, 'Present');
      }
    }

    res.json({ user, confidence, attendanceMarked: true });
  } catch (err) {
    res.status(500).json({ error: 'Biometric identification failed' });
  }
});

router.delete('/biometric/clear', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    if (pg) {
      await pg.query('UPDATE users SET biometric_enrolled = 0, face_embedding = NULL, face_image = NULL, fingerprint_token = NULL');
      await pg.query('DELETE FROM biometric_logs');
    } else {
      sqliteDb.prepare('UPDATE users SET biometric_enrolled = 0, face_embedding = NULL, face_image = NULL, fingerprint_token = NULL').run();
      sqliteDb.prepare('DELETE FROM biometric_logs').run();
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear biometric data' });
  }
});

router.get('/biometric/logs', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    let logs = [];
    const query = `
      SELECT bl.*, u.name as user_name, u.role as user_role, c.name as camera_name 
      FROM biometric_logs bl
      JOIN users u ON bl.user_id = u.id
      JOIN cameras c ON bl.camera_id = c.id
      ORDER BY bl.timestamp DESC LIMIT 50
    `;
    if (pg) {
      const { rows } = await pg.query(query);
      logs = rows;
    } else {
      logs = sqliteDb.prepare(query).all();
    }
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch biometric logs' });
  }
});

router.post('/biometric/enroll', requireAuth, requireRole('admin'), async (req, res) => {
  const { user_id, type, image } = req.body;
  try {
    const token = `token_${Math.random().toString(36).substring(7)}`;
    const field = type === 'fingerprint' ? 'fingerprint_token' : (type === 'retina' ? 'retina_token' : 'face_token');
    
    // Generate a mock 128-d face embedding vector for realism
    const embedding = Array.from({length: 128}, () => (Math.random() * 2 - 1).toFixed(4));
    const embeddingJson = JSON.stringify(embedding);

    if (pg) {
      await pg.query(`UPDATE users SET ${field} = $1, face_embedding = $2, biometric_enrolled = 1, face_image = $3 WHERE id = $4`, [token, embeddingJson, image || null, user_id]);
    } else {
      // For SQLite, we might need to alter table if column doesn't exist, but we added it to schema.
      try {
        sqliteDb.prepare(`UPDATE users SET ${field} = ?, face_embedding = ?, biometric_enrolled = 1, face_image = ? WHERE id = ?`).run(token, embeddingJson, image || null, user_id);
      } catch (e) {
        // Fallback if column not added to existing db file
        try { sqliteDb.prepare(`ALTER TABLE users ADD COLUMN face_embedding TEXT`).run(); } catch(err){}
        try { sqliteDb.prepare(`ALTER TABLE users ADD COLUMN face_image TEXT`).run(); } catch(err){}
        sqliteDb.prepare(`UPDATE users SET ${field} = ?, face_embedding = ?, biometric_enrolled = 1, face_image = ? WHERE id = ?`).run(token, embeddingJson, image || null, user_id);
      }
    }
    res.json({ success: true, token, embedding });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Enrollment failed' });
  }
});

// Surveillance AI Endpoints
router.patch('/cameras/:id/ai', requireAuth, requireRole('admin'), async (req, res) => {
  const { ai_enabled, auto_recognize_enabled, ai_rules } = req.body;
  try {
    if (pg) {
      await pg.query(
        'UPDATE cameras SET ai_enabled = COALESCE($1, ai_enabled), auto_recognize_enabled = COALESCE($2, auto_recognize_enabled), ai_rules = COALESCE($3, ai_rules) WHERE id = $4',
        [ai_enabled, auto_recognize_enabled, ai_rules ? JSON.stringify(ai_rules) : null, req.params.id]
      );
    } else {
      sqliteDb.prepare(
        'UPDATE cameras SET ai_enabled = IFNULL(?, ai_enabled), auto_recognize_enabled = IFNULL(?, auto_recognize_enabled), ai_rules = IFNULL(?, ai_rules) WHERE id = ?'
      ).run(ai_enabled, auto_recognize_enabled, ai_rules ? JSON.stringify(ai_rules) : null, req.params.id);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update camera AI settings' });
  }
});

router.get('/surveillance/events', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    let events = [];
    const query = `
      SELECT se.*, c.name as camera_name, u.name as user_name, u.role as user_role
      FROM surveillance_events se
      JOIN cameras c ON se.camera_id = c.id
      LEFT JOIN users u ON se.user_id = u.id
      ORDER BY se.timestamp DESC LIMIT 100
    `;
    if (pg) {
      const { rows } = await pg.query(query);
      events = rows;
    } else {
      events = sqliteDb.prepare(query).all();
    }
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch surveillance events' });
  }
});

router.post('/surveillance/simulate-event', requireAuth, requireRole('admin'), async (req, res) => {
  const { camera_id, behavior_type, description } = req.body;
  try {
    // Pick a random user to flag
    let user;
    if (pg) {
      const { rows } = await pg.query('SELECT id FROM users ORDER BY RANDOM() LIMIT 1');
      user = rows[0];
    } else {
      user = sqliteDb.prepare('SELECT id FROM users ORDER BY RANDOM() LIMIT 1').get();
    }

    if (pg) {
      await pg.query(
        'INSERT INTO surveillance_events (camera_id, user_id, behavior_type, description) VALUES ($1, $2, $3, $4)',
        [camera_id, user.id, behavior_type, description]
      );
    } else {
      sqliteDb.prepare(
        'INSERT INTO surveillance_events (camera_id, user_id, behavior_type, description) VALUES (?, ?, ?, ?)'
      ).run(camera_id, user.id, behavior_type, description);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to simulate event' });
  }
});

// ---- TRANSPORTATION & INVENTORY MODULES ----
router.get('/transport/routes', requireAuth, async (req, res) => {
  try {
    if (pg) {
      const { rows } = await pg.query('SELECT * FROM transport_routes ORDER BY id DESC');
      return res.json(rows);
    }
    const routes = sqliteDb.prepare('SELECT * FROM transport_routes ORDER BY id DESC').all();
    res.json(routes);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch transport routes' }); }
});

router.post('/transport/routes', requireAuth, requireRole(['admin']), async (req, res) => {
  const { route_name, vehicle_no, driver_name, driver_phone, route_stops, fee } = req.body;
  try {
    if (pg) {
      await pg.query(
        'INSERT INTO transport_routes (route_name, vehicle_no, driver_name, driver_phone, route_stops, fee) VALUES ($1, $2, $3, $4, $5, $6)',
        [route_name, vehicle_no, driver_name, driver_phone, route_stops, fee]
      );
    } else {
      sqliteDb.prepare(
        'INSERT INTO transport_routes (route_name, vehicle_no, driver_name, driver_phone, route_stops, fee) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(route_name, vehicle_no, driver_name, driver_phone, route_stops, fee || 0);
    }
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Failed to add transport route' }); }
});

router.get('/inventory/items', requireAuth, async (req, res) => {
  try {
    if (pg) {
      const { rows } = await pg.query('SELECT * FROM inventory_items ORDER BY item_name ASC');
      return res.json(rows);
    }
    const items = sqliteDb.prepare('SELECT * FROM inventory_items ORDER BY item_name ASC').all();
    res.json(items);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch inventory' }); }
});

router.post('/inventory/items', requireAuth, requireRole(['admin']), async (req, res) => {
  const { item_name, category, quantity, unit_price } = req.body;
  try {
    if (pg) {
      await pg.query(
        'INSERT INTO inventory_items (item_name, category, quantity, unit_price) VALUES ($1, $2, $3, $4)',
        [item_name, category, quantity || 0, unit_price || 0]
      );
    } else {
      sqliteDb.prepare(
        'INSERT INTO inventory_items (item_name, category, quantity, unit_price) VALUES (?, ?, ?, ?)'
      ).run(item_name, category, quantity || 0, unit_price || 0);
    }
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Failed to add inventory item' }); }
});

router.put('/inventory/items/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const { quantity, op } = req.body; // op = 'add' or 'consume'
  try {
    let currentQty = 0;
    if (pg) {
      const row = await pg.query('SELECT quantity FROM inventory_items WHERE id = $1', [id]);
      currentQty = row.rows[0]?.quantity || 0;
    } else {
      const row = sqliteDb.prepare('SELECT quantity FROM inventory_items WHERE id = ?').get(id);
      currentQty = row?.quantity || 0;
    }

    const newQty = op === 'add' ? currentQty + Number(quantity) : Math.max(0, currentQty - Number(quantity));

    if (pg) {
      await pg.query('UPDATE inventory_items SET quantity = $1 WHERE id = $2', [newQty, id]);
    } else {
      sqliteDb.prepare('UPDATE inventory_items SET quantity = ? WHERE id = ?').run(newQty, id);
    }
    res.json({ ok: true, newQuantity: newQty });
  } catch (err) { res.status(500).json({ error: 'Failed to update inventory' }); }
});

export default router;
