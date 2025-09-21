const { User, SymptomSession } = require('../src/models');
const { triageAdult, triagePediatric, ruleBasedDx } = require('../src/lib/clinical');

/**
 * Seed script for canonical scenarios
 * Creates test users and symptom sessions for QA testing
 */

const seedCanonicalScenarios = async () => {
  console.log('🌱 Starting seed process...');

  try {
    // Create test users if they don't exist
    const testUsers = await createTestUsers();
    
    // Create canonical scenarios
    await createAdultACSScenario(testUsers.adult);
    await createPediatricRespiratoryScenario(testUsers.pediatric);
    await createGreenURIScenario(testUsers.adult);

    console.log('✅ Seed process completed successfully!');
  } catch (error) {
    console.error('❌ Seed process failed:', error);
    throw error;
  }
};

const createTestUsers = async () => {
  const users = {};

  // Create adult test user
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
  users.adult = adultUser;

  // Create pediatric test user
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
  users.pediatric = pediatricUser;

  console.log('👥 Test users created/verified');
  return users;
};

const createAdultACSScenario = async (user) => {
  const payload = {
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

  // Calculate triage and diagnoses
  const triageResult = triageAdult(payload.abcde, payload.vitals, payload.sample, payload.socrates);
  const diagnoses = await ruleBasedDx(payload.abcde, payload.vitals, payload.sample, payload.socrates, payload.ageGroup);

  const result = {
    triage: triageResult,
    top5: diagnoses,
    safetyFlags: ['Chest pain', 'Hypotension', 'Tachycardia'],
    advice: 'Seek immediate medical attention. This could be a heart attack.'
  };

  const [session] = await SymptomSession.findOrCreate({
    where: { 
      userId: user.id,
      'payload.age': 65,
      'payload.sample.signsSymptoms': ['chest pain', 'shortness of breath', 'diaphoresis']
    },
    defaults: {
      userId: user.id,
      payload,
      result
    }
  });

  console.log('💔 Adult ACS scenario created:', session.id);
  return session;
};

const createPediatricRespiratoryScenario = async (user) => {
  const payload = {
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

  // Calculate triage and diagnoses
  const triageResult = triagePediatric(payload.abcde, payload.vitals, payload.sample, payload.age, payload.socrates);
  const diagnoses = await ruleBasedDx(payload.abcde, payload.vitals, payload.sample, payload.socrates, payload.ageGroup);

  const result = {
    triage: triageResult,
    top5: diagnoses,
    safetyFlags: ['Wheezing', 'Respiratory distress', 'Hypoxemia'],
    advice: 'Seek urgent medical care. This could be an asthma exacerbation.'
  };

  const [session] = await SymptomSession.findOrCreate({
    where: { 
      userId: user.id,
      'payload.age': 8,
      'payload.abcde.breathing.wheeze': true
    },
    defaults: {
      userId: user.id,
      payload,
      result
    }
  });

  console.log('🫁 Pediatric respiratory scenario created:', session.id);
  return session;
};

const createGreenURIScenario = async (user) => {
  const payload = {
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

  // Calculate triage and diagnoses
  const triageResult = triageAdult(payload.abcde, payload.vitals, payload.sample, payload.socrates);
  const diagnoses = await ruleBasedDx(payload.abcde, payload.vitals, payload.sample, payload.socrates, payload.ageGroup);

  const result = {
    triage: triageResult,
    top5: diagnoses,
    safetyFlags: [],
    advice: 'Monitor symptoms. Rest and fluids recommended.'
  };

  const [session] = await SymptomSession.findOrCreate({
    where: { 
      userId: user.id,
      'payload.age': 35,
      'payload.sample.signsSymptoms': ['sore throat', 'runny nose', 'mild cough']
    },
    defaults: {
      userId: user.id,
      payload,
      result
    }
  });

  console.log('🤧 Green URI scenario created:', session.id);
  return session;
};

// Run seed if called directly
if (require.main === module) {
  const { sequelize } = require('../src/models');
  
  sequelize.sync({ force: false })
    .then(() => {
      console.log('📊 Database synchronized');
      return seedCanonicalScenarios();
    })
    .then(() => {
      console.log('🎯 Seed completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seed failed:', error);
      process.exit(1);
    });
}

module.exports = {
  seedCanonicalScenarios,
  createAdultACSScenario,
  createPediatricRespiratoryScenario,
  createGreenURIScenario
};
