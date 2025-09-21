const cron = require('node-cron');
const { SymptomFeedback, SymptomSession } = require('../models');
const { Op } = require('sequelize');

/**
 * Cron service for daily summary statistics
 */
class CronService {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * Initialize cron jobs
   */
  init() {
    if (this.isInitialized) {
      return;
    }

    // Daily summary statistics computation (runs at 2 AM every day)
    cron.schedule('0 2 * * *', async () => {
      console.log('🕐 Running daily summary statistics computation...');
      try {
        await this.computeDailySummaryStats();
        console.log('✅ Daily summary statistics computation completed');
      } catch (error) {
        console.error('❌ Error in daily summary statistics computation:', error);
      }
    }, {
      scheduled: true,
      timezone: "UTC"
    });

    // Weekly learning analytics (runs every Sunday at 3 AM)
    cron.schedule('0 3 * * 0', async () => {
      console.log('🕐 Running weekly learning analytics...');
      try {
        await this.computeWeeklyLearningAnalytics();
        console.log('✅ Weekly learning analytics completed');
      } catch (error) {
        console.error('❌ Error in weekly learning analytics:', error);
      }
    }, {
      scheduled: true,
      timezone: "UTC"
    });

    this.isInitialized = true;
    console.log('🚀 Cron service initialized');
  }

  /**
   * Compute daily summary statistics for diagnosis labels
   */
  async computeDailySummaryStats() {
    try {
      // Get all feedback from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const feedback = await SymptomFeedback.findAll({
        where: {
          createdAt: {
            [Op.gte]: thirtyDaysAgo
          },
          confirmedDiagnosis: {
            [Op.not]: null
          }
        },
        include: [{
          model: SymptomSession,
          as: 'session',
          attributes: ['payload', 'result']
        }],
        order: [['createdAt', 'DESC']]
      });

      // Group feedback by diagnosis label
      const diagnosisStats = {};
      
      feedback.forEach(f => {
        if (f.confirmedDiagnosis) {
          const diagnosis = f.confirmedDiagnosis.toLowerCase().trim();
          
          if (!diagnosisStats[diagnosis]) {
            diagnosisStats[diagnosis] = {
              totalFeedback: 0,
              confirmedCount: 0,
              successRate: 0,
              recentFeedback: [],
              ageGroups: {},
              commonSymptoms: {},
              averageConfidence: 0,
              totalConfidence: 0
            };
          }

          const stats = diagnosisStats[diagnosis];
          stats.totalFeedback++;
          stats.confirmedCount++;

          // Track age groups
          const ageGroup = f.session?.payload?.ageGroup || 'unknown';
          stats.ageGroups[ageGroup] = (stats.ageGroups[ageGroup] || 0) + 1;

          // Track common symptoms
          const symptoms = f.session?.payload?.sample?.signsSymptoms || [];
          symptoms.forEach(symptom => {
            const symptomKey = symptom.toLowerCase();
            stats.commonSymptoms[symptomKey] = (stats.commonSymptoms[symptomKey] || 0) + 1;
          });

          // Track confidence from original diagnosis
          if (f.session?.result?.top5) {
            const originalDx = f.session.result.top5.find(d => 
              d.label.toLowerCase().includes(diagnosis) || 
              diagnosis.includes(d.label.toLowerCase())
            );
            if (originalDx) {
              stats.totalConfidence += originalDx.confidence || 0;
            }
          }

          // Track recent feedback (last 10)
          if (stats.recentFeedback.length < 10) {
            stats.recentFeedback.push({
              outcome: f.outcome,
              confirmedDiagnosis: f.confirmedDiagnosis,
              createdAt: f.createdAt,
              ageGroup: f.session?.payload?.ageGroup,
              symptoms: f.session?.payload?.sample?.signsSymptoms?.slice(0, 3) || []
            });
          }
        }
      });

      // Calculate success rates and average confidence
      Object.keys(diagnosisStats).forEach(diagnosis => {
        const stats = diagnosisStats[diagnosis];
        stats.successRate = stats.totalFeedback > 0 ? stats.confirmedCount / stats.totalFeedback : 0;
        stats.averageConfidence = stats.totalConfidence > 0 ? stats.totalConfidence / stats.confirmedCount : 0;
        
        // Sort common symptoms by frequency
        stats.commonSymptoms = Object.entries(stats.commonSymptoms)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .reduce((obj, [key, value]) => {
            obj[key] = value;
            return obj;
          }, {});
      });

      // Store summary stats (you could store this in a separate table or cache)
      console.log('📊 Daily summary statistics computed:', {
        totalFeedback: feedback.length,
        uniqueDiagnoses: Object.keys(diagnosisStats).length,
        topDiagnoses: Object.entries(diagnosisStats)
          .sort(([,a], [,b]) => b.totalFeedback - a.totalFeedback)
          .slice(0, 5)
          .map(([diagnosis, stats]) => ({
            diagnosis,
            totalFeedback: stats.totalFeedback,
            successRate: stats.successRate.toFixed(3),
            averageConfidence: stats.averageConfidence.toFixed(3)
          }))
      });

