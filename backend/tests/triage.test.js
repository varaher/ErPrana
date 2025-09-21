const request = require('supertest');
const app = require('../src/server');

describe('Triage API Tests', () => {
  describe('POST /api/playground', () => {
    // Test 1: Adult Chest Pain (Red Priority)
    test('should return Red priority for adult chest pain with concerning vitals', async () => {
      const payload = {
        age: 65,
        sex: 'male',
        abcde: {
          airway: 'clear',
          breathing: {
            rr: 24,
            spo2: 92,
            distress: true,
            wheeze: false,
            cyanosis: false
          },
          circulation: {
            hr: 110,
            sbp: 140,
            dbp: 90,
            capRefillSec: 2,
            temp: 37.2,
            bleeding: 'none'
          },
          disability: {
            gcs: 15,
            avpu: 'A',
            seizure: false,
            focalDeficit: false,
            glucose: 120
          },
          exposure: {
            trauma: false,
            rash: false,
            painPresent: true,
            burns: 'none',
            tempExtremes: false
          }
        },
        sample: {
          signsSymptoms: ['chest pain', 'shortness of breath', 'diaphoresis'],
          allergies: ['penicillin'],
          medications: ['aspirin', 'metoprolol'],
          pastHistory: ['hypertension', 'diabetes'],
          lastMeal: '2 hours ago',
          events: 'Started while walking up stairs'
        },
        socrates: {
          site: 'chest',
          onset: 'sudden',
          character: 'crushing',
          radiation: ['left arm', 'jaw'],
          associated: ['shortness of breath', 'diaphoresis', 'nausea'],
          timeCourse: '30 minutes',
          exacerbatingRelieving: 'worse with exertion, no relief with rest',
          severityNRS: 9
        },
        vitals: {
          hr: 110,
          rr: 24,
          sbp: 140,
          dbp: 90,
          spo2: 92,
          temp: 37.2,
          gcs: 15
        }
      };

      const response = await request(app)
        .post('/api/playground')
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('result');
      expect(response.body.result).toHaveProperty('triage');
      expect(response.body.result.triage).toHaveProperty('priority');
      expect(response.body.result.triage).toHaveProperty('color');
      
      // Should be Red priority for chest pain with concerning features
      expect(response.body.result.triage.color).toBe('Red');
      expect(response.body.result.triage.priority).toBe('Priority I');
      
      // Should have top 5 diagnoses
      expect(response.body.result).toHaveProperty('top5');
      expect(response.body.result.top5).toHaveLength(5);
      
      // Should include ACS in top diagnoses
      const diagnoses = response.body.result.top5.map(d => d.label);
      expect(diagnoses.some(d => d.toLowerCase().includes('coronary') || d.toLowerCase().includes('acs'))).toBe(true);
    });

    // Test 2: Pediatric Wheeze (Orange Priority)
    test('should return Orange priority for pediatric wheeze with respiratory distress', async () => {
      const payload = {
        age: 8,
        sex: 'female',
        abcde: {
          airway: 'clear',
          breathing: {
            rr: 32,
            spo2: 94,
            distress: true,
            wheeze: true,
            cyanosis: false
          },
          circulation: {
            hr: 120,
            sbp: 95,
            dbp: 60,
            capRefillSec: 2,
            temp: 37.8,
            bleeding: 'none'
          },
          disability: {
            gcs: 15,
            avpu: 'A',
            seizure: false,
            focalDeficit: false,
            glucose: 100
          },
          exposure: {
            trauma: false,
            rash: false,
            painPresent: false,
            burns: 'none',
            tempExtremes: false
          }
        },
        sample: {
          signsSymptoms: ['wheezing', 'cough', 'shortness of breath'],
          allergies: ['dust', 'pollen'],
          medications: ['albuterol'],
          pastHistory: ['asthma'],
          lastMeal: '1 hour ago',
          events: 'Playing outside, symptoms started 2 hours ago'
        },
        socrates: {
          site: 'chest',
          onset: 'gradual',
          character: 'tightness',
          radiation: [],
          associated: ['cough', 'shortness of breath'],
          timeCourse: '2 hours',
          exacerbatingRelieving: 'worse with activity',
          severityNRS: 6
        },
        vitals: {
          hr: 120,
          rr: 32,
          sbp: 95,
          dbp: 60,
          spo2: 94,
          temp: 37.8,
          gcs: 15
        }
      };

      const response = await request(app)
        .post('/api/playground')
        .send(payload)
        .expect(200);

      expect(response.body.result.triage.color).toBe('Orange');
      expect(response.body.result.triage.priority).toBe('Priority II');
      
      // Should have asthma/COPD in top diagnoses
      const diagnoses = response.body.result.top5.map(d => d.label);
      expect(diagnoses.some(d => d.toLowerCase().includes('asthma') || d.toLowerCase().includes('copd'))).toBe(true);
    });

    // Test 3: Trauma Case (Red Priority)
    test('should return Red priority for trauma with altered mental status', async () => {
      const payload = {
        age: 35,
        sex: 'male',
        abcde: {
          airway: 'clear',
          breathing: {
            rr: 18,
            spo2: 98,
            distress: false,
            wheeze: false,
            cyanosis: false
          },
          circulation: {
            hr: 95,
            sbp: 110,
            dbp: 70,
            capRefillSec: 2,
            temp: 36.8,
            bleeding: 'minor'
          },
          disability: {
            gcs: 12,
            avpu: 'V',
            seizure: false,
            focalDeficit: true,
            glucose: 120
          },
          exposure: {
            trauma: true,
            rash: false,
            painPresent: true,
            burns: 'none',
            tempExtremes: false
          }
        },
        sample: {
          signsSymptoms: ['headache', 'confusion', 'nausea'],
          allergies: [],
          medications: [],
          pastHistory: [],
          lastMeal: '3 hours ago',
          events: 'Motor vehicle accident 1 hour ago, hit head on steering wheel'
        },
        socrates: {
          site: 'head',
          onset: 'sudden',
          character: 'throbbing',
          radiation: [],
          associated: ['nausea', 'confusion', 'dizziness'],
          timeCourse: '1 hour',
          exacerbatingRelieving: 'worse with movement',
          severityNRS: 8
        },
        vitals: {
          hr: 95,
          rr: 18,
          sbp: 110,
          dbp: 70,
          spo2: 98,
          temp: 36.8,
          gcs: 12
        }
      };

      const response = await request(app)
        .post('/api/playground')
        .send(payload)
        .expect(200);

      expect(response.body.result.triage.color).toBe('Red');
      expect(response.body.result.triage.priority).toBe('Priority I');
      
      // Should have trauma/head injury in top diagnoses
      const diagnoses = response.body.result.top5.map(d => d.label);
      expect(diagnoses.some(d => d.toLowerCase().includes('trauma') || d.toLowerCase().includes('head') || d.toLowerCase().includes('concussion'))).toBe(true);
    });

    // Test 4: Green Priority - Minor Illness
    test('should return Green priority for minor illness', async () => {
      const payload = {
        age: 25,
        sex: 'female',
        abcde: {
          airway: 'clear',
          breathing: {
            rr: 16,
            spo2: 98,
            distress: false,
            wheeze: false,
            cyanosis: false
          },
          circulation: {
            hr: 72,
            sbp: 120,
            dbp: 80,
            capRefillSec: 2,
            temp: 37.0,
            bleeding: 'none'
          },
          disability: {
            gcs: 15,
            avpu: 'A',
            seizure: false,
            focalDeficit: false,
            glucose: 100
          },
          exposure: {
            trauma: false,
            rash: false,
            painPresent: true,
            burns: 'none',
            tempExtremes: false
          }
        },
        sample: {
          signsSymptoms: ['sore throat', 'mild fever'],
          allergies: [],
          medications: [],
          pastHistory: [],
          lastMeal: '1 hour ago',
          events: 'Started feeling unwell yesterday'
        },
        socrates: {
          site: 'throat',
          onset: 'gradual',
          character: 'sore',
          radiation: [],
          associated: ['mild fever', 'fatigue'],
          timeCourse: '24 hours',
          exacerbatingRelieving: 'worse with swallowing',
          severityNRS: 3
        },
        vitals: {
          hr: 72,
          rr: 16,
          sbp: 120,
          dbp: 80,
          spo2: 98,
          temp: 37.0,
          gcs: 15
        }
      };

      const response = await request(app)
        .post('/api/playground')
        .send(payload)
        .expect(200);

      expect(response.body.result.triage.color).toBe('Green');
      expect(response.body.result.triage.priority).toBe('Priority IV');
    });

    // Test 5: Validation Error - Missing Required Fields
    test('should return 400 for missing required fields', async () => {
      const payload = {
        age: 25,
        // Missing abcde, sample, vitals
      };

      const response = await request(app)
        .post('/api/playground')
        .send(payload)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    // Test 6: Validation Error - Invalid Vitals
    test('should return 400 for invalid vital signs', async () => {
      const payload = {
        age: 25,
        sex: 'male',
        abcde: {
          airway: 'clear',
          breathing: { spo2: 98 },
          circulation: { hr: 72 },
          disability: { gcs: 15 },
          exposure: { trauma: false }
        },
        sample: {
          signsSymptoms: ['fever'],
          allergies: [],
          medications: [],
          pastHistory: [],
          lastMeal: '1 hour ago',
          events: 'Started feeling unwell'
        },
        vitals: {
          hr: 300, // Invalid heart rate
          rr: 16,
          sbp: 120,
          dbp: 80,
          spo2: 98,
          temp: 37.0,
          gcs: 15
        }
      };

      const response = await request(app)
        .post('/api/playground')
        .send(payload)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    // Test 7: MAP Computation
    test('should compute MAP correctly for blood pressure inputs', async () => {
      const payload = {
        age: 45,
        sex: 'male',
        abcde: {
          airway: 'clear',
          breathing: { spo2: 98 },
          circulation: { hr: 80 },
          disability: { gcs: 15 },
          exposure: { trauma: false }
        },
        sample: {
          signsSymptoms: ['chest pain'],
          allergies: [],
          medications: [],
          pastHistory: [],
          lastMeal: '2 hours ago',
          events: 'Started 1 hour ago'
        },
        vitals: {
          hr: 80,
          rr: 16,
          sbp: 140,
          dbp: 90,
          spo2: 98,
          temp: 37.0,
          gcs: 15
        }
      };

      const response = await request(app)
        .post('/api/playground')
        .send(payload)
        .expect(200);

      // MAP should be computed: (140 + 2*90)/3 = 106.67 ≈ 107
      expect(response.body.result.triage).toHaveProperty('map');
      expect(response.body.result.triage.map).toBe(107);
    });
  });

  describe('POST /api/triage/assess (authenticated)', () => {
    // Note: This would require authentication token
    // For now, we'll test that it requires authentication
    test('should require authentication', async () => {
      const payload = {
        age: 25,
        abcde: {
          airway: 'clear',
          breathing: { spo2: 98 },
          circulation: { hr: 72 },
          disability: { gcs: 15 },
          exposure: { trauma: false }
        },
        sample: {
          signsSymptoms: ['fever'],
          allergies: [],
          medications: [],
          pastHistory: [],
          lastMeal: '1 hour ago',
          events: 'Started feeling unwell'
        },
        vitals: {
          hr: 72,
          rr: 16,
          sbp: 120,
          dbp: 80,
          spo2: 98,
          temp: 37.0,
          gcs: 15
        }
      };

      const response = await request(app)
        .post('/api/triage/assess')
        .send(payload)
        .expect(401); // Should require authentication
    });
  });
});
