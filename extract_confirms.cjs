const fs = require('fs');

const content = fs.readFileSync('src/App.jsx', 'utf8');
const lines = content.split('\n');

const confirmLines = [562, 1394, 2642, 2877, 4260, 4606, 4720, 4839, 5064, 5130, 5408, 6063, 6075, 7356, 7525, 7533, 7786];

confirmLines.forEach(lineNum => {
  const start = Math.max(0, lineNum - 3);
  const end = Math.min(lines.length - 1, lineNum + 6);
  console.log(`\n--- Line ${lineNum} ---`);
  console.log(lines.slice(start, end).join('\n'));
});
