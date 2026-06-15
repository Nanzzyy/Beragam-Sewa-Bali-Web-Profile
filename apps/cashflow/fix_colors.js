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
  
  // Fix button text on emerald background (Remove dark:text-slate-900)
  // Example: text-white dark:text-slate-900
  content = content.replace(/bg-emerald-600([^>]*?)text-white dark:text-slate-900/g, 'bg-emerald-600$1text-white');
  
  // Fix pastel backgrounds for icons in dark mode
  content = content.replace(/bg-blue-50(?!\/| dark:)/g, 'bg-blue-50 dark:bg-blue-500/10');
  content = content.replace(/text-blue-600(?!\/| dark:)/g, 'text-blue-600 dark:text-blue-400');
  
  content = content.replace(/bg-amber-50(?!\/| dark:)/g, 'bg-amber-50 dark:bg-amber-500/10');
  content = content.replace(/text-amber-600(?!\/| dark:)/g, 'text-amber-600 dark:text-amber-400');
  
  content = content.replace(/bg-purple-50(?!\/| dark:)/g, 'bg-purple-50 dark:bg-purple-500/10');
  content = content.replace(/text-purple-600(?!\/| dark:)/g, 'text-purple-600 dark:text-purple-400');

  content = content.replace(/bg-emerald-50(?!\/| dark:)/g, 'bg-emerald-50 dark:bg-emerald-500/10');
  content = content.replace(/text-emerald-600(?!\/| dark:)/g, 'text-emerald-600 dark:text-emerald-400');

  content = content.replace(/bg-rose-50(?!\/| dark:)/g, 'bg-rose-50 dark:bg-rose-500/10');
  content = content.replace(/text-rose-600(?!\/| dark:)/g, 'text-rose-600 dark:text-rose-400');

  // Fix selection colors so they aren't unreadable
  content = content.replace(/selection:bg-emerald-100 dark:selection:bg-emerald-900\/50/g, 'selection:bg-emerald-500/20 dark:selection:bg-emerald-500/30');
  content = content.replace(/selection:text-emerald-900 dark:selection:text-emerald-100/g, ''); // just inherit text color
  
  // Make overall dark mode background slightly richer (slate-950 is fine, but slate-900 borders can clash)
  // Let's replace border-slate-800 with border-slate-800/60 for softer borders
  content = content.replace(/dark:border-slate-800(?![\/])/g, 'dark:border-slate-800/60');
  
  fs.writeFileSync(p, content);
});

console.log('Dark mode contrast issues fixed!');
