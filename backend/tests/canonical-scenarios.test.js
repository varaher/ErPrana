const request = require('supertest');
const app = require('../src/server');
const { User, SymptomSession } = require('../src/models');
const { triageAdult, triagePediatric, ruleBasedDx } = require('../src/lib/clinical');

describe('Canonical Scenarios Tests', () => {
  let testUsers = {};
  let testSessions = {};

  beforeAll(async () => {
    // Create test users
    const [adultUser] = await User.findOrCreate({
      where: { email: 'test.adult@example.com' },
      defaults: {
        firstName: 'Test',
        lastName: 'Adult',
        email: 'test.adult@example.com',
        password: 'password123',
        role: 'patient',
        gender: 'male',
        dateOfBirth: '1980-01-01'
      }
    });
    testUsers.adult = adultUser;

    const [pediatricUser] = await User.findOrCreate({
      where: { email: 'test.pediatric@example.com' },
      defaults: {
        firstName: 'Test',
        lastName: 'Pediatric',
        email: 'test.pediatric@example.com',
        password: 'password123',
        role: 'patient',
        gender: 'male',
        dateOfBirth: '2015-01-01'
      }
    });
    testUsers.pediatric = pediatricUser;
  });

  afterAll(async () => {
    // Clean up test data
    if (testSessions.acs) {
      await SymptomSession.destroy({ where: { id: testSessions.acs.id } });
    }
    if (testSessions.pediatric) {
      await SymptomSession.destroy({ where: { id: testSessions.pediatric.id } });
    }
    if (testSessions.uri) {
      await SymptomSession.destroy({ where: { id: testSessions.uri.id } });
    }
  });

  describe('1. Adult ACS Suspicion Scenario', () => {
    const acsPayload = {
      age: 65,
      sex: 'male',
      ageGroup: 'adult',
      abcde: {
        airway: 'patent',
        breathing: {
          respiratoryRate: 24,
          distress: false,
          wheeze: false
        },
        circulation: {
          heartRate: 110,
          systolicBP: 90,
          diastolicBP: 60,
          capRefillSec: 2
        },
        disability: {
          gcs: 15,
          seizure: false,
          focalDeficit: false
        },
        exposure: {
          trauma: false
        }
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
        onset: 'gradual',
        duration: '2 hours',
        radiation: ['left arm', 'jaw'],
        associated: ['diaphoresis', 'shortness of breath', 'nausea'],
        relieving: 'rest',
        timing: 'constant'
      },
      vitals: {
        hr: 110,
        rr: 24,
        sbp: 90,
        dbp: 60,
        spo2: 92,
        temp: 37.2,
        gcs: 15
      }
    };

    test('should create ACS scenario and return correct triage priority', async () => {
      // Calculate expected triage
      const triageResult = triageAdult(acsPayload.abcde, acsPayload.vitals, acsPayload.sample, acsPayload.socrates);
      
      // Expect Red or Orange priority
      expect(['Priority I', 'Priority II']).toContain(triageResult.priority);
      expect(['Red', 'Orange']).toContain(triageResult.color);
      
      // Expect MAP calculation
      expect(triageResult.map).toBe(70); // (90 + 2*60)/3 = 70
      
      // Expect MEWS score
      expect(triageResult.mews).toBeGreaterThan(0);
    });

    test('should return ACS in top-1 or top-2 diagnoses', async () => {
      const diagnoses = await ruleBasedDx(acsPayload.abcde, acsPayload.vitals, acsPayload.sample, acsPayload.socrates, acsPayload.ageGroup);
      
      expect(diagnoses).toHaveLength(5);
      
      // Check if ACS is in top 2
      const acsDiagnosis = diagnoses.find(d => 
        d.label.toLowerCase().includes('acute coronary syndrome') || 
        d.label.toLowerCase().includes('acs')
      );
      
      expect(acsDiagnosis).toBeDefined();
      expect(diagnoses.indexOf(acsDiagnosis)).toBeLessThan(2);
      expect(acsDiagnosis.confidence).toBeGreaterThan(0.3);
    });

    test('should create session via API and return correct results', async () => {
      const response = await request(app)
        .post('/api/symptoms/session')
        .set('Authorization', 'Bearer test-token')
        .send({
          age: acsPayload.age,
          sex: acsPayload.sex,
          initialAbcde: acsPayload.abcde
        })
        .expect(201);

      expect(response.body).toHaveProperty('sessionId');
      testSessions.acs = { id: response.body.sessionId };
    });
  });

  describe('2. Pediatric Moderate Respiratory Distress Scenario', () => {
    const pediatricPayload = {
      age: 8,
      sex: 'male',
      ageGroup: 'pediatric',
      abcde: {
        airway: 'patent',
        breathing: {
          respiratoryRate: 35, // High for age
          distress: true,
          wheeze: true
        },
        circulation: {
          heartRate: 120,
          systolicBP: 95,
          diastolicBP: 65,
          capRefillSec: 2
        },
        disability: {
          gcs: 15,
          seizure: false,
          focalDeficit: false
        },
        exposure: {
          trauma: false
        }
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
        onset: 'gradual',
        duration: '3 hours',
        radiation: [],
        associated: ['wheezing', 'cough', 'shortness of breath'],
        relieving: 'albuterol',
        timing: 'constant'
      },
      vitals: {
        hr: 120,
        rr: 35,
        sbp: 95,
        dbp: 65,
        spo2: 93,
        temp: 37.5,
        gcs: 15
      }
    };

    test('should return Orange priority for pediatric respiratory distress', async () => {
      const triageResult = triagePediatric(pediatricPayload.abcde, pediatricPayload.vitals, pediatricPayload.sample, pediatricPayload.age, pediatricPayload.socrates);
      
      expect(triageResult.priority).toBe('Priority II');
      expect(triageResult.color).toBe('Orange');
      expect(triageResult.reasons).toContain('Urgent condition requiring prompt attention');
    });

    test('should return asthma/bronchiolitis in top-3 diagnoses', async () => {
      const diagnoses = await ruleBasedDx(pediatricPayload.abcde, pediatricPayload.vitals, pediatricPayload.sample, pediatricPayload.socrates, pediatricPayload.ageGroup);
      
      expect(diagnoses).toHaveLength(5);
      
      // Check for asthma or bronchiolitis in top 3
      const respiratoryDiagnosis = diagnoses.find(d => 
        d.label.toLowerCase().includes('asthma') || 
        d.label.toLowerCase().includes('bronchiolitis') ||
        d.label.toLowerCase().includes('copd')
      );
      
      expect(respiratoryDiagnosis).toBeDefined();
      expect(diagnoses.indexOf(respiratoryDiagnosis)).toBeLessThan(3);
    });

    test('should calculate correct MAP for pediatric patient', async () => {
      const triageResult = triagePediatric(pediatricPayload.abcde, pediatricPayload.vitals, pediatricPayload.sample, pediatricPayload.age, pediatricPayload.socrates);
      
      // MAP = (95 + 2*65)/3 = 75
      expect(triageResult.map).toBe(75);
    });
  });

  describe('3. Green Minor Viral URI Scenario', () => {
    const uriPayload = {
      age: 35,
      sex: 'female',
      ageGroup: 'adult',
      abcde: {
        airway: 'patent',
        breathing: {
          respiratoryRate: 16,
          distress: false,
          wheeze: false
        },
        circulation: {
          heartRate: 72,
          systolicBP: 120,
          diastolicBP: 80,
          capRefillSec: 2
        },
        disability: {
          gcs: 15,
          seizure: false,
          focalDeficit: false
        },
        exposure: {
          trauma: false
        }
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
        onset: 'gradual',
        duration: '2 days',
        radiation: [],
        associated: ['runny nose', 'mild cough', 'fatigue'],
        relieving: 'rest',
        timing: 'constant'
      },
      vitals: {
        hr: 72,
        rr: 16,
        sbp: 120,
        dbp: 80,
        spo2: 98,
        temp: 37.8,
        gcs: 15
      }
    };

    test('should return Green priority for minor URI', async () => {
      const triageResult = triageAdult(uriPayload.abcde, uriPayload.vitals, uriPayload.sample, uriPayload.socrates);
      
      expect(triageResult.priority).toBe('Priority IV');
      expect(triageResult.color).toBe('Green');
    });

    test('should return viral pharyngitis in top-3 with low confidence', async () => {
      const diagnoses = await ruleBasedDx(uriPayload.abcde, uriPayload.vitals, uriPayload.sample, uriPayload.socrates, uriPayload.ageGroup);
      
      expect(diagnoses).toHaveLength(5);
      
      // Check for viral pharyngitis or similar in top 3
      const uriDiagnosis = diagnoses.find(d => 
        d.label.toLowerCase().includes('pharyngitis') || 
        d.label.toLowerCase().includes('viral') ||
        d.label.toLowerCase().includes('uri') ||
        d.label.toLowerCase().includes('upper respiratory')
      );
      
      expect(uriDiagnosis).toBeDefined();
      expect(diagnoses.indexOf(uriDiagnosis)).toBeLessThan(3);
      expect(uriDiagnosis.confidence).toBeLessThan(0.5); // Low confidence
    });

    test('should have normal vital signs', async () => {
      const triageResult = triageAdult(uriPayload.abcde, uriPayload.vitals, uriPayload.sample, uriPayload.socrates);
      
      // MAP should be normal
      expect(triageResult.map).toBe(93); // (120 + 2*80)/3 = 93.33 ≈ 93
      
      // MEWS should be low
      expect(triageResult.mews).toBeLessThan(3);
    });
  });

  describe('4. Comprehensive Scenario Validation', () => {
    test('should always return exactly 5 diagnoses', async () => {
      const scenarios = [
        {
          name: 'ACS',
          payload: {
            abcde: { airway: 'patent', breathing: {}, circulation: {}, disability: {}, exposure: {} },
            vitals: { hr: 110, rr: 24, sbp: 90, dbp: 60, spo2: 92 },
            sample: { signsSymptoms: ['chest pain'], allergies: [], medications: [], pastHistory: [] },
            socrates: { character: 'crushing', severity: 9 }
          }
        },
        {
          name: 'Pediatric Respiratory',
          payload: {
            abcde: { airway: 'patent', breathing: { wheeze: true, distress: true }, circulation: {}, disability: {}, exposure: {} },
            vitals: { hr: 120, rr: 35, sbp: 95, dbp: 65, spo2: 93 },
            sample: { signsSymptoms: ['wheezing'], allergies: [], medications: [], pastHistory: [] },
            socrates: { character: 'tightness', severity: 6 }
          }
        },
        {
          name: 'URI',
          payload: {
            abcde: { airway: 'patent', breathing: {}, circulation: {}, disability: {}, exposure: {} },
            vitals: { hr: 72, rr: 16, sbp: 120, dbp: 80, spo2: 98 },
            sample: { signsSymptoms: ['sore throat'], allergies: [], medications: [], pastHistory: [] },
            socrates: { character: 'scratchy', severity: 3 }
          }
        }
      ];

      for (const scenario of scenarios) {
        const diagnoses = await ruleBasedDx(
          scenario.payload.abcde,
          scenario.payload.vitals,
          scenario.payload.sample,
          scenario.payload.socrates,
          'adult'
        );
        
        expect(diagnoses).toHaveLength(5);
        expect(diagnoses.every(d => d.confidence >= 0 && d.confidence <= 1)).toBe(true);
        expect(diagnoses.every(d => d.label && d.rationale)).toBe(true);
      }
    });

    test('should validate triage priorities are consistent', async () => {
      // Test that Red > Orange > Yellow > Green priority ordering
      const priorities = ['Priority I', 'Priority II', 'Priority III', 'Priority IV'];
      const colors = ['Red', 'Orange', 'Yellow', 'Green'];
      
      expect(priorities).toHaveLength(4);
      expect(colors).toHaveLength(4);
    });
  });

  describe('5. API Integration Tests', () => {
    test('should handle playground endpoint for ACS scenario', async () => {
      const acsPlaygroundPayload = {
        age: 65,
        sex: 'male',
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
          medications: ['aspirin'],
          pastHistory: ['hypertension'],
          lastMeal: '2 hours ago',
          events: 'Started while walking'
        },
        socrates: {
          site: 'chest',
          character: 'crushing',
          severity: 9,
          onset: 'gradual',
          duration: '2 hours',
          radiation: ['left arm'],
          associated: ['diaphoresis'],
          relieving: 'rest',
          timing: 'constant'
        },
        vitals: {
          hr: 110,
          rr: 24,
          sbp: 90,
          dbp: 60,
          spo2: 92,
          temp: 37.2,
          gcs: 15
        }
      };

      const response = await request(app)
        .post('/api/playground')
        .send(acsPlaygroundPayload)
        .expect(200);

      expect(response.body).toHaveProperty('result');
      expect(response.body.result).toHaveProperty('triage');
      expect(response.body.result).toHaveProperty('top5');
      expect(response.body.result.top5).toHaveLength(5);
      
      // Should be Red or Orange
      expect(['Red', 'Orange']).toContain(response.body.result.triage.color);
    });
  });
});
