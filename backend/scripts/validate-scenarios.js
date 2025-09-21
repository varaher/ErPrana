#!/usr/bin/env node

/**
 * Quick validation script for canonical scenarios
 * Tests triage priorities and diagnosis rankings
 */

const { triageAdult, triagePediatric, ruleBasedDx } = require('../src/lib/clinical');

// Test scenarios
const scenarios = [
  {
    name: 'Adult ACS Suspicion',
    age: 65,
    ageGroup: 'adult',
    abcde: {
      airway: 'patent',
      breathing: { respiratoryRate: 24, distress: false, wheeze: false },
      circulation: { heartRate: 110, systolicBP: 90, diastolicBP: 60 },
      disability: { gcs: 15, seizure: false, focalDeficit: false },
      exposure: { trauma: false }
    },
    sample: {
      signsSymptoms: ['chest pain', 'shortness of breath', 'diaphoresis'],
      allergies: ['penicillin'],
      medications: ['aspirin', 'metoprolol'],
      pastHistory: ['hypertension', 'diabetes', 'smoking'],
      lastMeal: '2 hours ago',
      events: 'Started while walking'
    },
    socrates: {
      site: 'chest',
      character: 'crushing',
      severity: 9,
      radiation: ['left arm', 'jaw'],
      associated: ['diaphoresis', 'shortness of breath', 'nausea']
    },
    vitals: {
      hr: 110,
      rr: 24,
      sbp: 90,
      dbp: 60,
      spo2: 92,
      temp: 37.2,
      gcs: 15
    },
    expected: {
      priority: ['Priority I', 'Priority II'],
      color: ['Red', 'Orange'],
      map: 70,
      topDiagnosis: 'Acute Coronary Syndrome'
    }
  },
  {
    name: 'Pediatric Respiratory Distress',
    age: 8,
    ageGroup: 'pediatric',
    abcde: {
      airway: 'patent',
      breathing: { respiratoryRate: 35, distress: true, wheeze: true },
      circulation: { heartRate: 120, systolicBP: 95, diastolicBP: 65 },
      disability: { gcs: 15, seizure: false, focalDeficit: false },
      exposure: { trauma: false }
    },
    sample: {
      signsSymptoms: ['wheezing', 'cough', 'shortness of breath'],
      allergies: ['dust', 'pollen'],
      medications: ['albuterol'],
      pastHistory: ['asthma'],
      lastMeal: '1 hour ago',
      events: 'Started after playing outside'
    },
    socrates: {
      site: 'chest',
      character: 'tightness',
      severity: 6,
      associated: ['wheezing', 'cough', 'shortness of breath']
    },
    vitals: {
      hr: 120,
      rr: 35,
      sbp: 95,
      dbp: 65,
      spo2: 93,
      temp: 37.5,
      gcs: 15
    },
    expected: {
      priority: 'Priority II',
      color: 'Orange',
      map: 75,
      topDiagnosis: 'Asthma/COPD Exacerbation'
    }
  },
  {
    name: 'Green Minor Viral URI',
    age: 35,
    ageGroup: 'adult',
    abcde: {
      airway: 'patent',
      breathing: { respiratoryRate: 16, distress: false, wheeze: false },
      circulation: { heartRate: 72, systolicBP: 120, diastolicBP: 80 },
      disability: { gcs: 15, seizure: false, focalDeficit: false },
      exposure: { trauma: false }
    },
    sample: {
      signsSymptoms: ['sore throat', 'runny nose', 'mild cough'],
      allergies: [],
      medications: [],
      pastHistory: [],
      lastMeal: '1 hour ago',
      events: 'Started 2 days ago'
    },
    socrates: {
      site: 'throat',
      character: 'scratchy',
      severity: 3,
      associated: ['runny nose', 'mild cough', 'fatigue']
    },
    vitals: {
      hr: 72,
      rr: 16,
      sbp: 120,
      dbp: 80,
      spo2: 98,
      temp: 37.8,
      gcs: 15
    },
    expected: {
      priority: 'Priority IV',
      color: 'Green',
      map: 93,
      topDiagnosis: 'Viral Pharyngitis'
    }
  }
];

