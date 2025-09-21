const request = require('supertest');
const app = require('./src/server');

async function testPlaygroundRoute() {
  console.log('🧪 Testing Triage Playground Route...\n');

  const testPayload = {
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

  try {
    console.log('📤 Sending test payload...');
    const response = await request(app)
      .post('/api/playground')
      .send(testPayload)
      .expect(200);

    console.log('✅ Playground route responded successfully!');
    console.log('\n📊 Triage Result:');
    console.log(`   Priority: ${response.body.result.triage.priority}`);
    console.log(`   Color: ${response.body.result.triage.color}`);
    console.log(`   MAP: ${response.body.result.triage.map}`);
    console.log(`   MEWS: ${response.body.result.triage.mews}`);
    console.log(`   Reasons: ${response.body.result.triage.reasons.join(', ')}`);
    
    console.log('\n🏥 Top 5 Diagnoses:');
    response.body.result.top5.forEach((dx, index) => {
      console.log(`   ${index + 1}. ${dx.label} (${(dx.confidence * 100).toFixed(1)}%)`);
    });

    console.log('\n🚨 Safety Flags:');
    if (response.body.result.safetyFlags.length > 0) {
      response.body.result.safetyFlags.forEach(flag => {
        console.log(`   - ${flag}`);
      });
    } else {
      console.log('   - None detected');
    }

    console.log('\n💡 Advice:');
    console.log(`   ${response.body.result.advice}`);

    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response body:', error.response.body);
    }
    return false;
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testPlaygroundRoute()
    .then(success => {
      if (success) {
        console.log('\n🎉 Playground route test completed successfully!');
        process.exit(0);
      } else {
        console.log('\n💥 Playground route test failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { testPlaygroundRoute };
