const fs = require('fs');
const path = require('path');

const targetDirs = [
  'src/app/(authenticated)',
  'src/app/pos',
  'src/views',
  'src/components'
];

const replacements = [
  // Backgrounds & Base Colors
  { regex: /bg-background/g, replacement: 'bg-[#1A0F0A]' },
  { regex: /bg-\[\#F6F3EA\]/g, replacement: 'bg-[#1A0F0A]' },
  { regex: /bg-\[\#FAF7F0\]/g, replacement: 'bg-[#1A0F0A]' },
  
  // Mahongany / Dark Terracotta substitutions (Old brown to new Mahogany)
  { regex: /bg-\[\#3D1A0F\]/g, replacement: 'bg-[#3D140D]' },
  { regex: /border-\[\#4E271B\]/g, replacement: 'border-[#8C2818]' },
  { regex: /text-\[\#3D1A0F\]/g, replacement: 'text-[#F4F1E9]' },
  
  // Gold substitutions
  { regex: /text-\[\#C97B1A\]/g, replacement: 'text-[#C5A059]' },
  { regex: /bg-\[\#C97B1A\]/g, replacement: 'bg-[#C5A059]' },
  { regex: /border-\[\#C97B1A\]/g, replacement: 'border-[#C5A059]' },
  { regex: /from-\[\#C97B1A\]/g, replacement: 'from-[#C5A059]' },
  
  // Light mode specific colors to Dark mode
  { regex: /bg-white/g, replacement: 'bg-[#3D140D]' }, // Most white cards become Mahogany
  { regex: /bg-white\/50/g, replacement: 'bg-[#1A0F0A]\/50' },
  { regex: /bg-white\/10/g, replacement: 'bg-[#8C2818]\/40' },
  { regex: /bg-white\/20/g, replacement: 'bg-[#8C2818]\/60' },
  { regex: /text-white/g, replacement: 'text-[#F4F1E9]' },
  { regex: /text-amber-100/g, replacement: 'text-[#F4F1E9]' },
  { regex: /text-\[\#1C1009\]/g, replacement: 'text-[#F4F1E9]' },
  { regex: /text-\[\#6B4F3A\]/g, replacement: 'text-[#F4F1E9]\/70' },
  
  // Light borders
  { regex: /border-\[\#E8DCC8\]/g, replacement: 'border-[#C5A059]\/30' },
  { regex: /border-gray-250/g, replacement: 'border-[#8C2818]' },
  { regex: /border-gray-200/g, replacement: 'border-[#8C2818]' },
  { regex: /border-gray-100/g, replacement: 'border-[#8C2818]\/50' },
  
  // Specific UI tweaks
  { regex: /bg-cta/g, replacement: 'bg-[#8C2818]' },
  { regex: /text-cta/g, replacement: 'text-[#C5A059]' },
  { regex: /shadow-cta/g, replacement: 'shadow-[#1A0F0A]' },
  
  { regex: /text-\[\#18100A\]/g, replacement: 'text-[#1A0F0A]' }
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
      // Exclude landing components since they were already done manually
      if (fullPath.includes('landing')) continue;
      
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;
      
      for (const rep of replacements) {
        content = content.replace(rep.regex, rep.replacement);
      }
      
      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
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

console.log('Theme refactor complete.');
