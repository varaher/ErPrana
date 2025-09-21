const { SymptomFeedback, SymptomSession } = require('../models');
const { Op } = require('sequelize');
const fs = require('fs').promises;
const path = require('path');

/**
 * Learning service for self-improving diagnosis system
 */
class LearningService {
  constructor() {
    this.alpha = 0.1; // Learning rate (configurable)
    this.calibrationFile = path.join(__dirname, '../../var/learning/calibration.json');
    this.calibrationData = {};
    this.loadCalibrationData();
  }

  /**
   * Load calibration data from file
   */
  async loadCalibrationData() {
    try {
      const data = await fs.readFile(this.calibrationFile, 'utf8');
      this.calibrationData = JSON.parse(data);
    } catch (error) {
      // File doesn't exist yet, start with empty calibration
      this.calibrationData = {};
      await this.saveCalibrationData();
    }
  }

  /**
   * Save calibration data to file
   */
  async saveCalibrationData() {
    try {
      const dir = path.dirname(this.calibrationFile);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(this.calibrationFile, JSON.stringify(this.calibrationData, null, 2));
    } catch (error) {
      console.error('Error saving calibration data:', error);
    }
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

    // Save updated calibration data
    await this.saveCalibrationData();
    
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

    // Extract condition code from diagnosis (assuming it's in the label or metadata)
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
    // Try to extract from various possible locations
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
   * Sigmoid function for probability conversion
   */
  sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
  }

  /**
   * Logit function for probability conversion
   */
  logit(p) {
    return Math.log(p / (1 - p));
  }

  /**
   * Extract key features for matching historical feedback
   */
  extractKeyFeatures(abcde, vitals, sample, socrates, ageGroup) {
    const features = {
      ageGroup,
      chiefComplaint: this.extractChiefComplaint(sample, socrates),
      topSymptoms: this.extractTopSymptoms(sample, socrates),
      keyVitals: this.extractKeyVitals(vitals),
      riskFactors: this.extractRiskFactors(sample)
    };
    return features;
  }

  /**
   * Extract chief complaint from symptoms and SAMPLE
   */
  extractChiefComplaint(sample, socrates) {
    if (socrates?.site) {
      return socrates.site.toLowerCase();
    }
    if (sample?.signsSymptoms?.length > 0) {
      return sample.signsSymptoms[0].toLowerCase();
    }
    return 'unknown';
  }

  /**
   * Extract top symptoms
   */
  extractTopSymptoms(sample, socrates) {
    const symptoms = [];
    
    // Add SAMPLE symptoms
    if (sample?.signsSymptoms) {
      symptoms.push(...sample.signsSymptoms.slice(0, 3));
    }
    
    // Add SOCRATES associated symptoms
    if (socrates?.associated) {
      symptoms.push(...socrates.associated.slice(0, 2));
    }
    
    return symptoms.map(s => s.toLowerCase()).slice(0, 5);
  }

  /**
   * Extract key vitals for matching
   */
  extractKeyVitals(vitals) {
    const keyVitals = {};
    if (vitals?.hr) keyVitals.hr = vitals.hr;
    if (vitals?.sbp) keyVitals.sbp = vitals.sbp;
    if (vitals?.spo2) keyVitals.spo2 = vitals.spo2;
    if (vitals?.temp) keyVitals.temp = vitals.temp;
    return keyVitals;
  }

  /**
   * Extract risk factors
   */
  extractRiskFactors(sample) {
    return sample?.pastHistory || [];
  }

  /**
   * Fetch historical feedback data matching key features
   */
  async fetchHistoricalFeedback(features, candidateLabels) {
    try {
      // Build query conditions for matching feedback
      const conditions = [];
      
      // Match by age group
      conditions.push({
        '$session.payload.ageGroup$': features.ageGroup
      });

      // Match by chief complaint (if available)
      if (features.chiefComplaint !== 'unknown') {
        conditions.push({
          [Op.or]: [
            { '$session.payload.sample.signsSymptoms$': { [Op.contains]: [features.chiefComplaint] } },
            { '$session.payload.socrates.site$': { [Op.iLike]: `%${features.chiefComplaint}%` } }
          ]
        });
      }

      // Match by top symptoms
      if (features.topSymptoms.length > 0) {
        conditions.push({
          '$session.payload.sample.signsSymptoms$': {
            [Op.overlap]: features.topSymptoms
          }
        });
      }

      // Fetch feedback with session data
      const feedback = await SymptomFeedback.findAll({
        include: [{
          model: SymptomSession,
          as: 'session',
          attributes: ['payload', 'result']
        }],
        where: {
          [Op.and]: conditions,
          confirmedDiagnosis: {
            [Op.not]: null
          }
        },
        order: [['createdAt', 'DESC']],
        limit: 100 // Limit to recent feedback for performance
      });

      return feedback;
    } catch (error) {
      console.error('Error fetching historical feedback:', error);
      return [];
    }
  }

