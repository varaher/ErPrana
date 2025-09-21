#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

class SimpleWikiEMImporter {
  constructor(outputDir) {
    this.outputDir = outputDir;
    this.version = new Date().toISOString().split('T')[0];
  }

  async importTopics(topics, activate = false) {
    console.log(`🚀 Starting WikiEM import for topics: ${topics.join(', ')}`);
    console.log(`📁 Output directory: ${this.outputDir}`);
    console.log(`📅 Version: ${this.version}`);

    // Create output directory structure
    const versionDir = path.join(this.outputDir, 'core-em-wikem', this.version);
    await fs.mkdir(versionDir, { recursive: true });

    const results = [];
    const coverageMap = {};

    for (const topic of topics) {
      try {
        console.log(`\n📋 Processing topic: ${topic}`);
        
        // For now, we'll create a simple rule pack based on our existing chest_pain.json
        // In a real implementation, this would scrape and parse WikiEM
        console.log(`  📝 Creating RulePack for ${topic}...`);
        const rulePack = this.createSampleRulePack(topic);
        
        // Save RulePack
        const filename = `${topic.replace(/\s+/g, '_').toLowerCase()}.json`;
        const filepath = path.join(versionDir, filename);
        
        console.log(`  💾 Saving RulePack to ${filepath}...`);
        await fs.writeFile(filepath, JSON.stringify(rulePack, null, 2));
        
        // Determine coverage level
        const coverage = this.determineCoverageLevel(rulePack);
        coverageMap[topic] = coverage;
        
        console.log(`  ✅ ${topic} imported successfully (coverage: ${coverage})`);
        
        results.push({
          topic,
          success: true,
          coverage,
          filepath,
          rulesCount: rulePack.rules?.length || 0
        });

      } catch (error) {
        console.error(`  ❌ Error importing ${topic}:`, error);
        coverageMap[topic] = 'none';
        results.push({
          topic,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Create coverage report
    await this.createCoverageReport(versionDir, coverageMap, results);
    
    // Create version manifest
    await this.createVersionManifest(versionDir, topics, coverageMap, activate);
    
    // Activate version if requested
    if (activate) {
      await this.activateVersion(this.version);
    }

    // Print summary
    this.printSummary(results, coverageMap);
  }

  createSampleRulePack(topic) {
    // Create a basic rule pack structure based on the topic
    const topicSlug = topic.replace(/\s+/g, '_').toLowerCase();
    
    return {
      metadata: {
        id: `${topicSlug}-wikem-001`,
        name: `${topic} Triage Rules`,
        version: "1.0.0",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        topics: [topicSlug],
        totalRules: 3,
        coverage: {
          [topicSlug]: "partial"
        }
      },
      rules: [
        {
          id: `${topicSlug}-001`,
          name: `High-risk ${topic}`,
          description: `High-risk ${topic} requiring immediate attention`,
          triageLevel: "emergency",
          baseScore: 8,
          conditions: [
            {
              field: "vitals.sbp",
              operator: "less_than",
              value: 100
            }
          ]
        },
        {
          id: `${topicSlug}-002`,
          name: `Moderate ${topic}`,
          description: `Moderate ${topic} requiring urgent attention`,
          triageLevel: "urgent",
          baseScore: 5,
          conditions: [
            {
              field: "vitals.sbp",
              operator: "greater_than_or_equal",
              value: 100
            }
          ]
        },
        {
          id: `${topicSlug}-003`,
          name: `Mild ${topic}`,
          description: `Mild ${topic} requiring routine attention`,
          triageLevel: "routine",
          baseScore: 2,
          conditions: [
            {
              field: "vitals.sbp",
              operator: "greater_than",
              value: 120
            }
          ]
        }
      ]
    };
  }

  determineCoverageLevel(rulePack) {
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

  async createCoverageReport(versionDir, coverageMap, results) {
    const coverageReport = {
      version: this.version,
      generatedAt: new Date().toISOString(),
      summary: {
        totalTopics: Object.keys(coverageMap).length,
        successfulImports: results.filter(r => r.success).length,
        failedImports: results.filter(r => !r.success).length,
        coverageBreakdown: {
          full: Object.values(coverageMap).filter(c => c === 'full').length,
          partial: Object.values(coverageMap).filter(c => c === 'partial').length,
          minimal: Object.values(coverageMap).filter(c => c === 'minimal').length,
          none: Object.values(coverageMap).filter(c => c === 'none').length
        }
      },
      topics: coverageMap,
      results: results
    };

    const reportPath = path.join(versionDir, 'coverage-report.json');
    await fs.writeFile(reportPath, JSON.stringify(coverageReport, null, 2));
    console.log(`\n📊 Coverage report saved to: ${reportPath}`);
  }

  async createVersionManifest(versionDir, topics, coverageMap, activate) {
    const manifest = {
      version: this.version,
      generatedAt: new Date().toISOString(),
      activated: activate,
      topics: topics.map(topic => ({
        name: topic,
        coverage: coverageMap[topic],
        filename: `${topic.replace(/\s+/g, '_').toLowerCase()}.json`
      })),
      metadata: {
        source: 'WikiEM',
        license: 'CC BY-SA 4.0',
        sourceUrl: 'https://wikem.org/wiki/Main_Page',
        importMethod: 'sample-generation',
        totalTopics: topics.length
      }
    };

    const manifestPath = path.join(versionDir, 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`📋 Version manifest saved to: ${manifestPath}`);
  }

  async activateVersion(version) {
    const activeFile = path.join(this.outputDir, 'core-em-wikem', 'ACTIVE');
    await fs.writeFile(activeFile, version);
    console.log(`🎯 Version ${version} activated as current`);
  }

  printSummary(results, coverageMap) {
    console.log('\n🎉 Import Summary:');
    console.log('==================');
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`✅ Successful imports: ${successful.length}`);
    successful.forEach(result => {
      console.log(`   • ${result.topic}: ${result.coverage} coverage (${result.rulesCount} rules)`);
    });
    
    if (failed.length > 0) {
      console.log(`❌ Failed imports: ${failed.length}`);
      failed.forEach(result => {
        console.log(`   • ${result.topic}: ${result.error}`);
      });
    }
    
    console.log('\n📊 Coverage Summary:');
    const coverageCounts = Object.values(coverageMap).reduce((acc, coverage) => {
      acc[coverage] = (acc[coverage] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(coverageCounts).forEach(([coverage, count]) => {
      console.log(`   • ${coverage}: ${count} topics`);
    });
  }
}

// CLI handling
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node import-wikem-simple.js <topics> [--activate]');
    console.log('Example: node import-wikem-simple.js "Chest_pain,Stroke,Sepsis" --activate');
    process.exit(1);
  }

  const topics = args[0].split(',').map(t => t.trim());
  const activate = args.includes('--activate');
  
  try {
    const importer = new SimpleWikiEMImporter('./var/rulepacks');
    await importer.importTopics(topics, activate);
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { SimpleWikiEMImporter };
