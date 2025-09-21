import { WikiEMScrapedData, WikiEMSection } from './scrape';
import { mapTopicToChiefComplaint, ChiefComplaint } from '../../clinical/maps/chiefComplaintMap';

export interface RulePackRule {
  id: string;
  name: string;
  description?: string;
  conditions: string[];
  effects: RuleEffect[];
  priority: number;
  metadata: RuleMetadata;
}

export interface RuleEffect {
  triage: 'Red' | 'Orange' | 'Yellow' | 'Green';
  advice: string;
  action?: string;
  urgency?: 'Immediate' | 'Urgent' | 'Routine';
}

export interface RuleMetadata {
  source: string;
  citation: Citation;
  tags: string[];
  confidence: 'High' | 'Medium' | 'Low';
  lastUpdated: string;
}

export interface Citation {
  id: string;
  source: string;
  url: string;
  level: 'Consensus' | 'Guideline' | 'Evidence' | 'Expert';
  authors?: string[];
  year?: number;
}

export interface RulePack {
  id: string;
  name: string;
  version: string;
  description: string;
  rules: RulePackRule[];
  metadata: {
    source: string;
    topics: string[];
    totalRules: number;
    coverage: CoverageMap;
    createdAt: string;
    updatedAt: string;
  };
}

export interface CoverageMap {
  [chiefComplaint: string]: 'full' | 'partial' | 'minimal';
}

export class WikiEMParser {
  private version: string;
  private rulePackId: string;

  constructor(version?: string) {
    this.version = version || new Date().toISOString().split('T')[0];
    this.rulePackId = `core-em-wikem-${this.version}`;
  }

