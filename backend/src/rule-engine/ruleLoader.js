const fs = require('fs');
const path = require('path');

/**
 * Rule Pack Loading Priority:
 * 1. Try 'core-em' (books) if active for topic
 * 2. Else try 'core-em-wikem'
 * 3. Else coverage='none' -> return web-fallback-needed (no triage downgrade)
 */

/**
 * Load rule pack with priority-based fallback
 * @param {string} topic - The medical topic (e.g., 'Chest_pain', 'Stroke')
 * @returns {Object} RuleLoadResult with the best available rule pack
 */
async function loadRulePack(topic) {
  try {
    // Normalize topic to match file naming convention
    const normalizedTopic = topic.replace(/\s+/g, '_').toLowerCase();
    
    // Priority 1: Try 'core-em' (books) if active for topic
    const coreEmResult = await tryLoadCoreEmRules(normalizedTopic);
    if (coreEmResult.success && coreEmResult.coverage !== 'none') {
      return {
        ...coreEmResult,
        source: 'core-em'
      };
    }

    // Priority 2: Try 'core-em-wikem'
    const wikiEmResult = await tryLoadWikiEmRules(normalizedTopic);
    if (wikiEmResult.success && wikiEmResult.coverage !== 'none') {
      return {
        ...wikiEmResult,
        source: 'core-em-wikem'
      };
    }

    // Priority 3: No coverage available -> return web-fallback-needed
    return {
      success: false,
      coverage: 'none',
      source: 'web-fallback-needed',
      message: `No rule pack available for topic: ${topic}. Web-based fallback required.`
    };

  } catch (error) {
    console.error(`Error loading rule pack for topic ${topic}:`, error);
    return {
      success: false,
      coverage: 'none',
      source: 'web-fallback-needed',
      message: `Error loading rule pack: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Try to load core-em (books) rules for a topic
 * @param {string} topic - Normalized topic name
 * @returns {Object} RuleLoadResult
 */
async function tryLoadCoreEmRules(topic) {
  try {
    const rulePackPath = path.join(process.cwd(), 'var', 'rulepacks', 'core-em', `${topic}.json`);
    
    if (!fs.existsSync(rulePackPath)) {
      return {
        success: false,
        coverage: 'none',
        source: 'core-em',
        message: `Core-EM rule pack not found for topic: ${topic}`
      };
    }

    const rulePackData = await fs.promises.readFile(rulePackPath, 'utf8');
    const rulePack = JSON.parse(rulePackData);

    // Check if rule pack is active
    if (!rulePack.metadata || rulePack.metadata.totalRules === 0) {
      return {
        success: false,
        coverage: 'none',
        source: 'core-em',
        message: `Core-EM rule pack inactive for topic: ${topic}`
      };
    }

    // Determine coverage level
    const coverage = determineCoverageLevel(rulePack);

    return {
      success: true,
      rulePack,
      coverage,
      source: 'core-em',
      message: `Core-EM rule pack loaded successfully for topic: ${topic}`
    };

  } catch (error) {
    console.error(`Error loading core-em rules for topic ${topic}:`, error);
    return {
      success: false,
      coverage: 'none',
      source: 'core-em',
      message: `Error loading core-em rules: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Try to load WikiEM rules for a topic
 * @param {string} topic - Normalized topic name
 * @returns {Object} RuleLoadResult
 */
async function tryLoadWikiEmRules(topic) {
  try {
    // Look for WikiEM rule packs in the var/rulepacks directory
    const rulePacksDir = path.join(__dirname, '..', '..', 'var', 'rulepacks');
    
    if (!fs.existsSync(rulePacksDir)) {
      return {
        success: false,
        coverage: 'none',
        source: 'core-em-wikem',
        message: `WikiEM rule packs directory not found`
      };
    }

             // Look for topic-specific rule packs first in core-em-wikem subdirectory
    const topicRulePackPath = path.join(rulePacksDir, 'core-em-wikem', `${topic}.json`);
     
     if (fs.existsSync(topicRulePackPath)) {
       try {
         const rulePackData = await fs.promises.readFile(topicRulePackPath, 'utf8');
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
         console.error(`Error loading WikiEM rule pack for topic ${topic}:`, error);
       }
     }
     
     // Fallback: Find the most recent WikiEM rule pack for this topic
     const topicRulePacks = await findWikiEmRulePacksForTopic(rulePacksDir, topic);
     
     if (topicRulePacks.length === 0) {
       return {
         success: false,
         coverage: 'none',
         source: 'core-em-wikem',
         message: `No WikiEM rule pack found for topic: ${topic}`
       };
     }

    // Load the most recent rule pack
    const latestRulePack = topicRulePacks[0];
    const rulePackData = await fs.promises.readFile(latestRulePack.path, 'utf8');
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
    console.error(`Error loading WikiEM rules for topic ${topic}:`, error);
    return {
      success: false,
      coverage: 'none',
      source: 'core-em-wikem',
      message: `Error loading WikiEM rules: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Find WikiEM rule packs for a specific topic
 * @param {string} rulePacksDir - Directory containing rule packs
 * @param {string} topic - Topic to search for
 * @returns {Array} Array of rule pack info sorted by date (newest first)
 */
async function findWikiEmRulePacksForTopic(rulePacksDir, topic) {
  try {
    const files = await fs.promises.readdir(rulePacksDir);
    const topicRulePacks = [];

    for (const file of files) {
      if (file.startsWith('core-em-wikem-') && file.endsWith('.json')) {
        const filePath = path.join(rulePacksDir, file);
        
        try {
          const rulePackData = await fs.promises.readFile(filePath, 'utf8');
          const rulePack = JSON.parse(rulePackData);
          
          // Check if this rule pack contains the topic
          if (rulePack.metadata?.topics?.includes(topic)) {
            const date = rulePack.metadata.updatedAt || rulePack.metadata.createdAt || '1970-01-01';
            topicRulePacks.push({ path: filePath, date });
          }
        } catch (error) {
          console.warn(`Error reading rule pack file ${file}:`, error);
        }
      }
    }

    // Sort by date (newest first)
    return topicRulePacks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  } catch (error) {
    console.error(`Error finding WikiEM rule packs for topic ${topic}:`, error);
    return [];
  }
}

/**
 * Determine coverage level based on rule pack metadata
 * @param {Object} rulePack - The rule pack to evaluate
 * @returns {string} Coverage level
 */
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

module.exports = {
  loadRulePack,
  determineCoverageLevel
};

