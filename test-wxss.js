const fs = require('fs');
const path = require('path');

function checkWxss(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Strip comments
  content = content.replace(/\/\*[\s\S]*?\*\//g, '');
  
  let openBraces = (content.match(/\{/g) || []).length;
  let closeBraces = (content.match(/\}/g) || []).length;
  
  let errors = [];
  if (openBraces !== closeBraces) {
    errors.push(`Braces mismatch: open=${openBraces}, close=${closeBraces}`);
  }
  
  let depth = 0;
  let lines = content.split('\n');
  let currentLine = 1;
  
  for (let i = 0; i < content.length; i++) {
    let char = content[i];
    if (char === '\n') {
      currentLine++;
    }
    if (char === '{') {
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth < 0) {
        errors.push(`Unexpected closing brace '}' around line ${currentLine}`);
        depth = 0; // reset
      }
    }
  }
  
  if (depth > 0) {
    errors.push(`Unclosed open brace(s) remaining: depth=${depth}`);
  }
  
  return errors;
}

function walk(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walk(filePath, callback);
    } else if (filePath.endsWith('.wxss')) {
      callback(filePath);
    }
  }
}

function main() {
  const rootDir = path.join(__dirname, "miniprogram");
  const allErrors = {};
  
  walk(rootDir, (filePath) => {
    const errors = checkWxss(filePath);
    if (errors.length > 0) {
      const relPath = path.relative(rootDir, filePath);
      allErrors[relPath] = errors;
    }
  });
  
  if (Object.keys(allErrors).length > 0) {
    console.log("Found WXSS syntax issues:");
    for (const [relPath, errs] of Object.entries(allErrors)) {
      console.log(`\n[${relPath}]`);
      for (const err of errs) {
        console.log(`  - {err}`);
      }
    }
    process.exit(1);
  } else {
    console.log("No WXSS syntax issues found.");
  }
}

main();
