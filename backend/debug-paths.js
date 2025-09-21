const path = require('path');
const fs = require('fs');

console.log('🔍 Debugging Rule Pack Paths...\n');

// Check current working directory
console.log('📁 Current working directory:', process.cwd());

// Check __dirname from ruleLoader
const ruleLoaderDir = path.join(__dirname, 'src', 'rule-engine');
console.log('📁 RuleLoader __dirname:', ruleLoaderDir);

// Check the path we're constructing
const rulePacksDir = path.join(ruleLoaderDir, '..', '..', 'var', 'rulepacks');
console.log('📁 Constructed rulePacksDir:', rulePacksDir);

// Check if the directory exists
console.log('📁 Directory exists?', fs.existsSync(rulePacksDir));

// Check what's in the var directory
const varDir = path.join(__dirname, 'var');
console.log('📁 var directory exists?', fs.existsSync(varDir));

if (fs.existsSync(varDir)) {
  console.log('📁 Contents of var directory:', fs.readdirSync(varDir));
}

// Check what's in the rulepacks directory
const rulePacksDir2 = path.join(__dirname, 'var', 'rulepacks');
console.log('📁 rulepacks directory exists?', fs.existsSync(rulePacksDir2));

if (fs.existsSync(rulePacksDir2)) {
  console.log('📁 Contents of rulepacks directory:', fs.readdirSync(rulePacksDir2));
  
  // Check what's in core-em-wikem
  const wikemDir = path.join(rulePacksDir2, 'core-em-wikem');
  if (fs.existsSync(wikemDir)) {
    console.log('📁 Contents of core-em-wikem directory:', fs.readdirSync(wikemDir));
  }
}

// Check the exact path we need
const exactPath = path.join(__dirname, 'var', 'rulepacks', 'core-em-wikem', 'chest_pain.json');
console.log('📁 Exact path to chest_pain.json:', exactPath);
console.log('📁 File exists?', fs.existsSync(exactPath));
