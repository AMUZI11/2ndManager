const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const replacements = [
  // 1. Dark Coffee (Background) -> bg-kw-bg
  { regex: /bg-\[\#1A0F0A\]/g, replacement: 'bg-kw-bg' },
  { regex: /text-\[\#1A0F0A\]/g, replacement: 'text-kw-bg' }, // Sometimes used as text color
  { regex: /hover:bg-\[\#1A0F0A\]/g, replacement: 'hover:bg-kw-bg' },
  // 2. Mahogany (Cards) -> bg-kw-card
  { regex: /bg-\[\#3D140D\]/g, replacement: 'bg-kw-card' },
  { regex: /text-\[\#3D140D\]/g, replacement: 'text-kw-card' },
  // 3. Cream (Text) -> text-kw-text
  { regex: /text-\[\#F4F1E9\](\/[0-9]+)?/g, replacement: 'text-kw-text' }, 
  { regex: /bg-\[\#F4F1E9\](\/[0-9]+)?/g, replacement: 'bg-kw-text' }, 
  // 4. Border colors
  { regex: /border-\[\#8C2818\](\/[0-9]+)?/g, replacement: 'border-kw-border' },
  { regex: /border-\[\#C5A059\](\/[0-9]+)?/g, replacement: 'border-kw-border' },
  // 5. Accents (Gold)
  { regex: /text-\[\#C5A059\]/g, replacement: 'text-kw-accent' },
  { regex: /bg-\[\#C5A059\]/g, replacement: 'bg-kw-accent' },
  { regex: /hover:bg-\[\#A85F10\]/g, replacement: 'hover:bg-kw-accent-hover' },
];

function processDirectory(directory) {
  const files = fs.readdirSync(directory);

  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;

      for (const { regex, replacement } of replacements) {
        if (regex.test(content)) {
          content = content.replace(regex, replacement);
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

console.log('Starting theme variable migration...');
processDirectory(srcDir);
console.log('Migration completed.');
