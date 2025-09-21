const learningService = require('../services/learningService');
const { loadRulePack } = require('../rule-engine/ruleLoader.js');
const { processTriage } = require('../rule-engine/ruleEngine.js');

/**
 * Clinical constants for MEWS scoring
 */
const MEWS_THRESHOLDS = {
  HEART_RATE: {
    NORMAL: { min: 60, max: 100 },
    MODERATE: { min: 50, max: 120 },
    SEVERE: { min: 40, max: 130 }
  },
  RESPIRATORY_RATE: {
    NORMAL: { min: 12, max: 16 },
    MODERATE: { min: 10, max: 20 },
    SEVERE: { min: 8, max: 25 }
  },
  SYSTOLIC_BP: {
    NORMAL: { min: 90, max: 160 },
    MODERATE: { min: 80, max: 180 },
    SEVERE: { min: 70, max: 200 }
  },
  TEMPERATURE: {
    NORMAL: { min: 36, max: 38 },
    MODERATE: { min: 35, max: 39 }
  },
  GCS: {
    NORMAL: { min: 15, max: 15 },
    MODERATE: { min: 13, max: 14 },
    SEVERE: { min: 9, max: 12 },
    CRITICAL: { min: 3, max: 8 }
  }
};

/**
 * Calculate Mean Arterial Pressure (MAP)
 * MAP = (SBP + 2*DBP)/3
 */
function calcMAP(sbp, dbp) {
  if (!sbp || !dbp) return undefined;
  return Math.round((sbp + 2 * dbp) / 3);
}

/**
 * Calculate Modified Early Warning Score (MEWS)
 * Simple MEWS rules based on HR, RR, SBP, temp, consciousness
 */
function calcMEWS(vitals) {
  let score = 0;

  // Heart Rate
  if (vitals.hr) {
    if (vitals.hr < MEWS_THRESHOLDS.HEART_RATE.SEVERE.min || vitals.hr > MEWS_THRESHOLDS.HEART_RATE.SEVERE.max) {
      score += 3;
    } else if (vitals.hr < MEWS_THRESHOLDS.HEART_RATE.MODERATE.min || vitals.hr > MEWS_THRESHOLDS.HEART_RATE.MODERATE.max) {
      score += 2;
    } else if (vitals.hr < MEWS_THRESHOLDS.HEART_RATE.NORMAL.min || vitals.hr > MEWS_THRESHOLDS.HEART_RATE.NORMAL.max) {
      score += 1;
    }
  }

  // Respiratory Rate
  if (vitals.rr) {
    if (vitals.rr < MEWS_THRESHOLDS.RESPIRATORY_RATE.SEVERE.min || vitals.rr > MEWS_THRESHOLDS.RESPIRATORY_RATE.SEVERE.max) {
      score += 3;
    } else if (vitals.rr < MEWS_THRESHOLDS.RESPIRATORY_RATE.MODERATE.min || vitals.rr > MEWS_THRESHOLDS.RESPIRATORY_RATE.MODERATE.max) {
      score += 2;
    } else if (vitals.rr < MEWS_THRESHOLDS.RESPIRATORY_RATE.NORMAL.min || vitals.rr > MEWS_THRESHOLDS.RESPIRATORY_RATE.NORMAL.max) {
      score += 1;
    }
  }

  // Systolic Blood Pressure
  if (vitals.sbp) {
    if (vitals.sbp < MEWS_THRESHOLDS.SYSTOLIC_BP.SEVERE.min || vitals.sbp > MEWS_THRESHOLDS.SYSTOLIC_BP.SEVERE.max) {
      score += 3;
    } else if (vitals.sbp < MEWS_THRESHOLDS.SYSTOLIC_BP.MODERATE.min || vitals.sbp > MEWS_THRESHOLDS.SYSTOLIC_BP.MODERATE.max) {
      score += 2;
    } else if (vitals.sbp < MEWS_THRESHOLDS.SYSTOLIC_BP.NORMAL.min || vitals.sbp > MEWS_THRESHOLDS.SYSTOLIC_BP.NORMAL.max) {
      score += 1;
    }
  }

  // Temperature
  if (vitals.temp) {
    if (vitals.temp < MEWS_THRESHOLDS.TEMPERATURE.MODERATE.min || vitals.temp > MEWS_THRESHOLDS.TEMPERATURE.MODERATE.max) {
      score += 2;
    } else if (vitals.temp < MEWS_THRESHOLDS.TEMPERATURE.NORMAL.min || vitals.temp > MEWS_THRESHOLDS.TEMPERATURE.NORMAL.max) {
      score += 1;
    }
  }

  // Consciousness (GCS or AVPU)
  if (vitals.gcs) {
    if (vitals.gcs < MEWS_THRESHOLDS.GCS.CRITICAL.max) {
      score += 3;
    } else if (vitals.gcs < MEWS_THRESHOLDS.GCS.SEVERE.max) {
      score += 2;
    } else if (vitals.gcs < MEWS_THRESHOLDS.GCS.MODERATE.max) {
      score += 1;
    }
  }

  return score;
}

