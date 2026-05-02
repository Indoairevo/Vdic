const db = require('./db_pg.cjs');

if (!db) {
  console.error('No DATABASE_URL configured. Set environment variable DATABASE_URL to run migrations.');
  process.exit(1);
}

async function migrate() {
  await db.query(`
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
      created_at TIMESTAMP DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS notices (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      target TEXT NOT NULL,
      date TEXT,
      author TEXT,
      created_at TIMESTAMP DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS homeworks (
      id SERIAL PRIMARY KEY,
      title TEXT,
      description TEXT,
      date TEXT,
      publishDate TEXT,
      className TEXT,
      subject TEXT,
      teacherName TEXT
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id SERIAL PRIMARY KEY,
      userId TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS complaints (
      id SERIAL PRIMARY KEY,
      byName TEXT,
      role TEXT,
      text TEXT,
      status TEXT,
      date TEXT
    );

    CREATE TABLE IF NOT EXISTS finances (
      id SERIAL PRIMARY KEY,
      balance BIGINT DEFAULT 0,
      income BIGINT DEFAULT 0,
      expense BIGINT DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS finance_history (
      id SERIAL PRIMARY KEY,
      type TEXT,
      description TEXT,
      amount BIGINT,
      date TEXT
    );
    
    CREATE TABLE IF NOT EXISTS classes (
      id SERIAL PRIMARY KEY,
      class_name TEXT,
      section TEXT,
      class_teacher_id TEXT
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id SERIAL PRIMARY KEY,
      subject_name TEXT,
      teacher_id TEXT,
      class_id INTEGER
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
      id SERIAL PRIMARY KEY,
      exam_type TEXT,
      class_id INTEGER,
      date TEXT,
      subject_id INTEGER,
      start_time TEXT,
      end_time TEXT,
      seating_plan TEXT
    );

    ALTER TABLE exams ADD COLUMN IF NOT EXISTS subject_id INTEGER;
    ALTER TABLE exams ADD COLUMN IF NOT EXISTS start_time TEXT;
    ALTER TABLE exams ADD COLUMN IF NOT EXISTS end_time TEXT;
    ALTER TABLE exams ADD COLUMN IF NOT EXISTS seating_plan TEXT;

    CREATE TABLE IF NOT EXISTS marks (
      id SERIAL PRIMARY KEY,
      student_id TEXT,
      subject_id INTEGER,
      exam_id INTEGER,
      marks INTEGER,
      max_marks INTEGER
    );

    CREATE TABLE IF NOT EXISTS fees (
      id SERIAL PRIMARY KEY,
      student_id TEXT,
      amount BIGINT,
      due_date TEXT,
      status TEXT,
      payment_date TEXT
    );

    CREATE TABLE IF NOT EXISTS substitutes (
      id SERIAL PRIMARY KEY,
      absent_teacher_id TEXT,
      suggested_teacher_id TEXT,
      class_id INTEGER,
      period TEXT,
      status TEXT
    );

    CREATE TABLE IF NOT EXISTS files (
      id SERIAL PRIMARY KEY,
      filename TEXT,
      path TEXT,
      uploader_id TEXT,
      created_at TIMESTAMP DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      student_id TEXT,
      amount BIGINT,
      status TEXT,
      provider_ref TEXT,
      created_at TIMESTAMP DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id SERIAL PRIMARY KEY,
      user_id TEXT,
      token TEXT,
      expires_at TIMESTAMP,
      used BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS timetable (
      id SERIAL PRIMARY KEY,
      class_id INTEGER,
      day TEXT,
      period TEXT,
      subject_id INTEGER,
      teacher_id TEXT
    );

    CREATE TABLE IF NOT EXISTS leaves (
      id SERIAL PRIMARY KEY,
      teacher_id TEXT,
      date TEXT,
      reason TEXT,
      status TEXT
    );

    CREATE TABLE IF NOT EXISTS library_books (
      id SERIAL PRIMARY KEY,
      title TEXT,
      author TEXT,
      isbn TEXT,
      quantity INTEGER,
      available INTEGER
    );

    CREATE TABLE IF NOT EXISTS library_issues (
      id SERIAL PRIMARY KEY,
      book_id INTEGER,
      user_id TEXT,
      issue_date TEXT,
      return_date TEXT,
      status TEXT
    );

    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      title TEXT,
      description TEXT,
      start_date TEXT,
      end_date TEXT,
      type TEXT
    );

    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      sender_id TEXT NOT NULL REFERENCES users(id),
      receiver_id TEXT NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      timestamp TIMESTAMP DEFAULT now(),
      is_read BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS automation_rules (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      trigger_type TEXT NOT NULL,
      trigger_event TEXT NOT NULL,
      action_type TEXT NOT NULL,
      action_params TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id SERIAL PRIMARY KEY,
      key_value TEXT NOT NULL UNIQUE,
      provider TEXT DEFAULT 'gemini',
      is_active BOOLEAN DEFAULT TRUE,
      error_count INTEGER DEFAULT 0,
      last_used TIMESTAMP,
      created_at TIMESTAMP DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS transport_routes (
      id SERIAL PRIMARY KEY,
      route_name TEXT NOT NULL,
      vehicle_no TEXT,
      driver_name TEXT,
      driver_phone TEXT,
      route_stops TEXT,
      fee INTEGER
    );

    CREATE TABLE IF NOT EXISTS transport_allocations (
      id SERIAL PRIMARY KEY,
      user_id TEXT,
      route_id INTEGER,
      pickup_point TEXT,
      month TEXT
    );

    CREATE TABLE IF NOT EXISTS inventory_items (
      id SERIAL PRIMARY KEY,
      item_name TEXT NOT NULL,
      category TEXT,
      quantity INTEGER DEFAULT 0,
      unit_price INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id SERIAL PRIMARY KEY,
      item_id INTEGER,
      type TEXT,
      quantity INTEGER,
      date TEXT,
      remarks TEXT,
      handled_by TEXT
    );

    CREATE TABLE IF NOT EXISTS admission_applications (
      id SERIAL PRIMARY KEY,
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
      created_at TIMESTAMP DEFAULT now()
    );
  `);

  try { await pg.query('ALTER TABLE exams ADD COLUMN IF NOT EXISTS subject_id INTEGER'); } catch(e) {}
  try { await pg.query('ALTER TABLE exams ADD COLUMN IF NOT EXISTS start_time TEXT'); } catch(e) {}
  try { await pg.query('ALTER TABLE exams ADD COLUMN IF NOT EXISTS end_time TEXT'); } catch(e) {}
  try { await pg.query('ALTER TABLE exams ADD COLUMN IF NOT EXISTS seating_plan TEXT'); } catch(e) {}
  try { await pg.query('ALTER TABLE exams ADD COLUMN IF NOT EXISTS exam_name TEXT'); } catch(e) {}
  try { await pg.query('ALTER TABLE exams ADD COLUMN IF NOT EXISTS start_date TEXT'); } catch(e) {}
  try { await pg.query('ALTER TABLE exams ADD COLUMN IF NOT EXISTS end_date TEXT'); } catch(e) {}
  try { await pg.query('ALTER TABLE exams ADD COLUMN IF NOT EXISTS class_name TEXT'); } catch(e) {}
  try { await pg.query('ALTER TABLE exams ADD COLUMN IF NOT EXISTS subject TEXT'); } catch(e) {}
  try { await pg.query('ALTER TABLE exams ADD COLUMN IF NOT EXISTS exam_date TEXT'); } catch(e) {}

  console.log('Migrations applied');
  process.exit(0);
}

migrate().catch(err => { console.error(err); process.exit(1); });
