#!/usr/bin/env ts-node

/**
 * Example: Using the WikiEM Importer Programmatically
 * 
 * This script demonstrates how to use the WikiEM importer
 * in your own Node.js applications.
 */

import { WikiEMScraper } from '../src/sources/wikem/scrape';
import { WikiEMParser } from '../src/sources/wikem/parse';
import { WikiEMImporter } from '../src/sources/wikem/importWikiEM';
import * as fs from 'fs';
import * as path from 'path';

async function exampleUsage() {
  console.log('🚀 WikiEM Importer Example\n');

  try {
    // 1. Basic Scraping
    console.log('1. Basic Scraping Example');
    console.log('==========================');
    
    const scraper = new WikiEMScraper({
      cacheDir: './var/example-cache',
      cacheExpiryHours: 1,
    });

    // Scrape a single topic
    console.log('Scraping Chest Pain topic...');
    const chestPainData = await scraper.scrapeTopic('Chest_pain');
    console.log(`✅ Scraped: ${chestPainData.topic}`);
    console.log(`   Sections: ${chestPainData.sections.length}`);
    console.log(`   URL: ${chestPainData.url}`);
    console.log(`   Retrieved: ${chestPainData.retrievedAt}\n`);

    // 2. Basic Parsing
    console.log('2. Basic Parsing Example');
    console.log('=========================');
    
    const parser = new WikiEMParser('2024-01-01');
    const rulePack = parser.parseWikiEMData(chestPainData);
    
    console.log(`✅ Parsed: ${rulePack.name}`);
    console.log(`   Rules: ${rulePack.rules.length}`);
    console.log(`   ID: ${rulePack.id}`);
    console.log(`   Version: ${rulePack.version}\n`);

    // 3. Rule Analysis
    console.log('3. Rule Analysis Example');
    console.log('========================');
    
    const redFlagRules = rulePack.rules.filter(rule => 
      rule.metadata.tags.includes('red-flag')
    );
    const treatmentRules = rulePack.rules.filter(rule => 
      rule.metadata.tags.includes('treatment')
    );

    console.log(`Red Flag Rules: ${redFlagRules.length}`);
    redFlagRules.forEach((rule, index) => {
      console.log(`   ${index + 1}. ${rule.name}`);
      console.log(`      Triage: ${rule.effects[0].triage}`);
      console.log(`      Urgency: ${rule.effects[0].urgency}`);
    });

    console.log(`\nTreatment Rules: ${treatmentRules.length}`);
    treatmentRules.forEach((rule, index) => {
      console.log(`   ${index + 1}. ${rule.name}`);
      console.log(`      Triage: ${rule.effects[0].triage}`);
      console.log(`      Action: ${rule.effects[0].action}`);
    });

    // 4. Validation
    console.log('\n4. Validation Example');
    console.log('=====================');
    
    const validation = parser.validateRulePack(rulePack);
    if (validation.isValid) {
      console.log('✅ Rule pack is valid');
    } else {
      console.log('❌ Rule pack has validation errors:');
      validation.errors.forEach(error => console.log(`   - ${error}`));
    }

    // 5. Summary Generation
    console.log('\n5. Summary Example');
    console.log('==================');
    
    const summary = parser.generateSummary(rulePack);
    console.log(`Total Rules: ${summary.totalRules}`);
    console.log(`Coverage: ${summary.coverage}`);
    console.log('Rule Types:');
    Object.entries(summary.ruleTypes).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
    console.log('Triage Distribution:');
    Object.entries(summary.triageDistribution).forEach(([level, count]) => {
      console.log(`   ${level}: ${count}`);
    });

    // 6. Save Example
    console.log('\n6. Save Example');
    console.log('================');
    
    const outputDir = './var/example-output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'chest-pain-example.json');
    fs.writeFileSync(outputPath, JSON.stringify(rulePack, null, 2));
    console.log(`✅ Saved rule pack to: ${outputPath}`);

    // 7. Multiple Topics Example
    console.log('\n7. Multiple Topics Example');
    console.log('===========================');
    
    const topics = ['Stroke', 'Sepsis'];
    console.log(`Scraping multiple topics: ${topics.join(', ')}`);
    
    const multipleData = await scraper.scrapeMultipleTopics(topics);
    console.log(`✅ Scraped ${multipleData.length} topics`);
    
    const multipleRulePacks = parser.parseMultipleTopics(multipleData);
    console.log(`✅ Parsed ${multipleRulePacks.length} rule packs`);
    
    multipleRulePacks.forEach((pack, index) => {
      console.log(`   ${index + 1}. ${pack.metadata.topics[0]}: ${pack.rules.length} rules`);
    });

    // 8. Cache Management
    console.log('\n8. Cache Management Example');
    console.log('============================');
    
    const cacheStats = await scraper.getCacheStats();
    console.log(`Cache Files: ${cacheStats.totalFiles}`);
    console.log(`Cache Size: ${(cacheStats.totalSize / 1024).toFixed(2)} KB`);
    if (cacheStats.oldestFile) {
      console.log(`Oldest File: ${cacheStats.oldestFile}`);
    }

    // 9. Full Importer Example
    console.log('\n9. Full Importer Example');
    console.log('==========================');
    
    const importer = new WikiEMImporter({
      topics: ['Chest_pain'],
      version: '2024-01-01-example',
      activate: false,
      force: false,
      outputDir: './var/example-rulepacks',
      validate: true,
      verbose: true,
    });

    console.log('Running full import process...');
    await importer.run();
    console.log('✅ Full import completed!');

  } catch (error) {
    console.error('❌ Example failed:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  exampleUsage().catch(console.error);
}

export { exampleUsage };
