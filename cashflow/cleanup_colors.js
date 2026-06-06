const fs = require('fs');
const path = require('path');

const files = [
  'app/page.tsx',
  'components/ChartOfAccountsGrid.tsx',
  'components/ExcelExportButton.tsx',
  'components/FixedAssetsGrid.tsx',
  'components/TransactionModal.tsx',
  'components/Worksheet.tsx'
];

files.forEach(f => {
  const p = path.join(__dirname, f);
  if (!fs.existsSync(p)) return;
  let content = fs.readFileSync(p, 'utf8');
  
  // Remove overlapping or conflicting dark classes caused by naive script
  content = content.replace(/dark:text-white dark:text-slate-900/g, 'dark:text-white');
  content = content.replace(/dark:bg-slate-900 dark:bg-slate-100/g, 'dark:bg-slate-900');
  
  // Sometimes it's the other way around due to text-white dark:text-slate-900 replacement
  content = content.replace(/dark:text-slate-900 dark:text-white/g, 'dark:text-white');
  content = content.replace(/dark:bg-slate-100 dark:bg-slate-900/g, 'dark:bg-slate-900');

  // Let's also fix amber buttons which might have dark text that clashes
  content = content.replace(/bg-amber-600 hover:bg-amber-700 text-white dark:text-slate-900/g, 'bg-amber-600 hover:bg-amber-700 text-white');

  fs.writeFileSync(p, content);
});

console.log('Duplicate dark classes cleaned up!');
