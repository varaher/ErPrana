# Seed Data and Canonical Scenarios

This document describes the seed data scripts and canonical scenarios for QA testing of the ErMate symptom checker.

## Overview

The seed scripts create three canonical scenarios that represent common clinical presentations:

1. **Adult ACS Suspicion** - Red/Orange priority with ACS in top-1 or top-2
2. **Pediatric Respiratory Distress** - Orange priority with asthma/bronchiolitis in top-3
3. **Green Minor Viral URI** - Green priority with viral pharyngitis in top-3 (low confidence)

## Quick Start

### Run Seed Scripts

```bash
# Create canonical scenarios
npm run seed:canonical

# Run tests for canonical scenarios
npm run test:canonical

# Run all tests including canonical scenarios
npm test
```

### Manual Testing

```bash
# Test playground endpoint with ACS scenario
curl -X POST http://localhost:3000/api/playground \
  -H "Content-Type: application/json" \
  -d @scripts/test-data/acs-scenario.json
```

## Canonical Scenarios

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

**Test Data:**
```json
{
  "age": 65,
  "sex": "male",
  "abcde": {
    "airway": "patent",
    "breathing": {
      "respiratoryRate": 24,
      "distress": false,
      "wheeze": false
    },
    "circulation": {
      "heartRate": 110,
      "systolicBP": 90,
      "diastolicBP": 60
    },
    "disability": {
      "gcs": 15,
      "seizure": false,
      "focalDeficit": false
    },
    "exposure": {
      "trauma": false
    }
  },
  "sample": {
    "signsSymptoms": ["chest pain", "shortness of breath", "diaphoresis"],
    "allergies": ["penicillin"],
    "medications": ["aspirin", "metoprolol"],
    "pastHistory": ["hypertension", "diabetes", "smoking"]
  },
  "socrates": {
    "site": "chest",
    "character": "crushing",
    "severity": 9,
    "radiation": ["left arm", "jaw"],
    "associated": ["diaphoresis", "shortness of breath", "nausea"]
  },
  "vitals": {
    "hr": 110,
    "rr": 24,
    "sbp": 90,
    "dbp": 60,
    "spo2": 92,
    "temp": 37.2,
    "gcs": 15
  }
}
```

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

**Test Data:**
```json
{
  "age": 8,
  "sex": "male",
  "abcde": {
    "airway": "patent",
    "breathing": {
      "respiratoryRate": 35,
      "distress": true,
      "wheeze": true
    },
    "circulation": {
      "heartRate": 120,
      "systolicBP": 95,
      "diastolicBP": 65
    },
    "disability": {
      "gcs": 15,
      "seizure": false,
      "focalDeficit": false
    }
  },
  "sample": {
    "signsSymptoms": ["wheezing", "cough", "shortness of breath"],
    "allergies": ["dust", "pollen"],
    "medications": ["albuterol"],
    "pastHistory": ["asthma"]
  },
  "socrates": {
    "site": "chest",
    "character": "tightness",
    "severity": 6,
    "associated": ["wheezing", "cough", "shortness of breath"]
  },
  "vitals": {
    "hr": 120,
    "rr": 35,
    "sbp": 95,
    "dbp": 65,
    "spo2": 93,
    "temp": 37.5,
    "gcs": 15
  }
}
```

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

**Test Data:**
```json
{
  "age": 35,
  "sex": "female",
  "abcde": {
    "airway": "patent",
    "breathing": {
      "respiratoryRate": 16,
      "distress": false,
      "wheeze": false
    },
    "circulation": {
      "heartRate": 72,
      "systolicBP": 120,
      "diastolicBP": 80
    },
    "disability": {
      "gcs": 15,
      "seizure": false,
      "focalDeficit": false
    }
  },
  "sample": {
    "signsSymptoms": ["sore throat", "runny nose", "mild cough"],
    "allergies": [],
    "medications": [],
    "pastHistory": []
  },
  "socrates": {
    "site": "throat",
    "character": "scratchy",
    "severity": 3,
    "associated": ["runny nose", "mild cough", "fatigue"]
  },
  "vitals": {
    "hr": 72,
    "rr": 16,
    "sbp": 120,
    "dbp": 80,
    "spo2": 98,
    "temp": 37.8,
    "gcs": 15
  }
}
```

## Test Structure

### Jest Tests

The canonical scenarios are tested using Jest with the following structure:

```javascript
describe('Canonical Scenarios Tests', () => {
  describe('1. Adult ACS Suspicion Scenario', () => {
    test('should return correct triage priority', async () => {
      // Test triage logic
    });
    
    test('should return ACS in top-1 or top-2 diagnoses', async () => {
      // Test diagnosis logic
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

### Test Validation

Each scenario validates:

1. **Triage Priority:** Correct color (Red/Orange/Yellow/Green)
2. **Diagnosis Ranking:** Expected diagnoses in top positions
3. **Clinical Calculations:** MAP, MEWS, and other metrics
4. **API Integration:** Endpoint responses
5. **Data Consistency:** All required fields present

## Running Tests

### Individual Test Files

```bash
# Run canonical scenario tests only
npm run test:canonical

# Run with coverage
npm run test:canonical -- --coverage

# Run specific test
npm run test:canonical -- --testNamePattern="ACS"
```

### Full Test Suite

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Seed Script Usage

### Creating Seed Data

```bash
# Create canonical scenarios
npm run seed:canonical

# Create scenarios with fresh data (reset)
npm run seed:reset
```

### Programmatic Usage

```javascript
const { seedCanonicalScenarios } = require('./scripts/seed');

// Create all scenarios
await seedCanonicalScenarios();

// Create individual scenarios
const { createAdultACSScenario } = require('./scripts/seed');
await createAdultACSScenario(user);
```

## File Structure

```
backend/
├── scripts/
│   └── seed.js                 # Main seed script
├── tests/
│   └── canonical-scenarios.test.js  # Jest tests
├── package.json               # Scripts and dependencies
└── README-SEED.md            # This documentation
```

## Troubleshooting

### Common Issues

1. **Database Connection:**
   - Ensure PostgreSQL is running
   - Check environment variables in `.env`
   - Run `npm run migrate` if needed

2. **Test Failures:**
   - Check that seed data exists: `npm run seed:canonical`
   - Verify clinical logic in `src/lib/clinical.js`
   - Check test data matches expected scenarios

3. **Permission Issues:**
   - Ensure database user has proper permissions
   - Check file permissions for seed scripts

### Debug Mode

```bash
# Run tests with verbose output
npm run test:canonical -- --verbose

# Run seed with debug logging
DEBUG=* npm run seed:canonical
```

## Contributing

When adding new scenarios:

1. **Update seed script** in `scripts/seed.js`
2. **Add test cases** in `tests/canonical-scenarios.test.js`
3. **Update documentation** in `README-SEED.md`
4. **Validate clinical logic** in `src/lib/clinical.js`

### Scenario Requirements

Each scenario should include:

- **Clinical presentation** with realistic data
- **Expected triage priority** and color
- **Expected diagnoses** with confidence levels
- **Vital signs** and clinical metrics
- **Test validation** for all components
