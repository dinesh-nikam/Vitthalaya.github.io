const fs = require('fs');
const content = fs.readFileSync('src/lib/assets-registry.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes("id: 'w1'") || line.includes("id: 'p17'") || line.includes("id: 'f18'") || line.includes("id: 's13'")) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
    // print surrounding lines
    for (let j = Math.max(0, i - 1); j <= Math.min(lines.length - 1, i + 8); j++) {
      console.log(`  ${j + 1}: ${lines[j]}`);
    }
  }
});