/**
 * Triage assessment for adults
 */
function triageAdult(abcde, vitals, sample, socrates) {
  let priority = 'Priority IV';
  let color = 'Green';
  let reasons = [];
  let map = calcMAP(vitals.sbp, vitals.dbp);
  let mews = calcMEWS(vitals);

  // Priority I (Red) - Immediate life-threatening
  if (
    // Cardiac/respiratory arrest
    (abcde.airway === 'obstructed' || abcde.airway === 'stridor') ||
    // Severe shock
    (map && map < 65) ||
    (vitals.sbp && vitals.sbp < 90 && (vitals.hr > 100 || vitals.rr > 20)) ||
    // GCS < 8
    (abcde.disability && abcde.disability.gcs && abcde.disability.gcs < 8) ||
    // Active seizure
    (abcde.disability && abcde.disability.seizure && abcde.disability.seizure) ||
    // Severe respiratory distress
    (abcde.breathing && abcde.breathing.spo2 && abcde.breathing.spo2 < 90 && abcde.breathing.distress) ||
    // Major bleeding
    (abcde.circulation && abcde.circulation.bleeding === 'major') ||
    // Cardiac arrest signs
    (abcde.circulation && abcde.circulation.hr && abcde.circulation.hr === 0) ||
    (abcde.breathing && abcde.breathing.rr && abcde.breathing.rr === 0)
  ) {
    priority = 'Priority I';
    color = 'Red';
    reasons.push('Life-threatening condition detected');
  }
  // Priority II (Orange) - Urgent
  else if (
    // Severe chest pain
    (socrates && socrates.character && (socrates.character.includes('crushing') || socrates.character.includes('pressure'))) ||
    // Suspected stroke symptoms
    (abcde.disability && abcde.disability.focalDeficit && abcde.disability.focalDeficit) ||
    // Severe pain NRS >= 9
    (socrates && socrates.severityNRS && socrates.severityNRS >= 9) ||
    // Sepsis suspicion
    ((vitals.temp && (vitals.temp > 38.5 || vitals.temp < 36)) && (vitals.hr && vitals.hr > 100) && (vitals.sbp && vitals.sbp < 100)) ||
    // DKA suspicion
    (abcde.disability && abcde.disability.glucose && abcde.disability.glucose > 250) ||
    // Open fractures
    (abcde.exposure && abcde.exposure.trauma && sample.events && sample.events.includes('fracture')) ||
    // Hypoglycemic emergency
    (abcde.disability && abcde.disability.glucose && abcde.disability.glucose < 50) ||
    // Moderate respiratory distress
    (abcde.breathing && abcde.breathing.spo2 && abcde.breathing.spo2 < 95 && abcde.breathing.distress) ||
    // Moderate shock
    (map && map < 75) ||
    (vitals.sbp && vitals.sbp < 100)
  ) {
    priority = 'Priority II';
    color = 'Orange';
    reasons.push('Urgent condition requiring prompt attention');
  }
  // Priority III (Yellow) - Semi-urgent
  else if (
    // Moderate trauma
    (abcde.exposure && abcde.exposure.trauma && !sample.events.includes('major')) ||
    // Acute abdomen
    (socrates && socrates.site && socrates.site.includes('abdomen') && socrates.character && socrates.character.includes('sharp')) ||
    // Dehydration
    (sample.events && sample.events.includes('dehydration')) ||
    // UTI with flank pain but stable vitals
    (socrates && socrates.site && socrates.site.includes('flank') && vitals.sbp && vitals.sbp >= 100) ||
    // Allergic reactions without airway compromise
    (sample.allergies && sample.allergies.length > 0 && abcde.airway === 'clear') ||
    // Mild respiratory symptoms
    (abcde.breathing && abcde.breathing.spo2 && abcde.breathing.spo2 < 98) ||
    // Mild pain
    (socrates && socrates.severityNRS && socrates.severityNRS >= 5 && socrates.severityNRS < 9)
  ) {
    priority = 'Priority III';
    color = 'Yellow';
    reasons.push('Semi-urgent condition');
  }

  let recommendedAction = '';
  switch (priority) {
    case 'Priority I':
      recommendedAction = 'Call emergency services immediately (911) - Life-threatening condition';
      break;
    case 'Priority II':
      recommendedAction = 'Seek urgent medical care within 1-2 hours';
      break;
    case 'Priority III':
      recommendedAction = 'Seek medical care within 4-6 hours';
      break;
    default:
      recommendedAction = 'Monitor symptoms and seek care if worsening';
  }

  return {
    priority,
    color,
    reasons,
    map,
    mews,
    recommendedAction
  };
}