      return diagnosisStats;
    } catch (error) {
      console.error('Error computing daily summary stats:', error);
      throw error;
    }
  }

  /**
   * Compute weekly learning analytics
   */
  async computeWeeklyLearningAnalytics() {
    try {
      // Get feedback from the last week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const feedback = await SymptomFeedback.findAll({
        where: {
          createdAt: {
            [Op.gte]: oneWeekAgo
          }
        },
        include: [{
          model: SymptomSession,
          as: 'session',
          attributes: ['payload', 'result']
        }],
        order: [['createdAt', 'DESC']]
      });

      // Analyze learning patterns
      const analytics = {
        totalFeedback: feedback.length,
        feedbackByOutcome: {},
        feedbackByAgeGroup: {},
        diagnosisAccuracy: {},
        learningProgress: {}
      };

      feedback.forEach(f => {
        // Count by outcome
        analytics.feedbackByOutcome[f.outcome] = (analytics.feedbackByOutcome[f.outcome] || 0) + 1;

        // Count by age group
        const ageGroup = f.session?.payload?.ageGroup || 'unknown';
        analytics.feedbackByAgeGroup[ageGroup] = (analytics.feedbackByAgeGroup[ageGroup] || 0) + 1;

        // Analyze diagnosis accuracy
        if (f.confirmedDiagnosis && f.session?.result?.top5) {
          const confirmedDx = f.confirmedDiagnosis.toLowerCase();
          const originalDx = f.session.result.top5.find(d => 
            d.label.toLowerCase().includes(confirmedDx) || 
            confirmedDx.includes(d.label.toLowerCase())
          );

          if (originalDx) {
            const diagnosisKey = confirmedDx;
            if (!analytics.diagnosisAccuracy[diagnosisKey]) {
              analytics.diagnosisAccuracy[diagnosisKey] = {
                total: 0,
                correct: 0,
                accuracy: 0,
                averageConfidence: 0,
                totalConfidence: 0
              };
            }

            const accuracy = analytics.diagnosisAccuracy[diagnosisKey];
            accuracy.total++;
            accuracy.correct++;
            accuracy.totalConfidence += originalDx.confidence || 0;
            accuracy.accuracy = accuracy.correct / accuracy.total;
            accuracy.averageConfidence = accuracy.totalConfidence / accuracy.total;
          }
        }
      });

      console.log('📈 Weekly learning analytics computed:', {
        totalFeedback: analytics.totalFeedback,
        feedbackByOutcome: analytics.feedbackByOutcome,
        feedbackByAgeGroup: analytics.feedbackByAgeGroup,
        topAccurateDiagnoses: Object.entries(analytics.diagnosisAccuracy)
          .sort(([,a], [,b]) => b.accuracy - a.accuracy)
          .slice(0, 5)
          .map(([diagnosis, stats]) => ({
            diagnosis,
            accuracy: stats.accuracy.toFixed(3),
            totalCases: stats.total,
            averageConfidence: stats.averageConfidence.toFixed(3)
          }))
      });

      return analytics;
    } catch (error) {
      console.error('Error computing weekly learning analytics:', error);
      throw error;
    }
  }

  /**
   * Get current summary statistics (for API endpoints)
   */
  async getCurrentSummaryStats() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const feedback = await SymptomFeedback.findAll({
        where: {
          createdAt: {
            [Op.gte]: thirtyDaysAgo
          },
          confirmedDiagnosis: {
            [Op.not]: null
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
        feedbackByOutcome: {},
        topDiagnoses: {},
        ageGroupDistribution: {},
        recentActivity: feedback.slice(0, 10).map(f => ({
          outcome: f.outcome,
          confirmedDiagnosis: f.confirmedDiagnosis,
          createdAt: f.createdAt,
          ageGroup: f.session?.payload?.ageGroup
        }))
      };

      feedback.forEach(f => {
        // Count by outcome
        stats.feedbackByOutcome[f.outcome] = (stats.feedbackByOutcome[f.outcome] || 0) + 1;

        // Count by age group
        const ageGroup = f.session?.payload?.ageGroup || 'unknown';
        stats.ageGroupDistribution[ageGroup] = (stats.ageGroupDistribution[ageGroup] || 0) + 1;

        // Count by diagnosis
        if (f.confirmedDiagnosis) {
          const diagnosis = f.confirmedDiagnosis.toLowerCase().trim();
          stats.topDiagnoses[diagnosis] = (stats.topDiagnoses[diagnosis] || 0) + 1;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting current summary stats:', error);
      throw error;
    }
  }
}

module.exports = new CronService();
