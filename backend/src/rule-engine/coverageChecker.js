const fs = require('fs');
const path = require('path');

/**
 * RulePacks Coverage Checker
 * Provides comprehensive information about available rule packs and their status
 */
class CoverageChecker {
  constructor() {
    this.rulePacksDir = path.join(process.cwd(), 'var', 'rulepacks');
    this.coreEmDir = path.join(this.rulePacksDir, 'core-em');
    this.wikiEmDir = path.join(this.rulePacksDir, 'core-em-wikem');
  }

  /**
   * Get comprehensive coverage report for all rule packs
   */
  async getCoverageReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalRulePacks: 0,
      activeRulePacks: 0,
      coverage: {},
      summary: {}
    };

    try {
      // Check core-em rule packs
      const coreEmPacks = await this.getCoreEmPacks();
      report.coverage['core-em'] = coreEmPacks;

      // Check core-em-wikem rule packs
      const wikiEmPacks = await this.getWikiEmPacks();
      report.coverage['core-em-wikem'] = wikiEmPacks;

      // Calculate totals
      report.totalRulePacks = coreEmPacks.length + wikiEmPacks.length;
      report.activeRulePacks = coreEmPacks.filter(pack => pack.active).length + 
                               wikiEmPacks.filter(pack => pack.active).length;

      // Generate summary
      report.summary = this.generateSummary(report.coverage);

    } catch (error) {
      console.error('Error generating coverage report:', error);
      report.error = error.message;
    }

    return report;
  }

  /**
   * Get core-em rule packs
   */
  async getCoreEmPacks() {
    const packs = [];
    
    if (!fs.existsSync(this.coreEmDir)) {
      return packs;
    }

    try {
      const files = await fs.promises.readdir(this.coreEmDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const packInfo = await this.getPackInfo(path.join(this.coreEmDir, file), 'core-em');
          if (packInfo) {
            packs.push(packInfo);
          }
        }
      }
    } catch (error) {
      console.error('Error reading core-em directory:', error);
    }

    return packs;
  }

  /**
   * Get core-em-wikem rule packs
   */
  async getWikiEmPacks() {
    const packs = [];
    
    if (!fs.existsSync(this.wikiEmDir)) {
      return packs;
    }

    try {
      const files = await fs.promises.readdir(this.wikiEmDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const packInfo = await this.getPackInfo(path.join(this.wikiEmDir, file), 'core-em-wikem');
          if (packInfo) {
            packs.push(packInfo);
          }
        }
      }
    } catch (error) {
      console.error('Error reading core-em-wikem directory:', error);
    }

    return packs;
  }

  /**
   * Get information about a specific rule pack
   */
  async getPackInfo(filePath, sourceType) {
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      const rulePack = JSON.parse(content);
      
      const fileName = path.basename(filePath, '.json');
      const dirName = path.basename(path.dirname(filePath));
      
      return {
        topic: fileName,
        source: sourceType,
        path: path.relative(process.cwd(), filePath),
        active: this.isPackActive(rulePack),
        version: rulePack.metadata?.version || 'unknown',
        totalRules: rulePack.metadata?.totalRules || 0,
        license: rulePack.metadata?.license || 'unknown',
        sourceUrl: rulePack.metadata?.sourceUrl || null,
        lastUpdated: rulePack.metadata?.lastUpdated || null,
        coverage: this.determineCoverageLevel(rulePack),
        size: content.length,
        hasRedFlags: !!(rulePack.redFlags && rulePack.redFlags.length > 0),
        hasDifferentials: !!(rulePack.differentials && rulePack.differentials.length > 0),
        hasTreatment: !!(rulePack.treatment && rulePack.treatment.length > 0)
      };
    } catch (error) {
      console.error(`Error reading pack info for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Check if a rule pack is active
   */
  isPackActive(rulePack) {
    return rulePack.metadata && 
           rulePack.metadata.totalRules > 0 && 
           rulePack.metadata.active !== false;
  }

  /**
   * Determine coverage level of a rule pack
   */
  determineCoverageLevel(rulePack) {
    if (!rulePack.metadata || rulePack.metadata.totalRules === 0) {
      return 'none';
    }

    const ruleCount = rulePack.metadata.totalRules;
    if (ruleCount >= 20) return 'full';
    if (ruleCount >= 10) return 'partial';
    if (ruleCount >= 5) return 'basic';
    return 'minimal';
  }

  /**
   * Generate summary of coverage
   */
  generateSummary(coverage) {
    const summary = {
      totalTopics: 0,
      activeTopics: 0,
      coverageBreakdown: {
        full: 0,
        partial: 0,
        basic: 0,
        minimal: 0,
        none: 0
      },
      sourceBreakdown: {
        'core-em': 0,
        'core-em-wikem': 0
      }
    };

    Object.entries(coverage).forEach(([source, packs]) => {
      summary.sourceBreakdown[source] = packs.length;
      
      packs.forEach(pack => {
        summary.totalTopics++;
        if (pack.active) {
          summary.activeTopics++;
          summary.coverageBreakdown[pack.coverage]++;
        }
      });
    });

    return summary;
  }

  /**
   * Print coverage report to console
   */
  async printCoverageReport() {
    if (process.env.NODE_ENV !== 'development') {
      return; // Only show in development
    }

    const report = await this.getCoverageReport();
    
    console.log('\n' + '='.repeat(60));
    console.log('📚 RULEPACKS COVERAGE REPORT');
    console.log('='.repeat(60));
    console.log(`Total Rule Packs: ${report.totalRulePacks}`);
    console.log(`Active Rule Packs: ${report.activeRulePacks}`);
    console.log(`Timestamp: ${report.timestamp}`);
    console.log('');

    // Print summary
    if (report.summary) {
      console.log('📊 COVERAGE SUMMARY:');
      console.log('-'.repeat(40));
      console.log(`Full Coverage: ${report.summary.coverageBreakdown.full}`);
      console.log(`Partial Coverage: ${report.summary.coverageBreakdown.partial}`);
      console.log(`Basic Coverage: ${report.summary.coverageBreakdown.basic}`);
      console.log(`Minimal Coverage: ${report.summary.coverageBreakdown.minimal}`);
      console.log(`No Coverage: ${report.summary.coverageBreakdown.none}`);
      console.log('');
    }

    // Print detailed coverage by source
    Object.entries(report.coverage).forEach(([source, packs]) => {
      if (packs.length > 0) {
        console.log(`🗂️  ${source.toUpperCase()} RULE PACKS:`);
        console.log('-'.repeat(40));
        
        packs.forEach(pack => {
          const status = pack.active ? '✅' : '❌';
          const coverage = pack.coverage.toUpperCase();
          const license = pack.license || 'unknown';
          
          console.log(`${status} ${pack.topic} (${coverage})`);
          console.log(`   Version: ${pack.version} | License: ${license}`);
          console.log(`   Rules: ${pack.totalRules} | Size: ${pack.size} chars`);
          if (pack.sourceUrl) {
            console.log(`   Source: ${pack.sourceUrl}`);
          }
          console.log('');
        });
      }
    });

    // Print engine ready summary
    console.log('🚀 ENGINE READY SUMMARY:');
    console.log('-'.repeat(40));
    
    const activePacks = [];
    Object.entries(report.coverage).forEach(([source, packs]) => {
      packs.filter(pack => pack.active).forEach(pack => {
        activePacks.push({
          topic: pack.topic,
          source: pack.source,
          version: pack.version,
          coverage: pack.coverage
        });
      });
    });

    if (activePacks.length > 0) {
      activePacks.forEach(pack => {
        console.log(`✅ ${pack.topic} → ${pack.source} v${pack.version} (${pack.coverage})`);
      });
    } else {
      console.log('❌ No active rule packs found');
    }

    console.log('='.repeat(60) + '\n');
  }
}

// Create singleton instance
const coverageChecker = new CoverageChecker();

module.exports = coverageChecker;
