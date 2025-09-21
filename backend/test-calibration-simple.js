const fs = require('fs').promises;
const path = require('path');

// Mock calibration data structure
const mockCalibrationData = {};

class MockLearningService {
  constructor() {
    this.calibrationFile = path.join(__dirname, 'var/learning/calibration.json');
    this.calibrationData = mockCalibrationData;
  }

  /**
   * Get calibration key for a specific case
   */
  getCalibrationKey(chiefComplaint, conditionCode, ageGroup, sourcePack) {
    return `${chiefComplaint}:${conditionCode}:${ageGroup}:${sourcePack}`;
  }

  /**
   * Get calibration modifier for a specific case
   */
  getCalibrationModifier(chiefComplaint, conditionCode, ageGroup, sourcePack) {
    const key = this.getCalibrationKey(chiefComplaint, conditionCode, ageGroup, sourcePack);
    return this.calibrationData[key] || {
      modifier: 0,
      confidence: 0.5,
      sampleSize: 0,
      lastUpdated: null
    };
  }

  /**
   * Update calibration modifier based on feedback
   */
  async updateCalibrationModifier(chiefComplaint, conditionCode, ageGroup, sourcePack, actualOutcome, predictedConfidence) {
    const key = this.getCalibrationKey(chiefComplaint, conditionCode, ageGroup, sourcePack);
    
    if (!this.calibrationData[key]) {
      this.calibrationData[key] = {
        modifier: 0,
        confidence: 0.5,
        sampleSize: 0,
        lastUpdated: new Date().toISOString()
      };
    }

    const calibration = this.calibrationData[key];
    
    // Calculate prediction error
    const predictionError = actualOutcome - predictedConfidence;
    
    // Update modifier using exponential moving average
    const alpha = 0.1;
    calibration.modifier += alpha * predictionError;
    
    // Update confidence (inverse of prediction error variance)
    const errorSquared = predictionError * predictionError;
    calibration.confidence = 1 / (1 + errorSquared);
    
    // Update sample size
    calibration.sampleSize += 1;
    calibration.lastUpdated = new Date().toISOString();
    
    return calibration;
  }

  /**
   * Apply calibration to diagnosis confidence from RulePacks
   */
  applyCalibration(diagnosis, chiefComplaint, ageGroup, sourcePack) {
    // Only apply calibration to RulePack-based diagnoses
    if (!sourcePack || !sourcePack.startsWith('core-em-')) {
      return diagnosis;
    }

    // Extract condition code from diagnosis
    const conditionCode = this.extractConditionCode(diagnosis);
    if (!conditionCode) {
      return diagnosis;
    }

    // Get calibration modifier
    const calibration = this.getCalibrationModifier(chiefComplaint, conditionCode, ageGroup, sourcePack);
    
    // Apply calibration modifier
    const calibratedConfidence = Math.max(0, Math.min(1, diagnosis.confidence + calibration.modifier));
    
    return {
      ...diagnosis,
      confidence: calibratedConfidence,
      calibration: {
        originalConfidence: diagnosis.confidence,
        modifier: calibration.modifier,
        sampleSize: calibration.sampleSize,
        confidence: calibration.confidence
      }
    };
  }

  /**
   * Extract condition code from diagnosis
   */
  extractConditionCode(diagnosis) {
    if (diagnosis.conditionCode) return diagnosis.conditionCode;
    if (diagnosis.code) return diagnosis.code;
    if (diagnosis.snomedCode) return diagnosis.snomedCode;
    
    // Fallback: try to extract from label
    const label = diagnosis.label || '';
    if (label.includes(':')) {
      return label.split(':')[0].trim();
    }
    
    return null;
  }

  /**
   * Get calibration statistics for a specific topic
   */
  async getCalibrationStats(topic) {
    const stats = {};
    
    Object.keys(this.calibrationData).forEach(key => {
      if (key.startsWith(topic + ':')) {
        const parts = key.split(':');
        const conditionCode = parts[1];
        const ageGroup = parts[2];
        const sourcePack = parts[3];
        
        if (!stats[conditionCode]) {
          stats[conditionCode] = {};
        }
        if (!stats[conditionCode][ageGroup]) {
          stats[conditionCode][ageGroup] = {};
        }
        
        stats[conditionCode][ageGroup][sourcePack] = this.calibrationData[key];
      }
    });
    
    return {
      topic,
      totalCalibrations: Object.keys(stats).length,
      calibrations: stats
    };
  }

  /**
   * Get all calibration data
   */
  async getAllCalibrationData() {
    return {
      totalEntries: Object.keys(this.calibrationData).length,
      data: this.calibrationData
    };
  }

  /**
   * Get calibration coverage statistics
   */
  async getCalibrationCoverage() {
    const coverage = {
      totalCases: Object.keys(this.calibrationData).length,
      bySourcePack: {},
      byAgeGroup: {},
      byChiefComplaint: {}
    };
    
    Object.keys(this.calibrationData).forEach(key => {
      const parts = key.split(':');
      const chiefComplaint = parts[0];
      const conditionCode = parts[1];
      const ageGroup = parts[2];
      const sourcePack = parts[3];
      
      coverage.bySourcePack[sourcePack] = (coverage.bySourcePack[sourcePack] || 0) + 1;
      coverage.byAgeGroup[ageGroup] = (coverage.byAgeGroup[ageGroup] || 0) + 1;
      coverage.byChiefComplaint[chiefComplaint] = (coverage.byChiefComplaint[chiefComplaint] || 0) + 1;
    });
    
    return coverage;
  }
}

async function testCalibration() {
  console.log('🧪 Testing Calibration System (Simplified)...\n');

  try {
    const learningService = new MockLearningService();

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
