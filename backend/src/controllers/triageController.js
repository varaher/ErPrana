const { triageAdult, triagePediatric, ruleBasedDx, calcMAP, calcMEWS } = require('../lib/clinical');

/**
 * Stateless triage assessment
 * POST /api/triage/assess
 */
const assessTriage = async (req, res) => {
  try {
    const { abcde, vitals, sample, socrates, age, ageGroup = 'adult' } = req.body;

    // Validate required fields
    if (!abcde || !vitals || !sample) {
      return res.status(400).json({
        error: 'ABCDE, vitals, and SAMPLE are required'
      });
    }

    if (!age || age < 0 || age > 120) {
      return res.status(400).json({
        error: 'Valid age is required (0-120)'
      });
    }

    // Determine age group if not provided
    const determinedAgeGroup = ageGroup || (age < 18 ? 'pediatric' : 'adult');

    // Perform triage assessment
    let triageResult;
    if (determinedAgeGroup === 'pediatric') {
      triageResult = triagePediatric(abcde, vitals, sample, age, socrates);
    } else {
      triageResult = triageAdult(abcde, vitals, sample, socrates);
    }

    // Generate differential diagnosis (now async)
    const top5 = await ruleBasedDx(abcde, vitals, sample, socrates, determinedAgeGroup);

    // Extract diagnoses and provenance from the result
    const diagnoses = top5.diagnoses || top5;
    const provenance = top5.provenance;

    // Add vitals data to result
    const vitalsData = {
      ...vitals,
      map: calcMAP(vitals.sbp, vitals.dbp),
      mews: calcMEWS(vitals)
    };

    // Identify safety flags
    const safetyFlags = [];
    if (abcde.airway === 'obstructed' || abcde.airway === 'stridor') {
      safetyFlags.push('Airway compromise');
    }
    if (abcde.breathing && abcde.breathing.spo2 && abcde.breathing.spo2 < 90) {
      safetyFlags.push('Severe hypoxia');
    }
    if (abcde.circulation && abcde.circulation.sbp && abcde.circulation.sbp < 90) {
      safetyFlags.push('Hypotension');
    }
    if (abcde.disability && abcde.disability.gcs && abcde.disability.gcs < 13) {
      safetyFlags.push('Altered mental status');
    }
    if (abcde.circulation && abcde.circulation.bleeding === 'major') {
      safetyFlags.push('Major bleeding');
    }

    // Generate advice based on triage result
    let advice = triageResult.recommendedAction;
    if (safetyFlags.length > 0) {
      advice += `\n\nSafety concerns: ${safetyFlags.join(', ')}`;
    }

    // Create result object
    const result = {
      triage: triageResult,
      top5: diagnoses,
      safetyFlags,
      advice,
      vitals: vitalsData,
      abcde,
      sample,
      socrates,
      clinicianNotes: `Age: ${age}, Age Group: ${determinedAgeGroup}. ${safetyFlags.length > 0 ? 'Safety flags present: ' + safetyFlags.join(', ') : 'No immediate safety concerns.'}`,
      // Add provenance information for attribution
      provenance: provenance || {
        rulePack: 'core-em-wikem-2024-01-01', // Fallback if not provided
        license: 'CC BY-SA 4.0',
        sourceUrl: 'https://wikem.org/wiki/Main_Page'
      }
    };

    res.json({
      message: 'Triage assessment completed',
      result,
      metadata: {
        age,
        ageGroup: determinedAgeGroup,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error performing triage assessment:', error);
    res.status(500).json({
      error: 'Failed to perform triage assessment'
    });
  }
};

module.exports = {
  assessTriage
};