async function validateScenarios() {
  console.log('🔍 Validating Canonical Scenarios...\n');

  let allPassed = true;

  for (const scenario of scenarios) {
    console.log(`📋 Testing: ${scenario.name}`);
    
    try {
      // Test triage
      let triageResult;
      if (scenario.ageGroup === 'pediatric') {
        triageResult = triagePediatric(scenario.abcde, scenario.vitals, scenario.sample, scenario.age, scenario.socrates);
      } else {
        triageResult = triageAdult(scenario.abcde, scenario.vitals, scenario.sample, scenario.socrates);
      }

      // Test diagnoses
      const diagnoses = await ruleBasedDx(scenario.abcde, scenario.vitals, scenario.sample, scenario.socrates, scenario.ageGroup);

      // Validate results
      let passed = true;
      const results = [];

      // Check triage priority
      if (Array.isArray(scenario.expected.priority)) {
        if (!scenario.expected.priority.includes(triageResult.priority)) {
          passed = false;
          results.push(`❌ Priority: expected ${scenario.expected.priority.join(' or ')}, got ${triageResult.priority}`);
        } else {
          results.push(`✅ Priority: ${triageResult.priority}`);
        }
      } else {
        if (triageResult.priority !== scenario.expected.priority) {
          passed = false;
          results.push(`❌ Priority: expected ${scenario.expected.priority}, got ${triageResult.priority}`);
        } else {
          results.push(`✅ Priority: ${triageResult.priority}`);
        }
      }

      // Check triage color
      if (Array.isArray(scenario.expected.color)) {
        if (!scenario.expected.color.includes(triageResult.color)) {
          passed = false;
          results.push(`❌ Color: expected ${scenario.expected.color.join(' or ')}, got ${triageResult.color}`);
        } else {
          results.push(`✅ Color: ${triageResult.color}`);
        }
      } else {
        if (triageResult.color !== scenario.expected.color) {
          passed = false;
          results.push(`❌ Color: expected ${scenario.expected.color}, got ${triageResult.color}`);
        } else {
          results.push(`✅ Color: ${triageResult.color}`);
        }
      }

      // Check MAP
      if (triageResult.map !== scenario.expected.map) {
        passed = false;
        results.push(`❌ MAP: expected ${scenario.expected.map}, got ${triageResult.map}`);
      } else {
        results.push(`✅ MAP: ${triageResult.map}`);
      }

      // Check diagnoses
      const expectedDiagnosis = diagnoses.find(d => 
        d.label.toLowerCase().includes(scenario.expected.topDiagnosis.toLowerCase().replace(/\s+/g, ''))
      );

      if (!expectedDiagnosis) {
        passed = false;
        results.push(`❌ Diagnosis: expected ${scenario.expected.topDiagnosis} in top 5`);
      } else {
        const position = diagnoses.indexOf(expectedDiagnosis) + 1;
        results.push(`✅ Diagnosis: ${expectedDiagnosis.label} (position ${position}, confidence ${(expectedDiagnosis.confidence * 100).toFixed(1)}%)`);
      }

      // Check diagnosis count
      if (diagnoses.length !== 5) {
        passed = false;
        results.push(`❌ Diagnoses: expected 5, got ${diagnoses.length}`);
      } else {
        results.push(`✅ Diagnoses: ${diagnoses.length} returned`);
      }

      // Print results
      results.forEach(result => console.log(`  ${result}`));
      
      if (passed) {
        console.log(`  🎯 ${scenario.name}: PASSED\n`);
      } else {
        console.log(`  💥 ${scenario.name}: FAILED\n`);
        allPassed = false;
      }

    } catch (error) {
      console.log(`  💥 ${scenario.name}: ERROR - ${error.message}\n`);
      allPassed = false;
    }
  }

  if (allPassed) {
    console.log('🎉 All scenarios passed validation!');
    process.exit(0);
  } else {
    console.log('❌ Some scenarios failed validation.');
    process.exit(1);
  }
}

// Run validation if called directly
if (require.main === module) {
  validateScenarios().catch(error => {
    console.error('💥 Validation failed:', error);
    process.exit(1);
  });
}

module.exports = { validateScenarios };
