# WikiEM Importer for ARYA

## Overview

The WikiEM Importer is a comprehensive system for extracting medical knowledge from WikiEM (Wiki Emergency Medicine) and converting it into structured rule packs for the ARYA medical assistant. This system enables ARYA to provide evidence-based emergency medicine guidance with proper citations and coverage tracking.

## 🏗️ Architecture

The WikiEM importer consists of three main components:

1. **Scraper** (`scrape.ts`) - Fetches and caches HTML content from WikiEM
2. **Parser** (`parse.ts`) - Converts scraped data into RulePack-compatible JSON
3. **CLI Importer** (`importWikiEM.ts`) - Orchestrates the entire import process

## 📁 File Structure

```
backend/src/sources/wikem/
├── scrape.ts              # HTML scraping and caching
├── parse.ts               # Data parsing and rule generation
├── importWikiEM.ts        # CLI importer and orchestrator
└── __tests__/             # Comprehensive test suite
    ├── scrape.test.ts     # Scraper tests
    └── parse.test.ts      # Parser tests
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Basic Import

```bash
# Import core emergency topics
npm run wikem:import:core

# Import specific topic
npm run wikem:import:chest-pain

# Import all available topics
npm run wikem:import:all
```

### 3. Custom Import

```bash
# Import custom topics
npm run wikem:import -- --topics "Chest_pain,Stroke,Sepsis" --activate

# Force re-scraping (ignore cache)
npm run wikem:import -- --topics "Chest_pain" --force

# Custom version and output directory
npm run wikem:import -- --topics "Chest_pain" --version "2024-01-15" --output-dir "./custom-output"
```

## 📊 Available NPM Scripts

### Import Scripts
- `wikem:import` - Basic import with default topics
- `wikem:import:chest-pain` - Import chest pain topic
- `wikem:import:stroke` - Import stroke topic
- `wikem:import:sepsis` - Import sepsis topic
- `wikem:import:core` - Import core emergency topics
- `wikem:import:all` - Import all available topics

### Cache Management
- `wikem:cache:clear` - Clear all cached data
- `wikem:cache:stats` - View cache statistics

### Utility Scripts
- `setup` - Install dependencies and create directories
- `clean` - Remove generated files and cache
- `test` - Run test suite
- `build` - Build TypeScript files

## 🎯 Supported WikiEM Topics

The importer is designed to work with any WikiEM topic, but has been tested with:

### Core Emergency Topics
- **Chest Pain** - Acute coronary syndrome, pulmonary embolism, aortic dissection
- **Stroke** - Ischemic stroke, hemorrhagic stroke, TIA
- **Sepsis** - Severe sepsis, septic shock, SIRS criteria
- **Shortness of Breath** - COPD, asthma, pulmonary embolism
- **Abdominal Pain** - Appendicitis, cholecystitis, bowel obstruction

### Additional Topics
- **Headache** - Migraine, cluster headache, subarachnoid hemorrhage
- **Dizziness** - Vertigo, presyncope, vestibular disorders
- **Syncope** - Vasovagal, cardiac, neurologic causes
- **Seizure** - Epileptic, non-epileptic, status epilepticus
- **Trauma** - Head injury, chest trauma, extremity injuries

## 🔧 Configuration

### Environment Variables

```bash
# Cache settings
WIKIEM_CACHE_DIR=./var/cache/wikem
WIKIEM_CACHE_EXPIRY_HOURS=24

# Output settings
WIKIEM_OUTPUT_DIR=./var/rulepacks
WIKIEM_BASE_URL=https://www.wikem.org

# User agent (for respectful scraping)
WIKIEM_USER_AGENT=ARYA-Medical-Bot/1.0
```

### Scraper Configuration

```typescript
import { WikiEMScraper } from './scrape';

const scraper = new WikiEMScraper({
  cacheDir: './custom-cache',
  cacheExpiryHours: 48,
  userAgent: 'CustomBot/1.0',
  baseUrl: 'https://custom.wikem.org',
});
```

### Parser Configuration

```typescript
import { WikiEMParser } from './parse';

const parser = new WikiEMParser('2024-01-15');
```

## 📋 CLI Options

```bash
wikem-import [options]

Options:
  -t, --topics <topics>           Comma-separated list of WikiEM topics
  -v, --version <version>         Version string for rule pack
  -a, --activate                  Mark this version as active
  -f, --force                     Force re-scraping (ignore cache)
  -o, --output-dir <dir>          Output directory for rule packs
  --no-validate                   Skip validation of rule packs
  --verbose                       Enable verbose logging
  -h, --help                      Display help information