/**
 * Triage assessment for pediatric patients
 */
function triagePediatric(abcde, vitals, sample, age, socrates) {
  let priority = 'Priority IV';
  let color = 'Green';
  let reasons = [];
  let map = calcMAP(vitals.sbp, vitals.dbp);
  let mews = calcMEWS(vitals);

  // Pediatric-specific criteria
  const isInfant = age < 1;
  const isChild = age >= 1 && age < 12;

  // Priority I (Red) - Immediate life-threatening
  if (
    // Arrest/airway/severe shock
    (abcde.airway === 'obstructed' || abcde.airway === 'stridor') ||
    // Severe shock (age-adjusted vitals)
    (isInfant && vitals.hr && vitals.hr > 180) ||
    (isChild && vitals.hr && vitals.hr > 160) ||
    (vitals.sbp && vitals.sbp < 70) ||
    // Active seizure
    (abcde.disability && abcde.disability.seizure && abcde.disability.seizure) ||
    // SpO2 < 94 with distress
    (abcde.breathing && abcde.breathing.spo2 && abcde.breathing.spo2 < 94 && abcde.breathing.distress) ||
    // Severe dehydration (≥2 signs)
    (sample.events && sample.events.includes('dehydration') && (vitals.hr > 140 || vitals.sbp < 80)) ||
    // Major trauma/bleeding/poisoning
    (abcde.circulation && abcde.circulation.bleeding === 'major') ||
    (sample.events && (sample.events.includes('major trauma') || sample.events.includes('poisoning')))
  ) {
    priority = 'Priority I';
    color = 'Red';
    reasons.push('Life-threatening pediatric condition');
  }
  // Priority II (Orange) - Urgent
  else if (
    // GCS 9-12 stable airway
    (abcde.disability && abcde.disability.gcs && abcde.disability.gcs >= 9 && abcde.disability.gcs <= 12 && abcde.airway === 'clear') ||
    // Seizures last 4-24h
    (abcde.disability && abcde.disability.seizure && sample.events && sample.events.includes('seizure')) ||
    // Neck stiffness
    (socrates && socrates.site && socrates.site.includes('neck') && socrates.character && socrates.character.includes('stiff')) ||
    // Immunocompromised with fever
    (sample.pastHistory && sample.pastHistory.some(h => h.includes('immunocompromised')) && vitals.temp && vitals.temp > 38) ||
    // Moderate respiratory distress
    (abcde.breathing && abcde.breathing.spo2 && abcde.breathing.spo2 < 96 && abcde.breathing.distress) ||
    // Moderate shock
    (isInfant && vitals.hr && vitals.hr > 160) ||
    (isChild && vitals.hr && vitals.hr > 140) ||
    (vitals.sbp && vitals.sbp < 80)
  ) {
    priority = 'Priority II';
    color = 'Orange';
    reasons.push('Urgent pediatric condition');
  }
  // Priority III (Yellow) - Semi-urgent
  else if (
    // Abdominal pain
    (socrates && socrates.site && socrates.site.includes('abdomen')) ||
    // Burns (non-major)
    (abcde.exposure && abcde.exposure.burns && abcde.exposure.burns === 'minor') ||
    // DKA
    (abcde.disability && abcde.disability.glucose && abcde.disability.glucose > 250) ||
    // Hypoglycemia resolving
    (abcde.disability && abcde.disability.glucose && abcde.disability.glucose < 70) ||
    // Moderate dehydration
    (sample.events && sample.events.includes('dehydration')) ||
    // Active bleeding but stable
    (abcde.circulation && abcde.circulation.bleeding === 'minor' && vitals.sbp && vitals.sbp >= 80)
  ) {
    priority = 'Priority III';
    color = 'Yellow';
    reasons.push('Semi-urgent pediatric condition');
  }

  let recommendedAction = '';
  switch (priority) {
    case 'Priority I':
      recommendedAction = 'Call emergency services immediately (911) - Life-threatening pediatric condition';
      break;
    case 'Priority II':
      recommendedAction = 'Seek urgent pediatric care within 1-2 hours';
      break;
    case 'Priority III':
      recommendedAction = 'Seek pediatric care within 4-6 hours';
      break;
    default:
      recommendedAction = 'Monitor symptoms and seek care if worsening';
  }

  return {
    priority,
    color,
    reasons,
    map,
    mews,
    recommendedAction
  };
}

