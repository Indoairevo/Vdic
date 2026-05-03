const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'data.db');
const db = new Database(DB_PATH);

function prepareSchema() {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      key_hash TEXT NOT NULL,
      className TEXT,
      rollNo TEXT,
      subject TEXT,
      assignedClass TEXT,
      phone TEXT,
      status TEXT,
      freePeriods TEXT,
      face_token TEXT,
      fingerprint_token TEXT,
      retina_token TEXT,
      face_embedding TEXT,
      face_image TEXT,
      biometric_enrolled INTEGER DEFAULT 0,
      parent_id TEXT
    );

    CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      target TEXT NOT NULL,
      date TEXT,
      author TEXT
    );

    CREATE TABLE IF NOT EXISTS homeworks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      description TEXT,
      date TEXT,
      publishDate TEXT,
      className TEXT,
      subject TEXT,
      teacherName TEXT,
      image_url TEXT
    );

    CREATE TABLE IF NOT EXISTS homework_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      homework_id INTEGER,
      student_id TEXT,
      image_url TEXT,
      submitted_at TEXT,
      status TEXT DEFAULT 'Submitted',
      FOREIGN KEY(homework_id) REFERENCES homeworks(id),
      FOREIGN KEY(student_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS homework_doubts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      homework_id INTEGER,
      student_id TEXT,
      doubt_text TEXT,
      teacher_reply TEXT,
      created_at TEXT,
      FOREIGN KEY(homework_id) REFERENCES homeworks(id),
      FOREIGN KEY(student_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      byName TEXT,
      role TEXT,
      text TEXT,
      status TEXT,
      date TEXT
    );

    CREATE TABLE IF NOT EXISTS finances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      balance INTEGER DEFAULT 0,
      income INTEGER DEFAULT 0,
      expense INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS finance_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      description TEXT,
      amount INTEGER,
      date TEXT
    );

    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_name TEXT,
      section TEXT,
      class_teacher_id TEXT
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_name TEXT,
      teacher_id TEXT,
      class_id INTEGER,
      stream TEXT
    );

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      roll_no TEXT,
      class_id INTEGER,
      father_name TEXT,
      address TEXT
    );

    CREATE TABLE IF NOT EXISTS exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_type TEXT,
      class_id INTEGER,
      date TEXT
    );

    CREATE TABLE IF NOT EXISTS marks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT,
      subject_id INTEGER,
      exam_id INTEGER,
      marks INTEGER,
      max_marks INTEGER,
      status TEXT DEFAULT 'approved'
    );

    CREATE TABLE IF NOT EXISTS fees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT,
      amount INTEGER,
      due_date TEXT,
      status TEXT,
      payment_date TEXT
    );

    CREATE TABLE IF NOT EXISTS substitutes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      absent_teacher_id TEXT,
      suggested_teacher_id TEXT,
      class_id INTEGER,
      period TEXT,
      status TEXT
    );

    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT,
      path TEXT,
      uploader_id TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT,
      amount INTEGER,
      status TEXT,
      provider_ref TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      token TEXT,
      expires_at TEXT,
      used INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS timetable (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER,
      day TEXT,
      period TEXT,
      subject_id INTEGER,
      teacher_id TEXT
    );

    CREATE TABLE IF NOT EXISTS leaves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id TEXT,
      date TEXT,
      reason TEXT,
      status TEXT
    );

    CREATE TABLE IF NOT EXISTS library_books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      author TEXT,
      isbn TEXT,
      quantity INTEGER,
      available INTEGER
    );

    CREATE TABLE IF NOT EXISTS library_issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER,
      user_id TEXT,
      issue_date TEXT,
      return_date TEXT,
      status TEXT
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      description TEXT,
      start_date TEXT,
      end_date TEXT,
      type TEXT
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      FOREIGN KEY(sender_id) REFERENCES users(id),
      FOREIGN KEY(receiver_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      userName TEXT,
      action TEXT NOT NULL,
      details TEXT,
      type TEXT, -- 'activity', 'login', 'ai', 'file', 'error'
      ip TEXT,
      device TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS automation_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      trigger_type TEXT NOT NULL, -- 'event', 'schedule'
      trigger_event TEXT NOT NULL, -- e.g., 'user_added', 'file_uploaded', 'daily_8pm'
      action_type TEXT NOT NULL, -- e.g., 'send_notification', 'generate_report', 'ai_summary', 'backup', 'clean_logs'
      action_params TEXT, -- JSON string
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key_value TEXT NOT NULL,
      provider TEXT DEFAULT 'gemini',
      is_active INTEGER DEFAULT 1,
      error_count INTEGER DEFAULT 0,
      last_used TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS cameras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      stream_url TEXT,
      status TEXT DEFAULT 'Active',
      type TEXT DEFAULT 'IP Camera',
      ai_enabled INTEGER DEFAULT 1,
      auto_recognize_enabled INTEGER DEFAULT 0,
      ai_rules TEXT, -- JSON string of behaviors to monitor
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS surveillance_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      camera_id INTEGER,
      user_id TEXT,
      behavior_type TEXT, -- 'roaming', 'chatting', 'running', 'unauthorized_access'
      description TEXT,
      snapshot_url TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      is_resolved INTEGER DEFAULT 0,
      FOREIGN KEY(camera_id) REFERENCES cameras(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS biometric_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      camera_id INTEGER,
      type TEXT, -- 'face', 'fingerprint', 'retina'
      confidence REAL,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(camera_id) REFERENCES cameras(id)
    );

    CREATE TABLE IF NOT EXISTS transport_routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_name TEXT NOT NULL,
      vehicle_no TEXT,
      driver_name TEXT,
      driver_phone TEXT,
      route_stops TEXT,
      fee INTEGER
    );

    CREATE TABLE IF NOT EXISTS transport_allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      route_id INTEGER,
      pickup_point TEXT,
      month TEXT
    );

    CREATE TABLE IF NOT EXISTS inventory_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_name TEXT NOT NULL,
      category TEXT,
      quantity INTEGER DEFAULT 0,
      unit_price INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER,
      type TEXT,
      quantity INTEGER,
      date TEXT,
      remarks TEXT,
      handled_by TEXT
    );

    CREATE TABLE IF NOT EXISTS email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS admission_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      studentName TEXT,
      dob TEXT,
      gender TEXT,
      bloodGroup TEXT,
      aadhaarNumber TEXT,
      category TEXT,
      appliedClass TEXT,
      previousSchool TEXT,
      fatherName TEXT,
      motherName TEXT,
      annualIncome TEXT,
      phone TEXT,
      emergencyContact TEXT,
      address TEXT,
      status TEXT DEFAULT 'pending',
      message TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_attendance_userId ON attendance(userId);
    CREATE INDEX IF NOT EXISTS idx_logs_userId ON logs(userId);
    CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
    CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
  `);

  // Add image_url to homeworks if it doesn't exist
  try {
    db.prepare("ALTER TABLE marks ADD COLUMN status TEXT DEFAULT 'approved'").run();
  } catch (e) {}

  try {
    db.prepare('ALTER TABLE homeworks ADD COLUMN image_url TEXT').run();
  } catch (e) {}

  try { db.prepare('ALTER TABLE exams ADD COLUMN subject_id INTEGER').run(); } catch (e) {}
  try { db.prepare('ALTER TABLE exams ADD COLUMN start_time TEXT').run(); } catch (e) {}
  try { db.prepare('ALTER TABLE exams ADD COLUMN end_time TEXT').run(); } catch (e) {}
  try { db.prepare('ALTER TABLE exams ADD COLUMN seating_plan TEXT').run(); } catch (e) {}
  try { db.prepare('ALTER TABLE exams ADD COLUMN exam_name TEXT').run(); } catch (e) {}
  try { db.prepare('ALTER TABLE exams ADD COLUMN start_date TEXT').run(); } catch (e) {}
  try { db.prepare('ALTER TABLE exams ADD COLUMN end_date TEXT').run(); } catch (e) {}
  try { db.prepare('ALTER TABLE exams ADD COLUMN class_name TEXT').run(); } catch (e) {}
  try { db.prepare('ALTER TABLE exams ADD COLUMN subject TEXT').run(); } catch (e) {}
  try { db.prepare('ALTER TABLE exams ADD COLUMN exam_date TEXT').run(); } catch (e) {}
  try { db.prepare('ALTER TABLE subjects ADD COLUMN stream TEXT').run(); } catch (e) {}
  try { db.prepare('ALTER TABLE fees ADD COLUMN description TEXT').run(); } catch (e) {}
  try { db.prepare('ALTER TABLE fees ADD COLUMN provider_ref TEXT').run(); } catch (e) {}

  const adminCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('admin').count;
  if (adminCount === 0) {
    const bcrypt = require('bcrypt');
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (id, role, name, email, key_hash) VALUES (?, ?, ?, ?, ?)').run(
      'admin', 'admin', 'System Admin', 'admin@vdic.edu', hash
    );
    db.prepare('INSERT OR IGNORE INTO finances (id, balance, income, expense) VALUES (1, 0, 0, 0)').run();
    console.log('Created default admin user with key: admin123');
  } else {
    // Check if 'admin' exists
    const adminExists = db.prepare('SELECT COUNT(*) as count FROM users WHERE id = ?').get('admin').count > 0;
    const bcrypt = require('bcrypt');
    const hash = bcrypt.hashSync('admin123', 10);
    if (!adminExists) {
      db.prepare('INSERT INTO users (id, role, name, email, key_hash) VALUES (?, ?, ?, ?, ?)').run(
        'admin', 'admin', 'System Admin', 'admin@vdic.edu', hash
      );
      console.log('Created admin user');
    } else {
      db.prepare('UPDATE users SET key_hash = ? WHERE id = ?').run(hash, 'admin');
      console.log('Force updated admin password');
    }
  }

  // Insert default teachers and students if they don't exist
  const teacherCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('teacher').count;
  if (teacherCount === 0) {
    const bcrypt = require('bcrypt');
    const insertUser = db.prepare(`INSERT OR IGNORE INTO users (id, role, name, email, key_hash, className, rollNo, subject, assignedClass, phone, status, freePeriods) VALUES (@id,@role,@name,@email,@key_hash,@className,@rollNo,@subject,@assignedClass,@phone,@status,@freePeriods)`);
    
    const users = [
      { id: 't1', role: 'teacher', name: 'Ramesh Sharma', subject: 'Mathematics', assignedClass: '10th A', phone: '9876543210', status: 'Present', key: 'tech123', freePeriods: JSON.stringify(['Period 2','Period 5']) },
      { id: 't2', role: 'teacher', name: 'Priya Singh', subject: 'Science', assignedClass: '9th B', phone: '9876543211', status: 'Present', key: 'tech456', freePeriods: JSON.stringify(['Period 1','Period 3']) },
      { id: 't3', role: 'teacher', name: 'Amit Kumar', subject: 'English', assignedClass: '11th C', phone: '9876543212', status: 'Absent', key: 'tech789', freePeriods: JSON.stringify([]) },
      { id: 's1', role: 'student', name: 'Rahul Verma', className: '10th A', rollNo: '12', key: 'stu123', phone: null },
      { id: 's2', role: 'student', name: 'Anjali Gupta', className: '10th A', rollNo: '15', key: 'stu456', phone: null },
      { id: 'staff1', role: 'staff', name: 'Admission Staff', key: 'staff123', phone: '9876543213' }
    ];

    for (const u of users) {
      const hash = bcrypt.hashSync(u.key, 10);
      insertUser.run({
        id: u.id,
        role: u.role,
        name: u.name,
        email: u.email || null,
        key_hash: hash,
        className: u.className || null,
        rollNo: u.rollNo || null,
        subject: u.subject || null,
        assignedClass: u.assignedClass || null,
        phone: u.phone || null,
        status: u.status || null,
        freePeriods: u.freePeriods || null
      });
    }
    console.log('Inserted default teachers and students');
  }

  // Insert provided API key if not exists and provided in env
  const keyCount = db.prepare('SELECT COUNT(*) as count FROM api_keys').get().count;
  if (keyCount === 0 && process.env.GEMINI_API_KEY) {
    db.prepare('INSERT INTO api_keys (key_value, provider, created_at) VALUES (?, ?, ?)').run(
      process.env.GEMINI_API_KEY, 'gemini', new Date().toISOString()
    );
    console.log('Inserted default API key from environment');
  }

  // Insert default cameras if none exist
  const cameraCount = db.prepare('SELECT COUNT(*) as count FROM cameras').get().count;
  if (cameraCount === 0) {
    const stmt = db.prepare('INSERT INTO cameras (name, location, stream_url, status, type) VALUES (?, ?, ?, ?, ?)');
    stmt.run('Main Gate', 'Entrance', 'https://picsum.photos/seed/cam1/800/450', 'Active', 'IP Camera');
    stmt.run('Playground', 'Outdoor', 'https://picsum.photos/seed/cam2/800/450', 'Active', 'IP Camera');
    stmt.run('Library', 'First Floor', 'https://picsum.photos/seed/cam3/800/450', 'Active', 'IP Camera');
    stmt.run('Corridor A', 'Ground Floor', 'https://picsum.photos/seed/cam4/800/450', 'Active', 'IP Camera');
    console.log('Inserted default cameras');
  }
}

prepareSchema();

module.exports = db;
