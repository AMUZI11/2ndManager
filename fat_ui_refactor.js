const fs = require('fs');
const path = require('path');

const targetDirs = [
  'src/app/(authenticated)',
  'src/app/pos',
  'src/views',
  'src/components'
];

const replacements = [
  // Typography inflation
  { regex: /text-xs/g, replacement: 'text-base' },
  { regex: /text-sm/g, replacement: 'text-lg' },
  { regex: /text-base/g, replacement: 'text-xl' },
  
  // Spacing inflation
  { regex: /gap-2/g, replacement: 'gap-4' },
  { regex: /gap-3/g, replacement: 'gap-6' },
  { regex: /gap-4/g, replacement: 'gap-8' },
  { regex: /p-3/g, replacement: 'p-6' },
  { regex: /p-4/g, replacement: 'p-8' },
  
  // High contrast fixes
  { regex: /text-\[\#F4F1E9\]\/60/g, replacement: 'text-[#F4F1E9]' },
  { regex: /text-\[\#F4F1E9\]\/70/g, replacement: 'text-[#F4F1E9]' },
  { regex: /text-\[\#F4F1E9\]\/80/g, replacement: 'text-[#F4F1E9]' },
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
      // Avoid destroying the Button/Input logic we just wrote
      if (fullPath.includes('Button.jsx') || fullPath.includes('Input.jsx')) continue;
      // Landing page components are already good
      if (fullPath.includes('landing')) continue;
      
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;
      
      for (const rep of replacements) {
        content = content.replace(rep.regex, rep.replacement);
      }
      
      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Fat UI Updated: ${fullPath}`);
      }
    }
  }
}

targetDirs.forEach(dir => {
  const fullDirPath = path.join(__dirname, dir);
  if (fs.existsSync(fullDirPath)) {
    processDirectory(fullDirPath);
  }
});

console.log('Fat UI refactor complete.');