/**
 * Generate provenance information for clinical decisions
 * @param {string} ruleSource - Source of the rules (e.g., 'wikem', 'clinical-guidelines')
 * @returns {Object} Provenance information
 */
function generateProvenance(ruleSource = 'wikem') {
  const provenanceMap = {
    wikem: {
      rulePack: 'core-em-wikem-2024-01-01',
      license: 'CC BY-SA 4.0',
      sourceUrl: 'https://wikem.org/wiki/Main_Page'
    },
    'clinical-guidelines': {
      rulePack: 'clinical-guidelines-v1.0',
      license: 'Proprietary',
      sourceUrl: null
    }
  };

  return provenanceMap[ruleSource] || provenanceMap.wikem;
}

/**
 * Rule-based differential diagnosis with learning capabilities
 */
async function ruleBasedDx(abcde, vitals, sample, socrates, ageGroup = 'adult') {
  // Try to use rule engine first
  try {
    // Determine the primary topic from assessment data
    const primaryTopic = determinePrimaryTopic(abcde, vitals, sample, socrates);
    
    if (primaryTopic) {
      // Prepare patient data for rule engine
      const patientData = {
        abcde, vitals, sample, socrates, ageGroup
      };
      
      // Try to apply rules from rule packs
      const ruleResult = await processTriage(patientData, primaryTopic);
      
      if (ruleResult.success && ruleResult.triageLevel !== 'web-fallback-needed') {
        // Convert rule results to diagnoses format
        const ruleBasedDiagnoses = [{
          label: `Rule-based: ${primaryTopic}`,
          confidence: ruleResult.confidence,
          rationale: ruleResult.reasoning,
          source: ruleResult.source,
          triageLevel: ruleResult.triageLevel,
          coverage: ruleResult.coverage
        }];
        
        // Apply learning with calibration if available
        try {
          const learnedDiagnoses = await learningService.applyLearning(
            ruleBasedDiagnoses,
            abcde,
            vitals,
            sample,
            socrates,
            ageGroup,
            ruleResult.source // Pass sourcePack for calibration
          );
          
          return {
            diagnoses: learnedDiagnoses,
            provenance: generateProvenance(ruleResult.source === 'core-em' ? 'clinical-guidelines' : 'wikem')
          };
        } catch (error) {
          console.error('Error applying learning to rule-based diagnoses:', error);
          return {
            diagnoses: ruleBasedDiagnoses,
            provenance: generateProvenance(ruleResult.source === 'core-em' ? 'clinical-guidelines' : 'wikem')
          };
        }
      }
    }
  } catch (error) {
    console.warn('Rule engine failed, falling back to hardcoded rules:', error);
  }

  // Fallback to hardcoded rules
  const conditions = [
    {
      name: 'Acute Coronary Syndrome',
      features: [
        { feature: 'crushing_chest_pain', weight: 0.3, check: () => socrates?.character?.includes('crushing') || socrates?.character?.includes('pressure') },
        { feature: 'radiation_to_arm_jaw', weight: 0.25, check: () => socrates?.radiation?.some(r => r.includes('arm') || r.includes('jaw')) },
        { feature: 'diaphoresis', weight: 0.15, check: () => socrates?.associated?.some(a => a.includes('sweat') || a.includes('diaphoresis')) },
        { feature: 'risk_factors', weight: 0.1, check: () => sample?.pastHistory?.some(h => h.includes('diabetes') || h.includes('hypertension') || h.includes('smoking')) },
        { feature: 'hypotension', weight: 0.1, check: () => vitals?.sbp && vitals.sbp < 100 },
        { feature: 'tachycardia', weight: 0.1, check: () => vitals?.hr && vitals.hr > 100 }
      ],
      rationale: 'Chest pain with typical cardiac features'
    },
    {
      name: 'Pulmonary Embolism',
      features: [
        { feature: 'dyspnea', weight: 0.3, check: () => socrates?.associated?.some(a => a.includes('dyspnea') || a.includes('shortness')) },
        { feature: 'hypoxia', weight: 0.25, check: () => vitals?.spo2 && vitals.spo2 < 95 },
        { feature: 'tachycardia', weight: 0.2, check: () => vitals?.hr && vitals.hr > 100 },
        { feature: 'dvt_history', weight: 0.15, check: () => sample?.pastHistory?.some(h => h.includes('DVT') || h.includes('clot')) },
        { feature: 'sudden_onset', weight: 0.1, check: () => socrates?.onset === 'sudden' }
      ],
      rationale: 'Dyspnea with hypoxia and tachycardia'
    },
    {
      name: 'Pneumonia',
      features: [
        { feature: 'cough', weight: 0.25, check: () => socrates?.associated?.some(a => a.includes('cough')) },
        { feature: 'fever', weight: 0.25, check: () => vitals?.temp && vitals.temp > 38 },
        { feature: 'hypoxia', weight: 0.2, check: () => vitals?.spo2 && vitals.spo2 < 95 },
        { feature: 'wheezing', weight: 0.15, check: () => abcde?.breathing?.wheeze },
        { feature: 'respiratory_distress', weight: 0.15, check: () => abcde?.breathing?.distress }
      ],
      rationale: 'Respiratory symptoms with fever and hypoxia'
    },
    {
      name: 'Asthma/COPD Exacerbation',
      features: [
        { feature: 'wheezing', weight: 0.3, check: () => abcde?.breathing?.wheeze },
        { feature: 'respiratory_distress', weight: 0.25, check: () => abcde?.breathing?.distress },
        { feature: 'hypoxia', weight: 0.2, check: () => vitals?.spo2 && vitals.spo2 < 95 },
        { feature: 'asthma_history', weight: 0.15, check: () => sample?.pastHistory?.some(h => h.includes('asthma') || h.includes('COPD')) },
        { feature: 'cough', weight: 0.1, check: () => socrates?.associated?.some(a => a.includes('cough')) }
      ],
      rationale: 'Wheezing with respiratory distress'
    },
    {
      name: 'Stroke/TIA',
      features: [
        { feature: 'focal_deficit', weight: 0.35, check: () => abcde?.disability?.focalDeficit },
        { feature: 'sudden_onset', weight: 0.25, check: () => socrates?.onset === 'sudden' },
        { feature: 'altered_consciousness', weight: 0.2, check: () => abcde?.disability?.gcs && abcde.disability.gcs < 15 },
        { feature: 'stroke_history', weight: 0.1, check: () => sample?.pastHistory?.some(h => h.includes('stroke') || h.includes('TIA')) },
        { feature: 'speech_problems', weight: 0.1, check: () => socrates?.associated?.some(a => a.includes('speech') || a.includes('slurred')) }
      ],
      rationale: 'Focal neurological deficit with sudden onset'
    },
    {
      name: 'Sepsis',
      features: [
        { feature: 'fever', weight: 0.25, check: () => vitals?.temp && vitals.temp > 38.5 },
        { feature: 'tachycardia', weight: 0.2, check: () => vitals?.hr && vitals.hr > 100 },
        { feature: 'hypotension', weight: 0.2, check: () => vitals?.sbp && vitals.sbp < 100 },
        { feature: 'tachypnea', weight: 0.15, check: () => vitals?.rr && vitals.rr > 20 },
        { feature: 'poor_perfusion', weight: 0.1, check: () => abcde?.circulation?.capRefillSec && abcde.circulation.capRefillSec > 2 },
        { feature: 'infection_source', weight: 0.1, check: () => sample?.events?.includes('infection') || sample?.events?.includes('surgery') }
      ],
      rationale: 'Systemic inflammatory response with organ dysfunction'
    },
    {
      name: 'Diabetic Ketoacidosis',
      features: [
        { feature: 'hyperglycemia', weight: 0.3, check: () => abcde?.disability?.glucose && abcde.disability.glucose > 250 },
        { feature: 'polyuria', weight: 0.2, check: () => socrates?.associated?.some(a => a.includes('urination') || a.includes('thirst')) },
        { feature: 'diabetes_history', weight: 0.2, check: () => sample?.pastHistory?.some(h => h.includes('diabetes')) },
        { feature: 'dehydration', weight: 0.15, check: () => sample?.events?.includes('dehydration') },
        { feature: 'abdominal_pain', weight: 0.15, check: () => socrates?.site?.includes('abdomen') }
      ],
      rationale: 'Hyperglycemia with polyuria/polydipsia'
    },
    {
      name: 'Appendicitis',
      features: [
        { feature: 'rlq_pain', weight: 0.3, check: () => socrates?.site?.includes('right lower quadrant') },
        { feature: 'sharp_pain', weight: 0.2, check: () => socrates?.character?.includes('sharp') },
        { feature: 'fever', weight: 0.15, check: () => vitals?.temp && vitals.temp > 37.5 },
        { feature: 'nausea_vomiting', weight: 0.15, check: () => socrates?.associated?.some(a => a.includes('nausea') || a.includes('vomiting')) },
        { feature: 'anorexia', weight: 0.1, check: () => sample?.lastMeal?.includes('none') || sample?.lastMeal?.includes('refused') },
        { feature: 'migration_pain', weight: 0.1, check: () => socrates?.timeCourse?.includes('migrated') }
      ],
      rationale: 'RLQ pain with fever and GI symptoms'
    },
    {
      name: 'Gastrointestinal Bleed',
      features: [
        { feature: 'bleeding', weight: 0.3, check: () => abcde?.circulation?.bleeding && abcde.circulation.bleeding !== 'none' },
        { feature: 'hematemesis', weight: 0.25, check: () => socrates?.associated?.some(a => a.includes('blood') || a.includes('black')) },
        { feature: 'hypotension', weight: 0.2, check: () => vitals?.sbp && vitals.sbp < 100 },
        { feature: 'tachycardia', weight: 0.15, check: () => vitals?.hr && vitals.hr > 100 },
        { feature: 'anemia_history', weight: 0.1, check: () => sample?.pastHistory?.some(h => h.includes('anemia') || h.includes('ulcer')) }
      ],
      rationale: 'Evidence of bleeding with hemodynamic compromise'
    },
    {
      name: 'Renal Colic',
      features: [
        { feature: 'colicky_pain', weight: 0.3, check: () => socrates?.character?.includes('colicky') },
        { feature: 'flank_pain', weight: 0.25, check: () => socrates?.site?.includes('flank') },
        { feature: 'nausea_vomiting', weight: 0.15, check: () => socrates?.associated?.some(a => a.includes('nausea') || a.includes('vomiting')) },
        { feature: 'kidney_stone_history', weight: 0.15, check: () => sample?.pastHistory?.some(h => h.includes('kidney') || h.includes('stone')) },
        { feature: 'hematuria', weight: 0.1, check: () => socrates?.associated?.some(a => a.includes('blood') || a.includes('urine')) },
        { feature: 'urinary_symptoms', weight: 0.05, check: () => socrates?.associated?.some(a => a.includes('urination') || a.includes('frequency')) }
      ],
      rationale: 'Colicky flank pain with nausea/vomiting'
    },
    {
      name: 'Urinary Tract Infection',
      features: [
        { feature: 'dysuria', weight: 0.3, check: () => socrates?.associated?.some(a => a.includes('burning') || a.includes('painful')) },
        { feature: 'frequency', weight: 0.2, check: () => socrates?.associated?.some(a => a.includes('frequency') || a.includes('urgency')) },
        { feature: 'fever', weight: 0.15, check: () => vitals?.temp && vitals.temp > 37.5 },
        { feature: 'flank_pain', weight: 0.15, check: () => socrates?.site?.includes('flank') },
        { feature: 'uti_history', weight: 0.1, check: () => sample?.pastHistory?.some(h => h.includes('UTI') || h.includes('urinary')) },
        { feature: 'female_gender', weight: 0.1, check: () => sample?.sex === 'female' }
      ],
      rationale: 'Dysuria with frequency and urgency'
    },
    {
      name: 'Migraine',
      features: [
        { feature: 'unilateral_headache', weight: 0.25, check: () => socrates?.site?.includes('head') && socrates?.character?.includes('throbbing') },
        { feature: 'photophobia', weight: 0.2, check: () => socrates?.associated?.some(a => a.includes('light') || a.includes('photophobia')) },
        { feature: 'nausea', weight: 0.15, check: () => socrates?.associated?.some(a => a.includes('nausea')) },
        { feature: 'migraine_history', weight: 0.2, check: () => sample?.pastHistory?.some(h => h.includes('migraine')) },
        { feature: 'aura', weight: 0.1, check: () => socrates?.associated?.some(a => a.includes('aura') || a.includes('visual')) },
        { feature: 'stress_trigger', weight: 0.1, check: () => sample?.events?.includes('stress') }
      ],
      rationale: 'Unilateral throbbing headache with photophobia'
    },
    {
      name: 'Gastroenteritis',
      features: [
        { feature: 'diarrhea', weight: 0.3, check: () => socrates?.associated?.some(a => a.includes('diarrhea')) },
        { feature: 'vomiting', weight: 0.25, check: () => socrates?.associated?.some(a => a.includes('vomiting')) },
        { feature: 'abdominal_cramps', weight: 0.2, check: () => socrates?.site?.includes('abdomen') && socrates?.character?.includes('crampy') },
        { feature: 'fever', weight: 0.15, check: () => vitals?.temp && vitals.temp > 37.5 },
        { feature: 'dehydration', weight: 0.1, check: () => sample?.events?.includes('dehydration') }
      ],
      rationale: 'Diarrhea and vomiting with abdominal cramps'
    }
  ];

  // Score each condition
  const scoredConditions = conditions.map(condition => {
    let totalScore = 0;
    let triggeredFeatures = [];

    condition.features.forEach(feature => {
      if (feature.check()) {
        totalScore += feature.weight;
        triggeredFeatures.push(feature.feature);
      }
    });

    // Normalize to 0-1 confidence
    const confidence = Math.min(totalScore, 1.0);

    return {
      label: condition.name,
      confidence: confidence,
      rationale: condition.rationale,
      triggeredFeatures: triggeredFeatures
    };
  });

  // Sort by confidence and get top 5
  const top5Diagnoses = scoredConditions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5)
    .map(condition => ({
      label: condition.label,
      confidence: condition.confidence,
      rationale: condition.rationale
    }));

  // Apply learning if learning service is available
  try {
    const learnedDiagnoses = await learningService.applyLearning(
      top5Diagnoses,
      abcde,
      vitals,
      sample,
      socrates,
      ageGroup
    );
    
    // Add provenance information
    return {
      diagnoses: learnedDiagnoses,
      provenance: generateProvenance('wikem')
    };
  } catch (error) {
    console.error('Error applying learning to diagnoses:', error);
    
    // Return original diagnoses with provenance if learning fails
    return {
      diagnoses: top5Diagnoses,
      provenance: generateProvenance('wikem')
    };
  }
}

