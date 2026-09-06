const fs = require('fs');
const path = require('path');

function walk(dir, results = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath, results);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = walk('d:/rishi/thestartupmap/src');
console.log('--- Searching for tweet_url / tweetUrl / Proof ---');

files.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (/tweet_url|tweetUrl|Proof|tweet-url|proof-tweet/i.test(line)) {
      const rel = path.relative('d:/rishi/thestartupmap', filePath);
      console.log(`${rel}:${idx + 1}: ${line.trim()}`);
    }
  });
});