  public parseWikiEMData(scrapedData: WikiEMScrapedData): RulePack {
    const rules: RulePackRule[] = [];
    let ruleCounter = 1;

    // Parse red flags
    const redFlagRules = this.parseRedFlags(scrapedData, ruleCounter);
    rules.push(...redFlagRules);
    ruleCounter += redFlagRules.length;

    // Parse differential diagnosis
    const differentialRules = this.parseDifferentialDiagnosis(scrapedData, ruleCounter);
    rules.push(...differentialRules);
    ruleCounter += differentialRules.length;

    // Parse treatment guidelines
    const treatmentRules = this.parseTreatmentGuidelines(scrapedData, ruleCounter);
    rules.push(...treatmentRules);
    ruleCounter += treatmentRules.length;

    // Parse workup recommendations
    const workupRules = this.parseWorkupRecommendations(scrapedData, ruleCounter);
    rules.push(...workupRules);
    ruleCounter += workupRules.length;

    // Parse disposition guidelines
    const dispositionRules = this.parseDispositionGuidelines(scrapedData, ruleCounter);
    rules.push(...dispositionRules);
    ruleCounter += dispositionRules.length;

    const rulePack: RulePack = {
      id: this.rulePackId,
      name: `Core Emergency Medicine - WikiEM (${this.version})`,
      version: this.version,
      description: `Emergency medicine rules extracted from WikiEM for ${scrapedData.topic}`,
      rules,
      metadata: {
        source: 'WikiEM',
        topics: [scrapedData.topic],
        totalRules: rules.length,
        coverage: this.generateCoverageMap(scrapedData, rules),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    return rulePack;
  }

  private parseRedFlags(scrapedData: WikiEMScrapedData, startCounter: number): RulePackRule[] {
    const rules: RulePackRule[] = [];
    const redFlagSection = this.findSection(scrapedData.sections, 'Red Flags');

    if (!redFlagSection) return rules;

    const redFlagItems = this.extractListItems(redFlagSection.content);
    
    redFlagItems.forEach((item, index) => {
      if (item.trim()) {
        const rule: RulePackRule = {
          id: `${this.rulePackId}-red-${startCounter + index}`,
          name: `Red Flag: ${item.trim().substring(0, 50)}...`,
          description: item.trim(),
          conditions: [item.trim()],
          effects: [{
            triage: 'Red',
            advice: `Immediate attention required: ${item.trim()}`,
            action: 'Immediate evaluation',
            urgency: 'Immediate',
          }],
          priority: 1,
          metadata: this.createMetadata(scrapedData, 'red-flag'),
        };
        rules.push(rule);
      }
    });

    return rules;
  }

  private parseDifferentialDiagnosis(scrapedData: WikiEMScrapedData, startCounter: number): RulePackRule[] {
    const rules: RulePackRule[] = [];
    const diffSection = this.findSection(scrapedData.sections, 'Differential Diagnosis');

    if (!diffSection) return rules;

    const diffItems = this.extractListItems(diffSection.content);
    
    diffItems.forEach((item, index) => {
      if (item.trim()) {
        const rule: RulePackRule = {
          id: `${this.rulePackId}-diff-${startCounter + index}`,
          name: `Differential: ${item.trim().substring(0, 50)}...`,
          description: `Consider ${item.trim()} in differential diagnosis`,
          conditions: [item.trim()],
          effects: [{
            triage: 'Yellow',
            advice: `Consider ${item.trim()} in differential diagnosis`,
            action: 'Further evaluation',
            urgency: 'Routine',
          }],
          priority: 2,
          metadata: this.createMetadata(scrapedData, 'differential'),
        };
        rules.push(rule);
      }
    });

    return rules;
  }

  private parseTreatmentGuidelines(scrapedData: WikiEMScrapedData, startCounter: number): RulePackRule[] {
    const rules: RulePackRule[] = [];
    const treatmentSection = this.findSection(scrapedData.sections, 'Treatment');

    if (!treatmentSection) return rules;

    const treatmentItems = this.extractListItems(treatmentSection.content);
    
    treatmentItems.forEach((item, index) => {
      if (item.trim()) {
        const rule: RulePackRule = {
          id: `${this.rulePackId}-treatment-${startCounter + index}`,
          name: `Treatment: ${item.trim().substring(0, 50)}...`,
          description: item.trim(),
          conditions: [item.trim()],
          effects: [{
            triage: 'Green',
            advice: item.trim(),
            action: 'Follow treatment guidelines',
            urgency: 'Routine',
          }],
          priority: 3,
          metadata: this.createMetadata(scrapedData, 'treatment'),
        };
        rules.push(rule);
      }
    });

    return rules;
  }

  private parseWorkupRecommendations(scrapedData: WikiEMScrapedData, startCounter: number): RulePackRule[] {
    const rules: RulePackRule[] = [];
    const workupSection = this.findSection(scrapedData.sections, 'Workup');

    if (!workupSection) return rules;

    const workupItems = this.extractListItems(workupSection.content);
    
    workupItems.forEach((item, index) => {
      if (item.trim()) {
        const rule: RulePackRule = {
          id: `${this.rulePackId}-workup-${startCounter + index}`,
          name: `Workup: ${item.trim().substring(0, 50)}...`,
          description: item.trim(),
          conditions: [item.trim()],
          effects: [{
            triage: 'Yellow',
            advice: item.trim(),
            action: 'Order appropriate tests',
            urgency: 'Urgent',
          }],
          priority: 2,
          metadata: this.createMetadata(scrapedData, 'workup'),
        };
        rules.push(rule);
      }
    });

    return rules;
  }

  private parseDispositionGuidelines(scrapedData: WikiEMScrapedData, startCounter: number): RulePackRule[] {
    const rules: RulePackRule[] = [];
    const dispositionSection = this.findSection(scrapedData.sections, 'Disposition');

    if (!dispositionSection) return rules;

    const dispositionItems = this.extractListItems(dispositionSection.content);
    
    dispositionItems.forEach((item, index) => {
      if (item.trim()) {
        const rule: RulePackRule = {
          id: `${this.rulePackId}-disposition-${startCounter + index}`,
          name: `Disposition: ${item.trim().substring(0, 50)}...`,
          description: item.trim(),
          conditions: [item.trim()],
          effects: [{
            triage: 'Green',
            advice: item.trim(),
            action: 'Follow disposition guidelines',
            urgency: 'Routine',
          }],
          priority: 3,
          metadata: this.createMetadata(scrapedData, 'disposition'),
        };
        rules.push(rule);
      }
    });

    return rules;
  }

  private findSection(sections: WikiEMSection[], title: string): WikiEMSection | undefined {
    return sections.find(section => 
      section.title.toLowerCase().includes(title.toLowerCase()) ||
      title.toLowerCase().includes(section.title.toLowerCase())
    );
  }

  private extractListItems(content: string): string[] {
    const items: string[] = [];
    
    // Split by common list patterns
    const lines = content.split('\n');
    
    lines.forEach(line => {
      const trimmed = line.trim();
      
      // Match bullet points, numbered lists, or dash-separated items
      if (trimmed.match(/^[\-\*•]\s+/) || 
          trimmed.match(/^\d+\.\s+/) ||
          trimmed.match(/^[A-Z]\.\s+/)) {
        items.push(trimmed.replace(/^[\-\*•\d\.A-Z]\s+/, ''));
      } else if (trimmed.includes('•') || trimmed.includes('-')) {
        // Split by bullet points within a line
        const subItems = trimmed.split(/[•\-]/).map(item => item.trim()).filter(item => item);
        items.push(...subItems);
      } else if (trimmed.length > 10 && !trimmed.includes(':')) {
        // Consider longer lines without colons as potential items
        items.push(trimmed);
      }
    });

    return items.filter(item => item.length > 5); // Filter out very short items
  }

  private createMetadata(scrapedData: WikiEMScrapedData, ruleType: string): RuleMetadata {
    const citation: Citation = {
      id: `WIKIEM-${scrapedData.slug}`,
      source: 'WikiEM',
      url: scrapedData.url,
      level: 'Consensus',
      year: new Date().getFullYear(),
    };

    return {
      source: 'WikiEM',
      citation,
      tags: [ruleType, 'emergency-medicine', scrapedData.slug.toLowerCase()],
      confidence: 'Medium',
      lastUpdated: scrapedData.retrievedAt,
    };
  }

  private generateCoverageMap(scrapedData: WikiEMScrapedData, rules: RulePackRule[]): CoverageMap {
    const coverage: CoverageMap = {};
    
    // Map the topic slug to SNOMED chief complaint
    const chiefComplaint = mapTopicToChiefComplaint(scrapedData.slug);
    const complaintKey = chiefComplaint ? `${chiefComplaint.code}:${chiefComplaint.label}` : scrapedData.slug;
    
    // Determine coverage level based on number of rules and sections
    if (rules.length >= 20) {
      coverage[complaintKey] = 'full';
    } else if (rules.length >= 10) {
      coverage[complaintKey] = 'partial';
    } else {
      coverage[complaintKey] = 'minimal';
    }

    return coverage;
  }

  public parseMultipleTopics(scrapedDataArray: WikiEMScrapedData[]): RulePack[] {
    return scrapedDataArray.map(data => this.parseWikiEMData(data));
  }

  public validateRulePack(rulePack: RulePack): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation
    if (!rulePack.id || !rulePack.name || !rulePack.version) {
      errors.push('Missing required fields: id, name, or version');
    }

    if (!rulePack.rules || rulePack.rules.length === 0) {
      errors.push('No rules found in rule pack');
    }

    // Validate each rule
    rulePack.rules.forEach((rule, index) => {
      if (!rule.id || !rule.name) {
        errors.push(`Rule ${index}: Missing id or name`);
      }

      if (!rule.conditions || rule.conditions.length === 0) {
        errors.push(`Rule ${index}: No conditions specified`);
      }

      if (!rule.effects || rule.effects.length === 0) {
        errors.push(`Rule ${index}: No effects specified`);
      }

      rule.effects.forEach((effect, effectIndex) => {
        if (!effect.triage || !effect.advice) {
          errors.push(`Rule ${index}, Effect ${effectIndex}: Missing triage or advice`);
        }

        if (!['Red', 'Orange', 'Yellow', 'Green'].includes(effect.triage)) {
          errors.push(`Rule ${index}, Effect ${effectIndex}: Invalid triage level`);
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  public generateSummary(rulePack: RulePack): {
    totalRules: number;
    ruleTypes: { [key: string]: number };
    triageDistribution: { [key: string]: number };
    coverage: string;
  } {
    const ruleTypes: { [key: string]: number } = {};
    const triageDistribution: { [key: string]: number } = {};

    rulePack.rules.forEach(rule => {
      // Count rule types
      const ruleType = rule.metadata.tags[0] || 'unknown';
      ruleTypes[ruleType] = (ruleTypes[ruleType] || 0) + 1;

      // Count triage levels
      rule.effects.forEach(effect => {
        triageDistribution[effect.triage] = (triageDistribution[effect.triage] || 0) + 1;
      });
    });

    const coverage = Object.values(rulePack.metadata.coverage)[0] || 'unknown';

    return {
      totalRules: rulePack.rules.length,
      ruleTypes,
      triageDistribution,
      coverage,
    };
  }
}

// Export default instance
export const wikiEMParser = new WikiEMParser();

// Export for testing
export { WikiEMParser as WikiEMParserClass };
