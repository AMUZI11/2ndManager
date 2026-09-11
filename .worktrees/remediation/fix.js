const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) results = results.concat(walk(file));
    else if (file.endsWith('.js') || file.endsWith('.jsx')) results.push(file);
  });
  return results;
}

const files = walk('./src');
let c = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let m = false;
  
  if (content.match(/import\s+\{\s*prisma\s*\}\s+from\s+['"]@\/lib\/prisma['"];?/)) {
    content = content.replace(/import\s+\{\s*prisma\s*\}\s+from\s+['"]@\/lib\/prisma['"];?/g, 'const prisma = {};');
    m = true;
  }
  
  if (m) {
    fs.writeFileSync(file, content, 'utf8');
    c++;
  }
});
console.log('Fixed ' + c + ' files');
