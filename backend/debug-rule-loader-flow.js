const fs = require('fs').promises;
const path = require('path');

// Copy the exact functions from ruleLoader.js to debug them
async function tryLoadWikiEmRules(topic) {
  console.log(`🔍 tryLoadWikiEmRules called with topic: ${topic}`);
  
  try {
    // Look for WikiEM rule packs in the var/rulepacks directory
    const rulePacksDir = path.join(__dirname, 'src', 'rule-engine', '..', '..', 'var', 'rulepacks');
    console.log(`📁 Looking in directory: ${rulePacksDir}`);
    
    if (!require('fs').existsSync(rulePacksDir)) {
      console.log('❌ Directory does not exist');
      return {
        success: false,
        coverage: 'none',
        source: 'core-em-wikem',
        message: `WikiEM rule packs directory not found`
      };
    }
    console.log('✅ Directory exists');

    // Look for topic-specific rule packs first
    const topicRulePackPath = path.join(rulePacksDir, `${topic}.json`);
    console.log(`📁 Looking for file: ${topicRulePackPath}`);
    
    if (require('fs').existsSync(topicRulePackPath)) {
      console.log('✅ File exists, trying to read...');
      try {
        const rulePackData = await fs.readFile(topicRulePackPath, 'utf8');
        const rulePack = JSON.parse(rulePackData);
        console.log('✅ File read and parsed successfully');
        
        // Determine coverage level
        const coverage = determineCoverageLevel(rulePack);
        console.log(`📊 Coverage determined: ${coverage}`);
        
        return {
          success: true,
          rulePack,
          coverage,
          source: 'core-em-wikem',
          message: `WikiEM rule pack loaded successfully for topic: ${topic}`
        };
      } catch (error) {
        console.error(`❌ Error loading WikiEM rule pack for topic ${topic}:`, error);
      }
    } else {
      console.log('❌ File not found');
    }
    
    console.log('🔄 Falling back to findWikiEmRulePacksForTopic...');
    // Fallback: Find the most recent WikiEM rule pack for this topic
    const topicRulePacks = await findWikiEmRulePacksForTopic(rulePacksDir, topic);
    
    if (topicRulePacks.length === 0) {
      console.log('❌ No rule packs found via fallback');
      return {
        success: false,
        coverage: 'none',
        source: 'core-em-wikem',
        message: `No WikiEM rule pack found for topic: ${topic}`
      };
    }

    console.log('✅ Found rule packs via fallback, loading latest...');
    // Load the most recent rule pack
    const latestRulePack = topicRulePacks[0];
    const rulePackData = await fs.readFile(latestRulePack.path, 'utf8');
    const rulePack = JSON.parse(rulePackData);

    // Determine coverage level
    const coverage = determineCoverageLevel(rulePack);

    return {
      success: true,
      rulePack,
      coverage,
      source: 'core-em-wikem',
      message: `WikiEM rule pack loaded successfully for topic: ${topic}`
    };

  } catch (error) {
    console.error(`❌ Error in tryLoadWikiEmRules for topic ${topic}:`, error);
    return {
      success: false,
      coverage: 'none',
      source: 'core-em-wikem',
      message: `Error loading WikiEM rules: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function findWikiEmRulePacksForTopic(rulePacksDir, topic) {
  console.log(`🔍 findWikiEmRulePacksForTopic called with dir: ${rulePacksDir}, topic: ${topic}`);
  
  try {
    const files = await fs.readdir(rulePacksDir);
    console.log(`📋 Files in directory:`, files);
    const topicRulePacks = [];

    for (const file of files) {
      if (file.startsWith('core-em-wikem-') && file.endsWith('.json')) {
        console.log(`🔍 Checking file: ${file}`);
        const filePath = path.join(rulePacksDir, file);
        
        try {
          const rulePackData = await fs.readFile(filePath, 'utf8');
          const rulePack = JSON.parse(rulePackData);
          
          // Check if this rule pack contains the topic
          if (rulePack.metadata?.topics?.includes(topic)) {
            const date = rulePack.metadata.updatedAt || rulePack.metadata.createdAt || '1970-01-01';
            topicRulePacks.push({ path: filePath, date });
            console.log(`✅ Found matching rule pack: ${file}`);
          }
        } catch (error) {
          console.warn(`⚠️ Error reading rule pack file ${file}:`, error);
        }
      }
    }

    console.log(`📊 Total matching rule packs found: ${topicRulePacks.length}`);
    // Sort by date (newest first)
    return topicRulePacks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  } catch (error) {
    console.error(`❌ Error in findWikiEmRulePacksForTopic:`, error);
    return [];
  }
}

function determineCoverageLevel(rulePack) {
  if (!rulePack.metadata || !rulePack.rules) {
    return 'none';
  }

  const totalRules = rulePack.rules.length;
  const coverage = rulePack.metadata.coverage;

  // If coverage map exists, use it
  if (coverage && Object.keys(coverage).length > 0) {
    const coverageValues = Object.values(coverage);
    if (coverageValues.includes('full')) return 'full';
    if (coverageValues.includes('partial')) return 'partial';
    if (coverageValues.includes('minimal')) return 'minimal';
  }

  // Fallback to rule count-based coverage
  if (totalRules >= 20) return 'full';
  if (totalRules >= 10) return 'partial';
  if (totalRules >= 5) return 'minimal';
  
  return 'none';
}

async function debugRuleLoaderFlow() {
  console.log('🔍 DEBUGGING RULE LOADER FLOW\n');
  
  try {
    const result = await tryLoadWikiEmRules('chest_pain');
    console.log('\n🎯 FINAL RESULT:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('🎉 SUCCESS! Rule pack loaded');
    } else {
      console.log('❌ FAILED! Rule pack not loaded');
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

debugRuleLoaderFlow();