/**
 * Determine the primary medical topic from assessment data
 * @param abcde - ABCDE assessment
 * @param vitals - Vital signs
 * @param sample - SAMPLE history
 * @param socrates - SOCRATES assessment
 * @returns Primary topic string or null
 */
function determinePrimaryTopic(abcde, vitals, sample, socrates) {
  // Check for chest pain
  if (socrates?.site?.includes('chest')) {
    return 'Chest_pain';
  }
  
  // Check for shortness of breath
  if (abcde?.breathing?.distress || socrates?.associated?.some(a => a.includes('shortness') || a.includes('dyspnea'))) {
    return 'Shortness_of_breath';
  }
  
  // Check for stroke symptoms
  if (abcde?.disability?.focalDeficit) {
    return 'Stroke';
  }
  
  // Check for sepsis
  if (vitals?.temp > 38.5 && vitals?.hr > 100 && vitals?.sbp < 100) {
    return 'Sepsis';
  }
  
  // Check for abdominal pain
  if (socrates?.site?.includes('abdomen')) {
    return 'Abdominal_pain';
  }
  
  // Check for seizures
  if (abcde?.disability?.seizure) {
    return 'Seizure';
  }
  
  // Check for headache
  if (socrates?.site?.includes('head')) {
    return 'Headache';
  }
  
  return null;
}

module.exports = {
  calcMAP,
  calcMEWS,
  triageAdult,
  triagePediatric,
  ruleBasedDx,
  generateProvenance
};
