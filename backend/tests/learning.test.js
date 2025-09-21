const request = require('supertest');
const app = require('../src/server');
const { SymptomFeedback, SymptomSession } = require('../src/models');

describe('Learning System Tests', () => {
  let testSessionId;
  let testFeedbackId;

  beforeAll(async () => {
    // Create a test session for learning tests
    const testSession = await SymptomSession.create({
      userId: 'test-user-id',
      payload: {
        age: 65,
        sex: 'male',
        ageGroup: 'adult',
        abcde: {
          airway: 'clear',
          breathing: { spo2: 92, distress: true },
          circulation: { hr: 110, sbp: 140, dbp: 90 },
          disability: { gcs: 15 },
          exposure: { trauma: false }
        },
        sample: {
          signsSymptoms: ['chest pain', 'shortness of breath'],
          allergies: ['penicillin'],
          medications: ['aspirin'],
          pastHistory: ['hypertension'],
          lastMeal: '2 hours ago',
          events: 'Started while walking'
        },
        socrates: {
          site: 'chest',
          onset: 'sudden',
          character: 'crushing',
          radiation: ['left arm'],
          associated: ['shortness of breath', 'diaphoresis'],
          timeCourse: '30 minutes',
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
      },
      result: {
        triage: {
          priority: 'Priority I',
          color: 'Red',
          reasons: ['Life-threatening condition detected']
        },
        top5: [
          {
            label: 'Acute Coronary Syndrome',
            confidence: 0.85,
            rationale: 'Chest pain with typical cardiac features'
          },
          {
            label: 'Pulmonary Embolism',
            confidence: 0.45,
            rationale: 'Shortness of breath with risk factors'
          }
        ]
      }
    });

    testSessionId = testSession.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (testFeedbackId) {
      await SymptomFeedback.destroy({ where: { id: testFeedbackId } });
    }
    if (testSessionId) {
      await SymptomSession.destroy({ where: { id: testSessionId } });
    }
  });

  describe('Feedback Submission and Learning', () => {
    test('should submit feedback and store learning data', async () => {
      const feedbackData = {
        sessionId: testSessionId,
        outcome: 'diagnosed',
        confirmedDiagnosis: 'Acute Coronary Syndrome',
        notes: 'Confirmed by cardiologist - STEMI on ECG'
      };

      const response = await request(app)
        .post('/api/symptoms/feedback')
        .set('Authorization', 'Bearer test-token')
        .send(feedbackData)
        .expect(201);

      expect(response.body).toHaveProperty('feedbackId');
      expect(response.body.feedback).toHaveProperty('confirmedDiagnosis', 'Acute Coronary Syndrome');
      expect(response.body.feedback).toHaveProperty('outcome', 'diagnosed');

      testFeedbackId = response.body.feedbackId;
    });

    test('should apply learning to subsequent diagnoses', async () => {
      // This test would verify that the learning system applies Bayesian updates
      // For now, we'll test the playground endpoint to see if learning data is included
      const testPayload = {
        age: 65,
        sex: 'male',
        abcde: {
          airway: 'clear',
          breathing: { spo2: 92, distress: true },
          circulation: { hr: 110, sbp: 140, dbp: 90 },
          disability: { gcs: 15 },
          exposure: { trauma: false }
        },
        sample: {
          signsSymptoms: ['chest pain', 'shortness of breath'],
          allergies: ['penicillin'],
          medications: ['aspirin'],
          pastHistory: ['hypertension'],
          lastMeal: '2 hours ago',
          events: 'Started while walking'
        },
        socrates: {
          site: 'chest',
          onset: 'sudden',
          character: 'crushing',
          radiation: ['left arm'],
          associated: ['shortness of breath', 'diaphoresis'],
          timeCourse: '30 minutes',
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
        .send(testPayload)
        .expect(200);

      expect(response.body.result).toHaveProperty('top5');
      expect(response.body.result.top5).toHaveLength(5);

      // Check if learning data is included in the response
      const acsDiagnosis = response.body.result.top5.find(d => 
        d.label.toLowerCase().includes('acute coronary syndrome')
      );

      if (acsDiagnosis) {
        expect(acsDiagnosis).toHaveProperty('learningData');
        expect(acsDiagnosis.learningData).toHaveProperty('successes');
        expect(acsDiagnosis.learningData).toHaveProperty('failures');
        expect(acsDiagnosis.learningData).toHaveProperty('historicalMatches');
      }
    });
  });

  describe('Learning Analytics API', () => {
    test('should get learning statistics for a diagnosis', async () => {
      const response = await request(app)
        .get('/api/learning/stats/Acute%20Coronary%20Syndrome')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body).toHaveProperty('diagnosis');
      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toHaveProperty('totalFeedback');
      expect(response.body.stats).toHaveProperty('confirmedCount');
      expect(response.body.stats).toHaveProperty('successRate');
    });

    test('should get summary statistics', async () => {
      const response = await request(app)
        .get('/api/learning/summary')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toHaveProperty('totalFeedback');
      expect(response.body.stats).toHaveProperty('feedbackByOutcome');
      expect(response.body.stats).toHaveProperty('topDiagnoses');
    });

    test('should get learning analytics', async () => {
      const response = await request(app)
        .get('/api/learning/analytics?days=30')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body).toHaveProperty('analytics');
      expect(response.body).toHaveProperty('period');
    });
  });

  describe('Privacy and Data Protection', () => {
    test('should de-identify feedback data in analytics', async () => {
      const response = await request(app)
        .get('/api/learning/summary')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      // Verify that no personally identifiable information is exposed
      const stats = response.body.stats;
      
      if (stats.recentActivity && stats.recentActivity.length > 0) {
        const activity = stats.recentActivity[0];
        expect(activity).not.toHaveProperty('userId');
        expect(activity).not.toHaveProperty('sessionId');
        expect(activity).toHaveProperty('outcome');
        expect(activity).toHaveProperty('confirmedDiagnosis');
        expect(activity).toHaveProperty('createdAt');
      }
    });
  });
});
