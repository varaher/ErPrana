const learningService = require('./src/services/learningService');

async function testCalibration() {
  console.log('🧪 Testing Calibration System...\n');

  try {
    // Test 1: Get initial calibration data
    console.log('📋 Test 1: Get initial calibration data');
    const initialData = await learningService.getAllCalibrationData();
    console.log('✅ Initial calibration data:', JSON.stringify(initialData, null, 2));
    console.log('==================================================\n');

    // Test 2: Update calibration modifier
    console.log('📋 Test 2: Update calibration modifier');
    const calibration = await learningService.updateCalibrationModifier(
      'chest_pain',
      '29857009',
      'adult',
      'core-em-wikem',
      0.8, // actual outcome
      0.6  // predicted confidence
    );
    console.log('✅ Updated calibration:', JSON.stringify(calibration, null, 2));
    console.log('==================================================\n');

    // Test 3: Get calibration stats for topic
    console.log('📋 Test 3: Get calibration stats for chest_pain');
    const stats = await learningService.getCalibrationStats('chest_pain');
    console.log('✅ Calibration stats:', JSON.stringify(stats, null, 2));
    console.log('==================================================\n');

    // Test 4: Get calibration coverage
    console.log('📋 Test 4: Get calibration coverage');
    const coverage = await learningService.getCalibrationCoverage();
    console.log('✅ Calibration coverage:', JSON.stringify(coverage, null, 2));
    console.log('==================================================\n');

    // Test 5: Apply calibration to a diagnosis
    console.log('📋 Test 5: Apply calibration to diagnosis');
    const diagnosis = {
      label: '29857009:Chest pain',
      confidence: 0.6,
      source: 'core-em-wikem'
    };
    
    const calibratedDiagnosis = learningService.applyCalibration(
      diagnosis,
      'chest_pain',
      'adult',
      'core-em-wikem'
    );
    console.log('✅ Calibrated diagnosis:', JSON.stringify(calibratedDiagnosis, null, 2));
    console.log('==================================================\n');

    console.log('🎉 All calibration tests passed!');

  } catch (error) {
    console.error('❌ Calibration test failed:', error);
  }
}

// Run the test
testCalibration();
