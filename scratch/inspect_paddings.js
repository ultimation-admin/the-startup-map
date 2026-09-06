const fs = require('fs');
const path = require('path');

function walk(dir, results = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath, results);
    } else if (file.endsWith('.tsx') || file.endsWith('.css') || file.endsWith('.jsx') || file.endsWith('.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = walk('d:/rishi/thestartupmap/src');
console.log('--- Inspecting Paddings in Files ---');

files.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (/padding|p[xytlr]?-\[?|p-\d|px-\d|py-\d|pt-\d|pb-\d|pl-\d|pr-\d/.test(line)) {
      const rel = path.relative('d:/rishi/thestartupmap', filePath);
      console.log(`${rel}:${idx + 1}: ${line.trim()}`);
    }
  });
});