```

## 📊 Output Structure

### Rule Pack Files

Each topic generates a JSON file with the following structure:

```json
{
  "id": "core-em-wikem-2024-01-01",
  "name": "Core Emergency Medicine - WikiEM (2024-01-01)",
  "version": "2024-01-01",
  "description": "Emergency medicine rules extracted from WikiEM for Chest Pain",
  "rules": [
    {
      "id": "core-em-wikem-2024-01-01-red-1",
      "name": "Red Flag: Severe chest pain...",
      "description": "Severe chest pain",
      "conditions": ["Severe chest pain"],
      "effects": [
        {
          "triage": "Red",
          "advice": "Immediate attention required: Severe chest pain",
          "action": "Immediate evaluation",
          "urgency": "Immediate"
        }
      ],
      "priority": 1,
      "metadata": {
        "source": "WikiEM",
        "citation": {
          "id": "WIKIEM-Chest_pain",
          "source": "WikiEM",
          "url": "https://www.wikem.org/wiki/Chest_pain",
          "level": "Consensus",
          "year": 2024
        },
        "tags": ["red-flag", "emergency-medicine", "chest_pain"],
        "confidence": "Medium",
        "lastUpdated": "2024-01-01T00:00:00.000Z"
      }
    }
  ],
  "metadata": {
    "source": "WikiEM",
    "topics": ["Chest Pain"],
    "totalRules": 15,
    "coverage": {
      "Chest_pain": "partial"
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Coverage Report

A comprehensive coverage report is generated for each import:

```json
{
  "version": "2024-01-01",
  "generatedAt": "2024-01-01T12:00:00.000Z",
  "totalTopics": 3,
  "totalRules": 45,
  "coverage": {
    "Chest_pain": {
      "status": "partial",
      "rules": 15,
      "sections": 5,
      "lastUpdated": "2024-01-01T00:00:00.000Z"
    },
    "Stroke": {
      "status": "full",
      "rules": 22,
      "sections": 6,
      "lastUpdated": "2024-01-01T00:00:00.000Z"
    },
    "Sepsis": {
      "status": "partial",
      "rules": 8,
      "sections": 4,
      "lastUpdated": "2024-01-01T00:00:00.000Z"
    }
  },
  "summary": {
    "full": 1,
    "partial": 2,
    "minimal": 0
  }
}
```

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm test

# Run specific test files
npm test -- --testPathPattern=scrape
npm test -- --testPathPattern=parse

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Test Coverage

The test suite covers:
- **Scraper**: HTTP requests, HTML parsing, caching, error handling
- **Parser**: Rule generation, validation, metadata creation
- **Integration**: End-to-end import workflows
- **Edge Cases**: Malformed HTML, network errors, validation failures

## 🔒 Security & Ethics

### Rate Limiting
- 1-second delay between requests
- Respectful user agent identification
- Cache to minimize repeated requests

### Content Usage
- Educational and research purposes only
- Proper attribution to WikiEM
- No commercial redistribution

### Data Privacy
- No personal information collected
- Only public medical content accessed
- Temporary caching with automatic expiration

## 🚨 Error Handling

### Common Issues

1. **Network Errors**
   - Automatic retry with exponential backoff
   - Graceful degradation for failed topics
   - Detailed error logging

2. **HTML Parsing Issues**
   - Fallback parsing strategies
   - Content validation
   - Graceful handling of malformed content

3. **Validation Failures**
   - Rule-by-rule validation
   - Detailed error reporting
   - Automatic correction where possible

### Troubleshooting

```bash
# Check cache status
npm run wikem:cache:stats

# Clear cache if issues persist
npm run wikem:cache:clear

# Force re-scraping
npm run wikem:import -- --force

# Verbose logging for debugging
npm run wikem:import -- --verbose
```

## 🔄 Integration with ARYA

### Rule Engine Integration

The generated rule packs integrate seamlessly with ARYA's rule engine:

```typescript
import { loadRulePack } from '@/rule-engine';

const chestPainRules = await loadRulePack('core-em-wikem-2024-01-01');
const redFlags = chestPainRules.rules.filter(rule => 
  rule.metadata.tags.includes('red-flag')
);
```

### Citation Tracking

Every rule includes proper citations for medical accuracy:

```typescript
const citation = rule.metadata.citation;
console.log(`Source: ${citation.source} (${citation.level})`);
console.log(`URL: ${citation.url}`);
```

### Coverage Monitoring

Track knowledge coverage across medical topics:

```typescript
const coverage = rulePack.metadata.coverage;
Object.entries(coverage).forEach(([topic, status]) => {
  console.log(`${topic}: ${status} coverage`);
});
```

## 🚀 Future Enhancements

### Planned Features
1. **Real-time Updates** - Automatic re-importing of updated content
2. **Multi-source Support** - Integration with other medical knowledge bases
3. **Advanced Parsing** - Machine learning-based content extraction
4. **Quality Metrics** - Automated quality assessment of extracted rules
5. **Collaborative Editing** - Community-driven rule refinement

### API Integration
1. **REST API** - Programmatic access to import functionality
2. **Webhook Support** - Notifications for completed imports
3. **Scheduled Imports** - Automated periodic updates
4. **Progress Tracking** - Real-time import status monitoring

## 📚 Additional Resources

### Documentation
- [WikiEM Website](https://www.wikem.org)
- [ARYA Medical Assistant](https://arya.health)
- [Emergency Medicine Guidelines](https://www.acep.org)

### Support
- **Issues**: GitHub repository issues
- **Discussions**: Community forum
- **Email**: support@arya.health

---

*The WikiEM Importer is designed to make emergency medicine knowledge more accessible and actionable for healthcare providers worldwide.*
