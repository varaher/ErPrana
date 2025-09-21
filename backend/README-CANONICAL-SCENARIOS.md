# Canonical Scenarios Implementation

This document summarizes the implementation of seed data and QA testing for three canonical scenarios in the ErMate symptom checker.

## 🎯 Overview

Three canonical scenarios have been implemented to provide consistent QA testing:

1. **Adult ACS Suspicion** - Red/Orange priority with ACS in top-1 or top-2
2. **Pediatric Respiratory Distress** - Orange priority with asthma/bronchiolitis in top-3  
3. **Green Minor Viral URI** - Green priority with viral pharyngitis in top-3 (low confidence)

## 📁 Files Created

### Seed Scripts
- `backend/scripts/seed.js` - Main seed script for creating canonical scenarios
- `backend/scripts/validate-scenarios.js` - Quick validation script
- `backend/scripts/test-data/` - JSON test data files
  - `acs-scenario.json` - Adult ACS scenario data
  - `pediatric-respiratory.json` - Pediatric respiratory scenario data
  - `uri-scenario.json` - URI scenario data

### Tests
- `backend/tests/canonical-scenarios.test.js` - Comprehensive Jest tests
- `backend/README-SEED.md` - Detailed documentation

### Configuration
- Updated `backend/package.json` with new scripts
- `backend/README-CANONICAL-SCENARIOS.md` - This summary

## 🚀 Quick Start

### 1. Create Seed Data
```bash
cd backend
npm run seed:canonical
```

### 2. Run Tests
```bash
# Run canonical scenario tests only
npm run test:canonical

# Run validation script
npm run validate:scenarios

# Run all tests
npm test
```

### 3. Manual Testing
```bash
# Test playground endpoint with ACS scenario
curl -X POST http://localhost:3000/api/playground \
  -H "Content-Type: application/json" \
  -d @scripts/test-data/acs-scenario.json
```

## 📊 Scenario Details

### 1. Adult ACS Suspicion

**Clinical Presentation:**
- 65-year-old male with crushing chest pain
- Radiation to left arm and jaw
- Diaphoresis and shortness of breath
- Vitals: HR 110, RR 24, SBP 90, DBP 60 (MAP 70), SpO2 92

**Expected Results:**
- **Triage:** Red or Orange priority
- **Top Diagnoses:** ACS in top-1 or top-2
- **MAP:** 70 mmHg
- **MEWS:** Elevated (>3)

### 2. Pediatric Respiratory Distress

**Clinical Presentation:**
- 8-year-old male with wheezing and respiratory distress
- SpO2 93%, RR 35 (high for age)
- No seizure, GCS 15
- History of asthma

**Expected Results:**
- **Triage:** Orange priority
- **Top Diagnoses:** Asthma/bronchiolitis in top-3
- **MAP:** 75 mmHg
- **MEWS:** Elevated

### 3. Green Minor Viral URI

**Clinical Presentation:**
- 35-year-old female with mild sore throat
- Low-grade temperature (37.8°C)
- Normal vitals
- Mild symptoms for 2 days

**Expected Results:**
- **Triage:** Green priority
- **Top Diagnoses:** Viral pharyngitis in top-3 (low confidence)
- **MAP:** 93 mmHg
- **MEWS:** Low (<3)

## 🧪 Test Structure

### Jest Tests
The canonical scenarios are tested using Jest with comprehensive validation:

```javascript
describe('Canonical Scenarios Tests', () => {
  describe('1. Adult ACS Suspicion Scenario', () => {
    test('should return correct triage priority', async () => {
      // Validates Red/Orange priority
    });
    
    test('should return ACS in top-1 or top-2 diagnoses', async () => {
      // Validates diagnosis ranking
    });
  });
  
  describe('2. Pediatric Respiratory Distress Scenario', () => {
    // Pediatric-specific tests
  });
  
  describe('3. Green Minor Viral URI Scenario', () => {
    // URI-specific tests
  });
});
```

### Validation Script
Quick validation script for rapid testing:

```bash
npm run validate:scenarios
```

## 🔧 Scripts Available

### Package.json Scripts
```json
{
  "test:canonical": "jest canonical-scenarios.test.js",
  "validate:scenarios": "node scripts/validate-scenarios.js",
  "seed:canonical": "node scripts/seed.js",
  "seed:reset": "node scripts/seed.js --reset"
}
```

### Manual Usage
```javascript
const { seedCanonicalScenarios } = require('./scripts/seed');
await seedCanonicalScenarios();
```

## ✅ Validation Criteria

Each scenario validates:

1. **Triage Priority** - Correct color (Red/Orange/Yellow/Green)
2. **Diagnosis Ranking** - Expected diagnoses in top positions
3. **Clinical Calculations** - MAP, MEWS, and other metrics
4. **API Integration** - Endpoint responses
5. **Data Consistency** - All required fields present

## 🎯 Expected Outcomes

### Adult ACS Scenario
- ✅ Red or Orange priority
- ✅ ACS in top-1 or top-2 diagnoses
- ✅ MAP = 70 mmHg
- ✅ MEWS > 3

### Pediatric Respiratory Scenario
- ✅ Orange priority
- ✅ Asthma/bronchiolitis in top-3
- ✅ MAP = 75 mmHg
- ✅ Elevated MEWS

### URI Scenario
- ✅ Green priority
- ✅ Viral pharyngitis in top-3 (low confidence)
- ✅ MAP = 93 mmHg
- ✅ Low MEWS (<3)

## 🔍 Troubleshooting

### Common Issues

1. **Database Connection:**
   ```bash
   # Ensure PostgreSQL is running
   # Check environment variables
   npm run migrate
   ```

2. **Test Failures:**
   ```bash
   # Create seed data first
   npm run seed:canonical
   
   # Run validation
   npm run validate:scenarios
   ```

3. **Clinical Logic Issues:**
   - Check `src/lib/clinical.js` for rule definitions
   - Verify triage thresholds
   - Review diagnosis scoring

### Debug Mode
```bash
# Verbose test output
npm run test:canonical -- --verbose

# Debug seed script
DEBUG=* npm run seed:canonical
```

## 📈 Future Enhancements

1. **Additional Scenarios**
   - Trauma scenarios
   - Sepsis scenarios
   - Pediatric fever scenarios

2. **Enhanced Validation**
   - Confidence score validation
   - Rule matching validation
   - Clinical decision support validation

3. **Automated Testing**
   - CI/CD integration
   - Performance testing
   - Load testing

## 🎉 Success Criteria

The implementation is successful when:

- ✅ All three scenarios pass validation
- ✅ Triage priorities are correct
- ✅ Diagnosis rankings are accurate
- ✅ Clinical calculations are precise
- ✅ API endpoints return expected results
- ✅ Tests run without errors
- ✅ Documentation is complete

## 📞 Support

For issues or questions:

1. Check the troubleshooting section
2. Review test output for specific errors
3. Validate clinical logic in `src/lib/clinical.js`
4. Ensure database is properly configured

---

**Status:** ✅ Complete and Ready for Testing
**Last Updated:** December 2024
**Version:** 1.0.0
