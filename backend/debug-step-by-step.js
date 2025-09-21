const fs = require('fs').promises;
const path = require('path');

async function debugStepByStep() {
  console.log('🔍 FIRST PRINCIPLES DEBUG: Step by Step\n');

  // STEP 1: Verify the file exists
  console.log('📋 STEP 1: Verify file exists');
  const filePath = path.join(__dirname, 'var', 'rulepacks', 'core-em-wikem', 'chest_pain.json');
  console.log('📁 File path:', filePath);
  
  try {
    const stats = await fs.stat(filePath);
    console.log('✅ File exists, size:', stats.size, 'bytes');
  } catch (error) {
    console.log('❌ File not found:', error.message);
    return;
  }

  // STEP 2: Try to read the file
  console.log('\n📋 STEP 2: Try to read file');
  try {
    const fileContent = await fs.readFile(filePath, 'utf8');
    console.log('✅ File read successfully, length:', fileContent.length);
    
    // STEP 3: Try to parse JSON
    console.log('\n📋 STEP 3: Try to parse JSON');
    const rulePack = JSON.parse(fileContent);
    console.log('✅ JSON parsed successfully');
    console.log('📊 Metadata:', rulePack.metadata?.name);
    console.log('📋 Rules count:', rulePack.rules?.length);
    
    // STEP 4: Check if this matches our topic
    console.log('\n📋 STEP 4: Check topic matching');
    const topic = 'chest_pain';
    const topics = rulePack.metadata?.topics || [];
    console.log('🔍 Looking for topic:', topic);
    console.log('📋 Available topics:', topics);
    console.log('✅ Topic found?', topics.includes(topic));
    
    // STEP 5: Check coverage calculation
    console.log('\n📋 STEP 5: Check coverage calculation');
    const totalRules = rulePack.rules?.length || 0;
    const coverage = rulePack.metadata?.coverage;
    console.log('📊 Total rules:', totalRules);
    console.log('📋 Coverage metadata:', coverage);
    
    // Simulate the coverage logic
    let calculatedCoverage = 'none';
    if (coverage && Object.keys(coverage).length > 0) {
      const coverageValues = Object.values(coverage);
      if (coverageValues.includes('full')) calculatedCoverage = 'full';
      else if (coverageValues.includes('partial')) calculatedCoverage = 'partial';
      else if (coverageValues.includes('minimal')) calculatedCoverage = 'minimal';
    } else if (totalRules >= 20) calculatedCoverage = 'full';
    else if (totalRules >= 10) calculatedCoverage = 'partial';
    else if (totalRules >= 5) calculatedCoverage = 'minimal';
    
    console.log('✅ Calculated coverage:', calculatedCoverage);
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  // STEP 6: Check the exact path construction
  console.log('\n📋 STEP 6: Check path construction');
  const ruleLoaderDir = path.join(__dirname, 'src', 'rule-engine');
  const constructedPath = path.join(ruleLoaderDir, '..', '..', 'var', 'rulepacks');
  console.log('📁 RuleLoader dir:', ruleLoaderDir);
  console.log('📁 Constructed path:', constructedPath);
  console.log('📁 Path exists?', require('fs').existsSync(constructedPath));
  
  // STEP 7: Check what's in the constructed directory
  console.log('\n📋 STEP 7: Check constructed directory contents');
  try {
    const contents = await fs.readdir(constructedPath);
    console.log('📋 Contents:', contents);
    
    if (contents.includes('core-em-wikem')) {
      const wikemContents = await fs.readdir(path.join(constructedPath, 'core-em-wikem'));
      console.log('📋 core-em-wikem contents:', wikemContents);
    }
  } catch (error) {
    console.log('❌ Error reading directory:', error.message);
  }
}

debugStepByStep();
