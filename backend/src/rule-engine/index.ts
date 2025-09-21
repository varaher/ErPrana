/**
 * Rule Engine - Emergency Medicine Knowledge Base
 * Loads and manages rule packs with priority-based fallback system
 */

export { loadRulePack } from './ruleLoader';
export { RuleEngine } from './ruleEngine';
export { RulePack, RulePackRule, RuleEffect, RuleMetadata, Citation } from '../sources/wikem/parse';
export { CoverageMap } from '../sources/wikem/parse';

// Re-export types for convenience
export type { RulePack as IRulePack, RulePackRule as IRulePackRule } from '../sources/wikem/parse';