  /**
   * Calculate Bayesian update for diagnosis confidence
   */
  calculateBayesianUpdate(baseConfidence, diagnosisLabel, historicalFeedback) {
    let successes = 0;
    let failures = 0;

    // Count successes and failures for this diagnosis
    historicalFeedback.forEach(feedback => {
      if (feedback.confirmedDiagnosis) {
        const confirmedDx = feedback.confirmedDiagnosis.toLowerCase();
        const candidateDx = diagnosisLabel.toLowerCase();
        
        if (confirmedDx === candidateDx) {
          successes++;
        } else {
          failures++;
        }
      }
    });

    // Apply Bayesian update
    const logitBase = this.logit(Math.max(baseConfidence, 0.01)); // Avoid log(0)
    const update = this.alpha * (successes - failures);
    const newLogit = logitBase + update;
    const newConfidence = this.sigmoid(newLogit);

    return {
      newConfidence: Math.max(0, Math.min(1, newConfidence)), // Clamp to [0,1]
      successes,
      failures,
      update
    };
  }

  /**
   * Apply learning to diagnosis results
   */
  async applyLearning(diagnoses, abcde, vitals, sample, socrates, ageGroup, sourcePack = null) {
    try {
      // Extract key features for matching
      const features = this.extractKeyFeatures(abcde, vitals, sample, socrates, ageGroup);
      
      // Get candidate labels for matching
      const candidateLabels = diagnoses.map(d => d.label);
      
      // Fetch historical feedback
      const historicalFeedback = await this.fetchHistoricalFeedback(features, candidateLabels);
      
      // Apply Bayesian updates to each diagnosis
      const updatedDiagnoses = diagnoses.map(diagnosis => {
        const update = this.calculateBayesianUpdate(
          diagnosis.confidence,
          diagnosis.label,
          historicalFeedback
        );
        
        // Apply calibration if sourcePack is provided
        let calibratedDiagnosis = {
          ...diagnosis,
          confidence: update.newConfidence,
          learningData: {
            successes: update.successes,
            failures: update.failures,
            update: update.update,
            historicalMatches: historicalFeedback.length
          }
        };

        if (sourcePack) {
          const chiefComplaint = features.chiefComplaint;
          calibratedDiagnosis = this.applyCalibration(calibratedDiagnosis, chiefComplaint, ageGroup, sourcePack);
        }
        
        return calibratedDiagnosis;
      });

      // Re-sort by updated confidence
      return updatedDiagnoses.sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      console.error('Error applying learning:', error);
      return diagnoses; // Return original diagnoses if learning fails
    }
  }

  /**
   * Get calibration statistics for a specific topic
   */
  async getCalibrationStats(topic) {
    try {
      const stats = {};
      
      // Filter calibration data by topic
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
    } catch (error) {
      console.error('Error getting calibration stats:', error);
      return null;
    }
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
   * Reset calibration for a specific case
   */
  async resetCalibration(chiefComplaint, conditionCode, ageGroup, sourcePack) {
    const key = this.getCalibrationKey(chiefComplaint, conditionCode, ageGroup, sourcePack);
    
    if (this.calibrationData[key]) {
      delete this.calibrationData[key];
      await this.saveCalibrationData();
      return { success: true, message: 'Calibration reset successfully' };
    }
    
    return { success: false, message: 'No calibration found for this case' };
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
      
      // Count by source pack
      coverage.bySourcePack[sourcePack] = (coverage.bySourcePack[sourcePack] || 0) + 1;
      
      // Count by age group
      coverage.byAgeGroup[ageGroup] = (coverage.byAgeGroup[ageGroup] || 0) + 1;
      
      // Count by chief complaint
      coverage.byChiefComplaint[chiefComplaint] = (coverage.byChiefComplaint[chiefComplaint] || 0) + 1;
    });
    
    return coverage;
  }

  /**
   * Get learning statistics for a diagnosis label
   */
  async getLearningStats(diagnosisLabel) {
    try {
      const feedback = await SymptomFeedback.findAll({
        where: {
          confirmedDiagnosis: {
            [Op.iLike]: `%${diagnosisLabel}%`
          }
        },
        include: [{
          model: SymptomSession,
          as: 'session',
          attributes: ['payload', 'result']
        }]
      });

      const stats = {
        totalFeedback: feedback.length,
        confirmedCount: feedback.filter(f => f.confirmedDiagnosis?.toLowerCase().includes(diagnosisLabel.toLowerCase())).length,
        successRate: feedback.length > 0 ? 
          feedback.filter(f => f.confirmedDiagnosis?.toLowerCase().includes(diagnosisLabel.toLowerCase())).length / feedback.length : 0,
        recentFeedback: feedback.slice(0, 10).map(f => ({
          outcome: f.outcome,
          confirmedDiagnosis: f.confirmedDiagnosis,
          createdAt: f.createdAt
        }))
      };

      return stats;
    } catch (error) {
      console.error('Error getting learning stats:', error);
      return null;
    }
  }
}

module.exports = new LearningService();
