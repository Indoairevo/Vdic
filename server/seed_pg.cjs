const pg = require('./db_pg.cjs');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

if (!pg) {
  console.error('No DATABASE_URL found. Cannot seed Postgres.');
  process.exit(1);
}

async function seed() {
  // users
  const users = [
    { id: 'admin1', role: 'admin', name: 'Super Admin', email: 'admin@vdic.edu', key: 'satya8543025528' },
    { id: 't1', role: 'teacher', name: 'Ramesh Sharma', subject: 'Mathematics', assignedClass: '10th A', phone: '9876543210', status: 'Present', key: 'tech123', freePeriods: JSON.stringify(['Period 2','Period 5']) },
    { id: 't2', role: 'teacher', name: 'Priya Singh', subject: 'Science', assignedClass: '9th B', phone: '9876543211', status: 'Present', key: 'tech456', freePeriods: JSON.stringify(['Period 1','Period 3']) },
    { id: 't3', role: 'teacher', name: 'Amit Kumar', subject: 'English', assignedClass: '11th C', phone: '9876543212', status: 'Absent', key: 'tech789', freePeriods: JSON.stringify([]) },
    { id: 's1', role: 'student', name: 'Rahul Verma', className: '10th A', rollNo: '12', key: 'stu123' },
    { id: 's2', role: 'student', name: 'Anjali Gupta', className: '10th A', rollNo: '15', key: 'stu456' }
  ];

  for (const u of users) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(u.key, salt);
    await pg.query('INSERT INTO users (id,role,name,email,key_hash,className,rollNo,subject,assignedClass,phone,status,freePeriods) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, name=EXCLUDED.name', [
      u.id, u.role, u.name, u.email || null, hash, u.className || null, u.rollNo || null, u.subject || null, u.assignedClass || null, u.phone || null, u.status || null, u.freePeriods || null
    ]);
  }

  await pg.query('INSERT INTO notices (title,content,target,date,author) VALUES ($1,$2,$3,$4,$5)', ['Holi Festival Holiday','The school will remain closed for the upcoming 2 days on account of the Holi Festival.','all', new Date().toLocaleDateString(), 'Admin']);
  await pg.query('INSERT INTO notices (title,content,target,date,author) VALUES ($1,$2,$3,$4,$5)', ['Board Exam Fees Due','All Class 10th students are required to submit their board examination fees by the end of this week.','students', new Date().toLocaleDateString(), 'Admin']);

  await pg.query('INSERT INTO homeworks (title,description,date,publishDate,className,subject,teacherName) VALUES ($1,$2,$3,$4,$5,$6,$7)', ['Trigonometry Exercises','Complete exercises 8.1 and 8.2 from the NCERT Mathematics textbook.','2023-11-25','2023-11-20','10th A','Mathematics','Ramesh Sharma']);

  await pg.query('INSERT INTO finances (id,balance,income,expense) VALUES (1,$1,$2,$3) ON CONFLICT (id) DO UPDATE SET balance=EXCLUDED.balance', [1250000,1500000,250000]);

  await pg.query('INSERT INTO finance_history (type,description,amount,date) VALUES ($1,$2,$3,$4)', ['Income','Term 1 Tuition Fees',500000,'2023-10-01']);
  await pg.query('INSERT INTO finance_history (type,description,amount,date) VALUES ($1,$2,$3,$4)', ['Expense','Electricity & Utility Bills',45000,'2023-10-15']);
  await pg.query('INSERT INTO finance_history (type,description,amount,date) VALUES ($1,$2,$3,$4)', ['Expense','Lab Equipment Purchase',120000,'2023-10-20']);

  // classes and subjects
  await pg.query('INSERT INTO classes (class_name,section,class_teacher_id) VALUES ($1,$2,$3)', ['10th','A','t1']);
  const cls = await pg.query('SELECT id FROM classes WHERE class_name=$1 LIMIT 1', ['10th']);
  const classId = cls.rows[0]?.id || 1;
  await pg.query('INSERT INTO subjects (subject_name,teacher_id,class_id) VALUES ($1,$2,$3)', ['Mathematics','t1', classId]);
  await pg.query('INSERT INTO subjects (subject_name,teacher_id,class_id) VALUES ($1,$2,$3)', ['Science','t2', classId]);

  // fees sample
  await pg.query('INSERT INTO fees (student_id,amount,due_date,status) VALUES ($1,$2,$3,$4)', ['s1',5000,'2024-03-31','unpaid']);

  // exams and marks sample
  const ex = await pg.query('INSERT INTO exams (exam_type,class_id,date) VALUES ($1,$2,$3) RETURNING id', ['Unit Test', classId, '2024-02-15']);
  const examId = ex.rows[0].id;
  await pg.query('INSERT INTO marks (student_id,subject_id,exam_id,marks,max_marks) VALUES ($1,$2,$3,$4,$5)', ['s1',1,examId,78,100]);

  console.log('Postgres seeding complete');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
