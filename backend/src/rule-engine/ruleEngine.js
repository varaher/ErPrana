const { loadRulePack } = require('./ruleLoader');

/**
 * Rule Engine for Medical Triage
 * Processes patient data against loaded rule packs to determine triage level
 */

/**
 * Process patient data through the rule engine
 * @param {Object} patientData - Patient symptoms and vital signs
 * @param {string} topic - Medical topic (e.g., 'Chest_pain', 'Stroke')
 * @returns {Object} TriageResult with triage level and reasoning
 */
async function processTriage(patientData, topic) {
  try {
    // Load the appropriate rule pack for the topic
    const rulePackResult = await loadRulePack(topic);
    
    if (!rulePackResult.success) {
      return {
        success: false,
        triageLevel: 'web-fallback-needed',
        source: rulePackResult.source,
        message: rulePackResult.message,
        coverage: rulePackResult.coverage
      };
    }

    // Process patient data against the loaded rules
    const triageResult = await evaluateRules(patientData, rulePackResult.rulePack);
    
    return {
      success: true,
      triageLevel: triageResult.triageLevel,
      confidence: triageResult.confidence,
      reasoning: triageResult.reasoning,
      source: rulePackResult.source,
      coverage: rulePackResult.coverage,
      rulesApplied: triageResult.rulesApplied
    };

  } catch (error) {
    console.error(`Error processing triage for topic ${topic}:`, error);
    return {
      success: false,
      triageLevel: 'web-fallback-needed',
      source: 'error',
      message: `Error processing triage: ${error instanceof Error ? error.message : 'Unknown error'}`,
      coverage: 'none'
    };
  }
}

/**
 * Evaluate patient data against loaded rules
 * @param {Object} patientData - Patient symptoms and vital signs
 * @param {Object} rulePack - Loaded rule pack
 * @returns {Object} Evaluation result with triage level and reasoning
 */
async function evaluateRules(patientData, rulePack) {
  const applicableRules = [];
  const triageScores = {
    'immediate': 0,
    'emergency': 0,
    'urgent': 0,
    'routine': 0
  };

  // Process each rule in the rule pack
  for (const rule of rulePack.rules) {
    if (await isRuleApplicable(patientData, rule)) {
      applicableRules.push(rule);
      
      // Apply rule scoring
      const ruleScore = calculateRuleScore(rule, patientData);
      if (ruleScore > 0) {
        triageScores[rule.triageLevel] += ruleScore;
      }
    }
  }

  // Determine final triage level based on scores
  const triageLevel = determineTriageLevel(triageScores);
  const confidence = calculateConfidence(applicableRules, triageScores);
  const reasoning = generateReasoning(applicableRules, triageLevel);

  return {
    triageLevel,
    confidence,
    reasoning,
    rulesApplied: applicableRules.length
  };
}

/**
 * Check if a rule is applicable to the patient data
 * @param {Object} patientData - Patient symptoms and vital signs
 * @param {Object} rule - Rule to evaluate
 * @returns {boolean} Whether the rule applies
 */
async function isRuleApplicable(patientData, rule) {
  try {
    // Check if all required conditions are met
    for (const condition of rule.conditions) {
      if (!await evaluateCondition(patientData, condition)) {
        return false;
      }
    }
    return true;
  } catch (error) {
    console.warn(`Error evaluating rule ${rule.id}:`, error);
    return false;
  }
}

/**
 * Evaluate a single condition against patient data
 * @param {Object} patientData - Patient data
 * @param {Object} condition - Condition to evaluate
 * @returns {boolean} Whether condition is met
 */
