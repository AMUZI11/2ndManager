const fs = require('fs');
const path = require('path');

const SECRET_PATTERNS = [
  { name: 'Supabase Service Role Key in Public Variable', regex: /NEXT_PUBLIC_.*(?:SERVICE_ROLE|SECRET|PRIVATE)/i },
  { name: 'Exposed Supabase JWT Secret Key', regex: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/ },
  { name: 'VAPID Private Key in Frontend Variable', regex: /NEXT_PUBLIC_.*VAPID_PRIVATE/i },
  { name: 'Hardcoded PostgreSQL Password in Code', regex: /postgres:[^@\s]+@/i, ignoreIn: ['scratch/'] },
  { name: 'AWS Secret Key Pattern', regex: /AKIA[0-9A-Z]{16}/ },
];

function scanDirectory(dir, issues = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');

    // Skip node_modules, .git, .next, .worktrees, local env files, and media files
    if (['node_modules', '.git', '.next', '.gemini', '.worktrees', 'public'].includes(entry.name)) continue;
    if (['.env', '.env.local'].includes(entry.name)) continue;
    if (entry.name.endsWith('.png') || entry.name.endsWith('.ico') || entry.name.endsWith('.woff2')) continue;

    if (entry.isDirectory()) {
      scanDirectory(fullPath, issues);
    } else if (entry.isFile()) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      for (const rule of SECRET_PATTERNS) {
        if (rule.ignoreIn && rule.ignoreIn.some(ignore => relPath.startsWith(ignore))) {
          continue;
        }

        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          // Ignore commented docs or this audit file itself
          if (relPath === 'scratch/audit_git_secrets.cjs') return;
          if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('#')) return;

          if (rule.regex.test(line)) {
            issues.push({
              file: relPath,
              line: idx + 1,
              rule: rule.name,
              preview: line.trim().slice(0, 80)
            });
          }
        });
      }
    }
  }
  return issues;
}

console.log('🔍 [AUDIT GIT SECRETS] Memindai codebase 2ndManager dari potensi kebocoran rahasia...');
const results = scanDirectory(process.cwd());

if (results.length === 0) {
  console.log('✅ PASS: Tidak ditemukan kebocoran secret key atau API token di codebase!');
  process.exit(0);
} else {
  console.warn(`⚠️ DITEMUKAN ${results.length} POTENSI KEBOCORAN RAHASIA:`);
  results.forEach(r => {
    console.warn(`  - [${r.rule}] di ${r.file}:${r.line}`);
    console.warn(`    Snippet: ${r.preview}`);
  });
  process.exit(1);
}
