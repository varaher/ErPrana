#!/usr/bin/env ts-node

import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import { wikiEMScraper } from './scrape';
import { wikiEMParser } from './parse';

// Remove unused interface

class WikiEMImporter {
  private outputDir: string;
  private version: string;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
    this.version = new Date().toISOString().split('T')[0] || 'unknown'; // YYYY-MM-DD format
  }

  async importTopics(topics: string[], activate: boolean = false): Promise<void> {
    console.log(`🚀 Starting WikiEM import for topics: ${topics.join(', ')}`);
    console.log(`📁 Output directory: ${this.outputDir}`);
    console.log(`📅 Version: ${this.version}`);

    // Create output directory structure
    const versionDir = path.join(this.outputDir, 'core-em-wikem', this.version);
    await fs.mkdir(versionDir, { recursive: true });

    const results = [];
    const coverageMap: Record<string, string> = {};

    for (const topic of topics) {
      try {
        console.log(`\n📋 Processing topic: ${topic}`);
        
        // Step 1: Scrape WikiEM
        console.log(`  🔍 Scraping WikiEM for ${topic}...`);
        const scrapedData = await wikiEMScraper.scrapeTopic(topic);
        
        if (!scrapedData) {
          console.log(`  ❌ Failed to scrape ${topic}`);
          coverageMap[topic] = 'none';
          continue;
        }

        // Step 2: Parse into RulePack format
        console.log(`  📝 Parsing ${topic} into RulePack format...`);
        const rulePack = await wikiEMParser.parseWikiEMData(scrapedData);
        
        if (!rulePack) {
          console.log(`  ❌ Failed to parse ${topic}`);
          coverageMap[topic] = 'none';
          continue;
        }

        // Step 3: Save RulePack
        const filename = `${topic.replace(/\s+/g, '_').toLowerCase()}.json`;
        const filepath = path.join(versionDir, filename);
        
        console.log(`  💾 Saving RulePack to ${filepath}...`);
        await fs.writeFile(filepath, JSON.stringify(rulePack, null, 2));
        
        // Step 4: Determine coverage level
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

  private determineCoverageLevel(rulePack: any): string {
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

  private async createCoverageReport(versionDir: string, coverageMap: Record<string, string>, results: any[]): Promise<void> {
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

  private async createVersionManifest(versionDir: string, topics: string[], coverageMap: Record<string, string>, activate: boolean): Promise<void> {
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
        importMethod: 'automated-scraping',
        totalTopics: topics.length
      }
    };

    const manifestPath = path.join(versionDir, 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`📋 Version manifest saved to: ${manifestPath}`);
  }

  private async activateVersion(version: string): Promise<void> {
    const activeFile = path.join(this.outputDir, 'core-em-wikem', 'ACTIVE');
    await fs.writeFile(activeFile, version);
    console.log(`🎯 Version ${version} activated as current`);
  }

  private printSummary(results: any[], coverageMap: Record<string, string>): void {
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
    }, {} as Record<string, number>);
    
    Object.entries(coverageCounts).forEach(([coverage, count]) => {
      console.log(`   • ${coverage}: ${count} topics`);
    });
  }
}

// CLI setup
const program = new Command();

program
  .name('wikem-import')
  .description('Import WikiEM topics into RulePack format')
  .version('1.0.0');

program
  .command('import')
  .description('Import WikiEM topics')
  .requiredOption('-t, --topics <topics>', 'Comma-separated list of topics to import')
  .option('-a, --activate', 'Activate this version as current', false)
  .option('-o, --output <dir>', 'Output directory', './var/rulepacks')
  .option('--validate', 'Validate RulePacks against schema', false)
  .action(async (options) => {
    try {
             const topics = options.topics.split(',').map((t: string) => t.trim());
      
      if (topics.length === 0) {
        console.error('❌ No topics specified');
        process.exit(1);
      }
      
      const importer = new WikiEMImporter(options.output);
      await importer.importTopics(topics, options.activate);
      
    } catch (error) {
      console.error('❌ Import failed:', error);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List available versions and topics')
  .option('-o, --output <dir>', 'Output directory', './var/rulepacks')
  .action(async (options) => {
    try {
      const wikemDir = path.join(options.output, 'core-em-wikem');
      
      if (!await fs.access(wikemDir).then(() => true).catch(() => false)) {
        console.log('❌ No WikiEM rule packs found');
        return;
      }
      
      const versions = await fs.readdir(wikemDir);
      const activeVersion = await fs.readFile(path.join(wikemDir, 'ACTIVE'), 'utf8').catch(() => null);
      
      console.log('📚 Available WikiEM Versions:');
      console.log('=============================');
      
      for (const version of versions) {
        if (version === 'ACTIVE') continue;
        
        const isActive = version === activeVersion;
        console.log(`${isActive ? '🎯' : '📁'} ${version}${isActive ? ' (ACTIVE)' : ''}`);
        
        try {
          const manifestPath = path.join(wikemDir, version, 'manifest.json');
          const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
          
          manifest.topics.forEach((topic: any) => {
            console.log(`   • ${topic.name}: ${topic.coverage} coverage`);
          });
        } catch (error) {
          console.log(`   • (manifest not found)`);
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to list versions:', error);
    }
  });

// Run CLI
if (require.main === module) {
  program.parse();
}
