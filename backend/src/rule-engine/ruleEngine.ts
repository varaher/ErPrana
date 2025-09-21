import { loadRulePack, RuleLoadResult } from './ruleLoader';
import { RulePack, RulePackRule } from '../sources/wikem/parse';

/**
 * Main Rule Engine for Emergency Medicine Triage
 * Integrates rule packs with clinical decision making
 */
export class RuleEngine {
  private static instance: RuleEngine;
  private ruleCache: Map<string, RuleLoadResult> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  /**
   * Get singleton instance of RuleEngine
   */
  public static getInstance(): RuleEngine {
    if (!RuleEngine.instance) {
      RuleEngine.instance = new RuleEngine();
    }
    return RuleEngine.instance;
  }

  /**
   * Load rule pack for a topic with caching
   * @param topic - Medical topic (e.g., 'Chest_pain', 'Stroke')
   * @param forceRefresh - Force refresh cache
   * @returns RuleLoadResult
   */
  public async loadRulePack(topic: string, forceRefresh: boolean = false): Promise<RuleLoadResult> {
    const cacheKey = topic.toLowerCase();
    const now = Date.now();

    // Check cache if not forcing refresh
    if (!forceRefresh && this.ruleCache.has(cacheKey)) {
      const expiry = this.cacheExpiry.get(cacheKey) || 0;
      if (now < expiry) {
        const cached = this.ruleCache.get(cacheKey)!;
        console.log(`Rule pack cache hit for topic: ${topic}`);
        return cached;
      }
    }

    // Load rule pack with priority-based fallback
    console.log(`Loading rule pack for topic: ${topic}`);
    const result = await loadRulePack(topic);

    // Cache the result
    this.ruleCache.set(cacheKey, result);
    this.cacheExpiry.set(cacheKey, now + this.CACHE_TTL);

    console.log(`Rule pack loaded for topic: ${topic}, source: ${result.source}, coverage: ${result.coverage}`);
    return result;
  }

