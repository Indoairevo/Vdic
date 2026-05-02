const db = require('./server/db.cjs');
const bcrypt = require('bcrypt');

const users = [
  { id: 'admin123', role: 'admin', key: 'admin123', name: 'Super Admin', email: 'admin@vdic.edu' },
  { id: 't1', role: 'teacher', key: 'tech123', name: 'Ramesh Sharma', subject: 'Mathematics', assignedClass: '10th A', phone: '9876543210', status: 'Present', freePeriods: '["Period 2", "Period 5"]' },
  { id: 't2', role: 'teacher', key: 'tech456', name: 'Priya Singh', subject: 'Science', assignedClass: '9th B', phone: '9876543211', status: 'Present', freePeriods: '["Period 1", "Period 3"]' },
  { id: 't3', role: 'teacher', key: 'tech789', name: 'Amit Kumar', subject: 'English', assignedClass: '11th C', phone: '9876543212', status: 'Absent', freePeriods: '[]' },
  { id: 's1', role: 'student', key: 'stu123', name: 'Rahul Verma', className: '10th A', rollNo: '12' },
  { id: 's2', role: 'student', key: 'stu456', name: 'Anjali Gupta', className: '10th A', rollNo: '15' }
];

for (const u of users) {
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(u.id);
  if (!existing) {
    const hash = bcrypt.hashSync(u.key, 10);
    db.prepare('INSERT INTO users (id, role, name, email, key_hash, className, rollNo, subject, assignedClass, phone, status, freePeriods) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      u.id, u.role, u.name, u.email || null, hash, u.className || null, u.rollNo || null, u.subject || null, u.assignedClass || null, u.phone || null, u.status || null, u.freePeriods || null
    );
    console.log('Inserted', u.id);
  } else {
    // update key
    const hash = bcrypt.hashSync(u.key, 10);
    db.prepare('UPDATE users SET key_hash = ? WHERE id = ?').run(hash, u.id);
    console.log('Updated', u.id);
  }
}