async function evaluateCondition(patientData, condition) {
  const { field, operator, value, comparison } = condition;
  
  if (!patientData.hasOwnProperty(field)) {
    return false;
  }

  const patientValue = patientData[field];
  
  switch (operator) {
    case 'equals':
      return patientValue === value;
    
    case 'not_equals':
      return patientValue !== value;
    
    case 'greater_than':
      return typeof patientValue === 'number' && patientValue > value;
    
    case 'less_than':
      return typeof patientValue === 'number' && patientValue < value;
    
    case 'greater_than_or_equal':
      return typeof patientValue === 'number' && patientValue >= value;
    
    case 'less_than_or_equal':
      return typeof patientValue === 'number' && patientValue <= value;
    
    case 'contains':
      return typeof patientValue === 'string' && patientValue.includes(value);
    
    case 'not_contains':
      return typeof patientValue === 'string' && !patientValue.includes(value);
    
    case 'in_range':
      return typeof patientValue === 'number' && patientValue >= value.min && patientValue <= value.max;
    
    case 'not_in_range':
      return typeof patientValue === 'number' && (patientValue < value.min || patientValue > value.max);
    
    case 'exists':
      return patientValue !== null && patientValue !== undefined;
    
    case 'not_exists':
      return patientValue === null || patientValue === undefined;
    
    default:
      console.warn(`Unknown operator: ${operator}`);
      return false;
  }
}

/**
 * Calculate the score for a rule based on patient data
 * @param {Object} rule - The rule to score
 * @param {Object} patientData - Patient data
 * @returns {number} Rule score
 */
function calculateRuleScore(rule, patientData) {
  let score = rule.baseScore || 1;
  
  // Apply modifiers based on patient data
  if (rule.modifiers) {
    for (const modifier of rule.modifiers) {
      if (patientData[modifier.field] !== undefined) {
        const value = patientData[modifier.field];
        
        if (modifier.type === 'multiplier') {
          score *= modifier.value;
        } else if (modifier.type === 'adder') {
          score += modifier.value;
        } else if (modifier.type === 'threshold') {
          if (value >= modifier.threshold) {
            score *= modifier.multiplier || 1;
          }
        }
      }
    }
  }
  
  return Math.max(0, score);
}

/**
 * Determine final triage level based on scores
 * @param {Object} triageScores - Scores for each triage level
 * @returns {string} Final triage level
 */
function determineTriageLevel(triageScores) {
  // Find the level with the highest score
  let maxScore = 0;
  let triageLevel = 'routine';
  
  for (const [level, score] of Object.entries(triageScores)) {
    if (score > maxScore) {
      maxScore = score;
      triageLevel = level;
    }
  }
  
  // Apply priority rules (higher levels override lower ones)
  if (triageScores.immediate > 0) return 'immediate';
  if (triageScores.emergency > 0) return 'emergency';
  if (triageScores.urgent > 0) return 'urgent';
  
  return triageLevel;
}

/**
 * Calculate confidence level based on rules applied and scores
 * @param {Array} applicableRules - Rules that were applied
 * @param {Object} triageScores - Triage level scores
 * @returns {string} Confidence level
 */
function calculateConfidence(applicableRules, triageScores) {
  if (applicableRules.length === 0) {
    return 'none';
  }
  
  const totalScore = Object.values(triageScores).reduce((sum, score) => sum + score, 0);
  const maxPossibleScore = applicableRules.length * 10; // Assuming max score per rule is 10
  
  const confidenceRatio = totalScore / maxPossibleScore;
  
  if (confidenceRatio >= 0.8) return 'high';
  if (confidenceRatio >= 0.6) return 'medium';
  if (confidenceRatio >= 0.4) return 'low';
  return 'very_low';
}

/**
 * Generate reasoning for the triage decision
 * @param {Array} applicableRules - Rules that were applied
 * @param {string} triageLevel - Final triage level
 * @returns {string} Reasoning text
 */
function generateReasoning(applicableRules, triageLevel) {
  if (applicableRules.length === 0) {
    return 'No applicable rules found for patient data.';
  }
  
  const ruleDescriptions = applicableRules.map(rule => rule.description || rule.id);
  const topRules = ruleDescriptions.slice(0, 3); // Top 3 most relevant rules
  
  return `Triage level ${triageLevel} determined based on ${applicableRules.length} applicable rules. Key factors: ${topRules.join(', ')}.`;
}

module.exports = {
  processTriage,
  evaluateRules,
  isRuleApplicable,
  evaluateCondition,
  calculateRuleScore,
  determineTriageLevel,
  calculateConfidence,
  generateReasoning
};