  /**
   * Apply rules to clinical assessment data
   * @param topic - Medical topic
   * @param assessmentData - Clinical assessment data (ABCDE, vitals, etc.)
   * @returns Applied rules and recommendations
   */
  public async applyRules(topic: string, assessmentData: any): Promise<{
    success: boolean;
    rules: RulePackRule[];
    recommendations: any[];
    coverage: string;
    source: string;
    message: string;
  }> {
    try {
      // Load rule pack for the topic
      const ruleLoadResult = await this.loadRulePack(topic);
      
      if (!ruleLoadResult.success || !ruleLoadResult.rulePack) {
        return {
          success: false,
          rules: [],
          recommendations: [],
          coverage: ruleLoadResult.coverage,
          source: ruleLoadResult.source,
          message: ruleLoadResult.message
        };
      }

      const rulePack = ruleLoadResult.rulePack;
      const applicableRules = this.findApplicableRules(rulePack.rules, assessmentData);
      const recommendations = this.generateRecommendations(applicableRules, assessmentData);

      return {
        success: true,
        rules: applicableRules,
        recommendations,
        coverage: ruleLoadResult.coverage,
        source: ruleLoadResult.source,
        message: `Applied ${applicableRules.length} rules from ${ruleLoadResult.source}`
      };

    } catch (error) {
      console.error(`Error applying rules for topic ${topic}:`, error);
      return {
        success: false,
        rules: [],
        recommendations: [],
        coverage: 'none',
        source: 'web-fallback-needed',
        message: `Error applying rules: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Find rules that apply to the current assessment data
   * @param rules - Array of rule pack rules
   * @param assessmentData - Clinical assessment data
   * @returns Array of applicable rules
   */
  private findApplicableRules(rules: RulePackRule[], assessmentData: any): RulePackRule[] {
    return rules.filter(rule => {
      // Simple rule matching based on conditions
      // In a real implementation, this would use a more sophisticated rule engine
      if (!rule.conditions || rule.conditions.length === 0) {
        return true; // Rule with no conditions always applies
      }

      // Check if any conditions match the assessment data
      return rule.conditions.some(condition => {
        // This is a simplified condition checker
        // In practice, you'd want a more sophisticated condition evaluation engine
        return this.evaluateCondition(condition, assessmentData);
      });
    });
  }

  /**
   * Evaluate a single condition against assessment data
   * @param condition - Rule condition string
   * @param assessmentData - Clinical assessment data
   * @returns True if condition is met
   */
  private evaluateCondition(condition: string, assessmentData: any): boolean {
    // This is a simplified condition evaluator
    // In practice, you'd want a proper condition language parser
    
    const conditionLower = condition.toLowerCase();
    
    // Check for common emergency conditions
    if (conditionLower.includes('chest pain') && assessmentData.socrates?.site?.includes('chest')) {
      return true;
    }
    
    if (conditionLower.includes('shortness of breath') && assessmentData.abcde?.breathing?.distress) {
      return true;
    }
    
    if (conditionLower.includes('hypotension') && assessmentData.vitals?.sbp < 90) {
      return true;
    }
    
    if (conditionLower.includes('tachycardia') && assessmentData.vitals?.hr > 100) {
      return true;
    }
    
    if (conditionLower.includes('fever') && assessmentData.vitals?.temp > 38) {
      return true;
    }
    
    if (conditionLower.includes('hypoxia') && assessmentData.vitals?.spo2 < 95) {
      return true;
    }
    
    // Default: condition not met
    return false;
  }

  /**
   * Generate recommendations based on applicable rules
   * @param rules - Applicable rules
   * @param assessmentData - Clinical assessment data
   * @returns Array of recommendations
   */
  private generateRecommendations(rules: RulePackRule[], assessmentData: any): any[] {
    const recommendations: any[] = [];

    rules.forEach(rule => {
      if (rule.effects && rule.effects.length > 0) {
        rule.effects.forEach(effect => {
          recommendations.push({
            ruleId: rule.id,
            ruleName: rule.name,
            priority: rule.priority,
            triage: effect.triage,
            advice: effect.advice,
            action: effect.action,
            urgency: effect.urgency,
            confidence: this.calculateConfidence(rule, assessmentData)
          });
        });
      }
    });

    // Sort by priority and confidence
    return recommendations.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return b.confidence - a.confidence;
    });
  }

  /**
   * Calculate confidence score for a rule based on assessment data
   * @param rule - The rule to evaluate
   * @param assessmentData - Clinical assessment data
   * @returns Confidence score (0-1)
   */
  private calculateConfidence(rule: RulePackRule, assessmentData: any): number {
    if (!rule.conditions || rule.conditions.length === 0) {
      return 0.5; // Default confidence for rules without conditions
    }

    let matchedConditions = 0;
    rule.conditions.forEach(condition => {
      if (this.evaluateCondition(condition, assessmentData)) {
        matchedConditions++;
      }
    });

    return matchedConditions / rule.conditions.length;
  }

  /**
   * Clear rule cache
   */
  public clearCache(): void {
    this.ruleCache.clear();
    this.cacheExpiry.clear();
    console.log('Rule engine cache cleared');
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; hitRate: number } {
    const size = this.ruleCache.size;
    // This is a simplified hit rate calculation
    const hitRate = size > 0 ? 0.8 : 0; // Placeholder
    
    return { size, hitRate };
  }

  /**
   * Check if a topic has rule coverage
   * @param topic - Medical topic
   * @returns Coverage information
   */
  public async checkCoverage(topic: string): Promise<{
    hasCoverage: boolean;
    source: string;
    coverage: string;
    message: string;
  }> {
    const result = await this.loadRulePack(topic);
    
    return {
      hasCoverage: result.success && result.coverage !== 'none',
      source: result.source,
      coverage: result.coverage,
      message: result.message
    };
  }
}
