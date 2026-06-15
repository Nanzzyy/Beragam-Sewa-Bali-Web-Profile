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
  
  // Apply dark mode replacements
  content = content.replace(/\bbg-white\b/g, 'bg-white dark:bg-slate-900');
  content = content.replace(/\bbg-slate-50\b/g, 'bg-slate-50 dark:bg-slate-950');
  content = content.replace(/\bbg-slate-100\b/g, 'bg-slate-100 dark:bg-slate-800');
  content = content.replace(/\bbg-slate-900\b/g, 'bg-slate-900 dark:bg-slate-100');
  content = content.replace(/\btext-slate-900\b/g, 'text-slate-900 dark:text-white');
  content = content.replace(/\btext-slate-800\b/g, 'text-slate-800 dark:text-slate-200');
  content = content.replace(/\btext-slate-700\b/g, 'text-slate-700 dark:text-slate-300');
  content = content.replace(/\btext-slate-600\b/g, 'text-slate-600 dark:text-slate-400');
  content = content.replace(/\btext-slate-500\b/g, 'text-slate-500 dark:text-slate-400');
  content = content.replace(/\bborder-slate-200\b/g, 'border-slate-200 dark:border-slate-800');
  content = content.replace(/\bborder-slate-300\b/g, 'border-slate-300 dark:border-slate-700');
  content = content.replace(/\bborder-slate-100\b/g, 'border-slate-100 dark:border-slate-800/50');
  content = content.replace(/\btext-white\b/g, 'text-white dark:text-slate-900');
  content = content.replace(/\bbg-white\/80\b/g, 'bg-white/80 dark:bg-slate-900/80');
  content = content.replace(/\bbg-white\/90\b/g, 'bg-white/90 dark:bg-slate-900/90');

  // Specific color tweaks
  content = content.replace(/shadow-slate-200\/50/g, 'shadow-slate-200/50 dark:shadow-slate-900/50');
  content = content.replace(/shadow-slate-200/g, 'shadow-slate-200 dark:shadow-slate-900');
  
  fs.writeFileSync(p, content);
});

console.log('Dark mode classes applied!');
