const db = require('./db.cjs');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

async function seed() {
  const insertUser = db.prepare(`INSERT OR REPLACE INTO users (id, role, name, email, key_hash, className, rollNo, subject, assignedClass, phone, status, freePeriods) VALUES (@id,@role,@name,@email,@key_hash,@className,@rollNo,@subject,@assignedClass,@phone,@status,@freePeriods)`);

  const adminPass = process.env.SEED_ADMIN_PASSWORD || 'Admin@1234';
  const teacherPass = process.env.SEED_TEACHER_PASSWORD || 'Teacher@1234';
  const studentPass = process.env.SEED_STUDENT_PASSWORD || 'Student@1234';

  const users = [
    { id: 'admin1', role: 'admin', name: 'Super Admin', email: 'admin@vdic.edu', key: adminPass },
    { id: 't1', role: 'teacher', name: 'Ramesh Sharma', subject: 'Mathematics', assignedClass: '10th A', phone: '9876543210', status: 'Present', key: teacherPass, freePeriods: JSON.stringify(['Period 2','Period 5']) },
    { id: 't2', role: 'teacher', name: 'Priya Singh', subject: 'Science', assignedClass: '9th B', phone: '9876543211', status: 'Present', key: teacherPass, freePeriods: JSON.stringify(['Period 1','Period 3']) },
    { id: 't3', role: 'teacher', name: 'Amit Kumar', subject: 'English', assignedClass: '11th C', phone: '9876543212', status: 'Absent', key: teacherPass, freePeriods: JSON.stringify([]) },
    { id: 's1', role: 'student', name: 'Rahul Verma', className: '10th A', rollNo: '12', key: studentPass, phone: null },
    { id: 's2', role: 'student', name: 'Anjali Gupta', className: '10th A', rollNo: '15', key: studentPass, phone: null }
  ];

  for (const u of users) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(u.key, salt);
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

  const insertNotice = db.prepare(`INSERT INTO notices (title,content,target,date,author) VALUES (?,?,?,?,?)`);
  insertNotice.run('Holi Festival Holiday', 'The school will remain closed for the upcoming 2 days on account of the Holi Festival.', 'all', new Date().toLocaleDateString(), 'Admin');
  insertNotice.run('Board Exam Fees Due', 'All Class 10th students are required to submit their board examination fees by the end of this week.', 'students', new Date().toLocaleDateString(), 'Admin');

  const insertHw = db.prepare(`INSERT INTO homeworks (title,description,date,publishDate,className,subject,teacherName) VALUES (?,?,?,?,?,?,?)`);
  insertHw.run('Trigonometry Exercises','Complete exercises 8.1 and 8.2 from the NCERT Mathematics textbook.','2023-11-25','2023-11-20','10th A','Mathematics','Ramesh Sharma');

  const fin = db.prepare(`INSERT OR REPLACE INTO finances (id,balance,income,expense) VALUES (1,?,?,?)`);
  fin.run(1250000, 1500000, 250000);

  const insertFinHist = db.prepare(`INSERT INTO finance_history (type,description,amount,date) VALUES (?,?,?,?)`);
  insertFinHist.run('Income','Term 1 Tuition Fees',500000,'2023-10-01');
  insertFinHist.run('Expense','Electricity & Utility Bills',45000,'2023-10-15');
  insertFinHist.run('Expense','Lab Equipment Purchase',120000,'2023-10-20');

  console.log('Seeding complete');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
