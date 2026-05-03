const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');

// Replace alert('...') with showToast('...', 'success') or 'error'
content = content.replace(/alert\((['"`])(.*?)(['"`])\)/g, (match, p1, p2, p3) => {
  const isError = p2.toLowerCase().includes('fail') || p2.toLowerCase().includes('error') || p2.toLowerCase().includes('please');
  const type = isError ? 'error' : 'success';
  return `showToast(${p1}${p2}${p3}, '${type}')`;
});

// Also replace alert(err.response?.data?.error || '...')
content = content.replace(/alert\((.*?)\)/g, (match, p1) => {
  if (p1.includes('showToast')) return match; // already replaced
  const isError = p1.toLowerCase().includes('fail') || p1.toLowerCase().includes('error') || p1.toLowerCase().includes('please');
  const type = isError ? 'error' : 'success';
  return `showToast(${p1}, '${type}')`;
});

// Add showToast to component props if not present
const components = [
  'ClassesPage', 'SubjectsPage', 'NoticesPage', 'ComplaintsPage', 'SettingsPage', 
  'TimetablePage', 'LeaveManagementPage', 'ProfilePage', 'HomeworkPage', 
  'AttendancePage', 'FeesPage', 'ExamsPage', 'SubstitutesPage', 'LibraryPage', 
  'EventsPage', 'MessagesPage', 'LeavesPage'
];

components.forEach(comp => {
  const regex = new RegExp(`function ${comp}\\(\\{([^}]*)\\}\\)\\s*\\{`, 'g');
  content = content.replace(regex, (match, props) => {
    if (!props.includes('showToast')) {
      return `function ${comp}({ ${props}, showToast }) {`;
    }
    return match;
  });
});

fs.writeFileSync('src/App.jsx', content);
console.log('Done');
