const request = require('supertest');
const app = require('../src/server');
const { SymptomSession, User, Patient, Doctor } = require('../src/models');

describe('Clinician View Tests', () => {
  let testSessionId;
  let testDoctorId;
  let testPatientId;
  let testUserId;

  beforeAll(async () => {
    // Create test user
    const testUser = await User.create({
      firstName: 'Test',
      lastName: 'Doctor',
      email: 'testdoctor@example.com',
      password: 'password123',
      role: 'doctor'
    });
    testUserId = testUser.id;

    // Create test doctor
    const testDoctor = await Doctor.create({
      userId: testUser.id,
      specialization: 'Emergency Medicine',
      yearsOfExperience: 10
    });
    testDoctorId = testDoctor.id;

    // Create test patient
    const testPatient = await Patient.create({
      userId: 'test-patient-id',
      assignedDoctorId: testDoctor.id,
      height: 170,
      weight: 70
    });
    testPatientId = testPatient.id;

    // Create test session
    const testSession = await SymptomSession.create({
      userId: testPatient.userId,
      payload: {
        age: 45,
        sex: 'male',
        ageGroup: 'adult',
        abcde: {
          airway: 'patent',
          breathing: { respiratoryRate: 22 },
          circulation: { heartRate: 110, systolicBP: 95 },
          disability: { gcs: 15 },
          exposure: {}
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
          character: 'pressure',
          severity: 8,
          onset: 'gradual',
          duration: '2 hours',
          associated: ['shortness of breath', 'sweating'],
          relieving: 'rest',
          timing: 'constant'
        },
        vitals: {
          hr: 110,
          rr: 22,
          sbp: 95,
          dbp: 60,
          spo2: 92,
          temp: 37.2,
          gcs: 15
        }
      },
      result: {
        triage: {
          priority: 'Priority I',
          color: 'Red',
          recommendedAction: 'Immediate medical attention required'
        },
        top5: [
          {
            label: 'Acute Coronary Syndrome',
            confidence: 0.85,
            rationale: 'Chest pain with typical cardiac features'
          }
        ]
      }
    });
    testSessionId = testSession.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (testSessionId) {
      await SymptomSession.destroy({ where: { id: testSessionId } });
    }
    if (testPatientId) {
      await Patient.destroy({ where: { id: testPatientId } });
    }
    if (testDoctorId) {
      await Doctor.destroy({ where: { id: testDoctorId } });
    }
    if (testUserId) {
      await User.destroy({ where: { id: testUserId } });
    }
  });

  describe('GET /api/symptoms/sessions/:id?view=clinician', () => {
    test('should return clinician view for doctor role', async () => {
      // Mock authentication for doctor
      const response = await request(app)
        .get(`/api/symptoms/sessions/${testSessionId}?view=clinician`)
        .set('Authorization', 'Bearer test-doctor-token')
        .expect(200);

      expect(response.body).toHaveProperty('transcript');
      expect(response.body.transcript).toHaveProperty('clinicianView');
      
      const clinicianView = response.body.transcript.clinicianView;
      expect(clinicianView).toHaveProperty('mews');
      expect(clinicianView).toHaveProperty('map');
      expect(clinicianView).toHaveProperty('ruleMatches');
      expect(clinicianView).toHaveProperty('clinicianNotes');
      expect(clinicianView).toHaveProperty('compactTranscript');

      // Check MEWS calculation
      expect(clinicianView.mews).toBeGreaterThan(0);
      
      // Check MAP calculation
      expect(clinicianView.map).toBe(72); // (95 + 2*60)/3 = 71.67 ≈ 72
      
      // Check rule matches
      expect(clinicianView.ruleMatches).toBeInstanceOf(Array);
      expect(clinicianView.ruleMatches.length).toBeGreaterThan(0);
      
      // Check clinician notes
      expect(clinicianView.clinicianNotes).toBeTruthy();
      expect(clinicianView.clinicianNotes).toContain('Triage Priority');
      expect(clinicianView.clinicianNotes).toContain('Vital Signs');
      
      // Check compact transcript
      expect(clinicianView.compactTranscript).toHaveProperty('abcde');
      expect(clinicianView.compactTranscript).toHaveProperty('sample');
      expect(clinicianView.compactTranscript).toHaveProperty('socrates');
      expect(clinicianView.compactTranscript).toHaveProperty('vitals');
    });

    test('should not return clinician view for patient role', async () => {
      // Mock authentication for patient
      const response = await request(app)
        .get(`/api/symptoms/sessions/${testSessionId}?view=clinician`)
        .set('Authorization', 'Bearer test-patient-token')
        .expect(200);

      expect(response.body).toHaveProperty('transcript');
      expect(response.body.transcript).not.toHaveProperty('clinicianView');
    });

    test('should return 404 for non-existent session', async () => {
      const response = await request(app)
        .get('/api/symptoms/sessions/non-existent-id?view=clinician')
        .set('Authorization', 'Bearer test-doctor-token')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });
});
