const { SymptomSession, SymptomFeedback, User, Patient, Doctor } = require('../models');
const { triageAdult, triagePediatric, ruleBasedDx } = require('../lib/clinical');

/**
 * Create a new symptom session
 * POST /api/symptoms/session
 */
const createSession = async (req, res) => {
  try {
    const { age, sex, initialAbcde } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!age || age < 0 || age > 120) {
      return res.status(400).json({
        error: 'Invalid age. Must be between 0 and 120.'
      });
    }

    const ageGroup = age < 18 ? 'pediatric' : 'adult';
    
    // Create initial payload
    const payload = {
      age,
      sex,
      ageGroup,
      abcde: initialAbcde || {
        airway: 'unknown',
        breathing: {},
        circulation: {},
        disability: {},
        exposure: {}
      },
      sample: {
        signsSymptoms: [],
        allergies: [],
        medications: [],
        pastHistory: [],
        lastMeal: '',
        events: ''
      },
      socrates: {},
      ros: [],
      vitals: {}
    };

    const session = await SymptomSession.create({
      userId,
      payload
    });

    res.status(201).json({
      message: 'Symptom session created successfully',
      sessionId: session.id,
      payload: session.payload
    });
  } catch (error) {
    console.error('Error creating symptom session:', error);
    res.status(500).json({
      error: 'Failed to create symptom session'
    });
  }
};

/**
 * Add answers to an existing session
 * POST /api/symptoms/answer
 */
const addAnswer = async (req, res) => {
  try {
    const { sessionId, answers } = req.body;
    const userId = req.user.id;

    if (!sessionId || !answers) {
      return res.status(400).json({
        error: 'Session ID and answers are required'
      });
    }

    // Find the session and verify ownership
    const session = await SymptomSession.findOne({
      where: { id: sessionId, userId }
    });

    if (!session) {
      return res.status(404).json({
        error: 'Session not found or access denied'
      });
    }

    // Merge new answers into existing payload
    const updatedPayload = {
      ...session.payload,
      ...answers
    };

    // Update the session
    await session.update({
      payload: updatedPayload
    });

    res.json({
      message: 'Answers added successfully',
      sessionId: session.id,
      payload: updatedPayload
    });
  } catch (error) {
    console.error('Error adding answers:', error);
    res.status(500).json({
      error: 'Failed to add answers'
    });
  }
};

/**
 * Complete a symptom session and generate results
 * POST /api/symptoms/complete
 */
const completeSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user.id;

    if (!sessionId) {
      return res.status(400).json({
        error: 'Session ID is required'
      });
    }

    // Find the session and verify ownership
    const session = await SymptomSession.findOne({
      where: { id: sessionId, userId }
    });

    if (!session) {
      return res.status(404).json({
        error: 'Session not found or access denied'
      });
    }

    const { payload } = session;
    const { age, ageGroup, abcde, sample, socrates, vitals } = payload;

    // Perform triage assessment
    let triageResult;
    if (ageGroup === 'pediatric') {
      triageResult = triagePediatric(abcde, vitals, sample, age, socrates);
    } else {
      triageResult = triageAdult(abcde, vitals, sample, socrates);
    }

    // Generate differential diagnosis (now async)
    const top5 = await ruleBasedDx(abcde, vitals, sample, socrates, ageGroup);

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
      top5,
      safetyFlags,
      advice,
      clinicianNotes: `Age: ${age}, Age Group: ${ageGroup}. ${safetyFlags.length > 0 ? 'Safety flags present: ' + safetyFlags.join(', ') : 'No immediate safety concerns.'}`
    };

    // Update session with result and completion time
    await session.update({
      result,
      payload: {
        ...payload,
        completedAt: new Date().toISOString()
      }
    });

    res.json({
      message: 'Session completed successfully',
      sessionId: session.id,
      result
    });
  } catch (error) {
    console.error('Error completing session:', error);
    res.status(500).json({
      error: 'Failed to complete session'
    });
  }
};

/**
 * Get session transcript and results
 * GET /api/symptoms/sessions/:id
 */
const getSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { view } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    let session;
    
    if (userRole === 'doctor') {
      // Doctors can view sessions for their assigned patients
      const doctor = await Doctor.findOne({
        where: { userId }
      });

      if (!doctor) {
        return res.status(403).json({
          error: 'Doctor profile not found'
        });
      }

      // Check if the session belongs to a patient assigned to this doctor
      session = await SymptomSession.findOne({
        where: { id },
        include: [{
          model: User,
          as: 'user',
          include: [{
            model: Patient,
            as: 'patient',
            where: { assignedDoctorId: doctor.id }
          }]
        }]
      });
    } else {
      // Patients can only view their own sessions
      session = await SymptomSession.findOne({
        where: { id, userId },
        include: [{
          model: User,
          as: 'user'
        }]
      });
    }

    if (!session) {
      return res.status(404).json({
        error: 'Session not found or access denied'
      });
    }

    // Format the response as SessionTranscript
    const transcript = {
      id: session.id,
      userId: session.userId,
      age: session.payload.age,
      sex: session.payload.sex,
      ageGroup: session.payload.ageGroup,
      abcde: session.payload.abcde,
      sample: session.payload.sample,
      socrates: session.payload.socrates,
      ros: session.payload.ros,
      vitals: session.payload.vitals,
      createdAt: session.createdAt.toISOString(),
      completedAt: session.payload.completedAt,
      result: session.result
    };

    // Add clinician-specific details if requested and user is a doctor
    if (view === 'clinician' && userRole === 'doctor') {
      const { abcde, vitals, sample, socrates } = session.payload;
      
      // Calculate MEWS if vitals are available
      let mews = null;
      if (vitals) {
        const { calcMEWS } = require('../lib/clinical');
        mews = calcMEWS(vitals);
      }

      // Calculate MAP if blood pressure is available
      let map = null;
      if (vitals && vitals.sbp && vitals.dbp) {
        const { calcMAP } = require('../lib/clinical');
        map = calcMAP(vitals.sbp, vitals.dbp);
      }

      // Generate rule matches based on the assessment
      const ruleMatches = generateRuleMatches(abcde, vitals, sample, socrates, session.payload.ageGroup);

      // Add clinician notes
      const clinicianNotes = generateClinicianNotes(session.payload, session.result);

      transcript.clinicianView = {
        mews,
        map,
        ruleMatches,
        clinicianNotes,
        compactTranscript: {
          abcde: session.payload.abcde,
          sample: session.payload.sample,
          socrates: session.payload.socrates,
          vitals: session.payload.vitals
        }
      };
    }

    res.json({
      message: 'Session retrieved successfully',
      transcript
    });
  } catch (error) {
    console.error('Error retrieving session:', error);
    res.status(500).json({
      error: 'Failed to retrieve session'
    });
  }
};

/**
 * Generate rule matches for clinician view
 */
const generateRuleMatches = (abcde, vitals, sample, socrates, ageGroup) => {
  const rules = [];

  // ABCDE rules
  if (abcde) {
    if (abcde.airway === 'compromised') {
      rules.push({
        name: 'Airway Compromise',
        description: 'Patient has compromised airway',
        threshold: 'Immediate intervention required',
        severity: 'high'
      });
    }

    if (abcde.breathing?.respiratoryRate > 30 || abcde.breathing?.respiratoryRate < 8) {
      rules.push({
        name: 'Abnormal Respiratory Rate',
        description: `Respiratory rate: ${abcde.breathing.respiratoryRate}/min`,
        threshold: ageGroup === 'adult' ? '8-30/min' : '15-45/min',
        severity: 'medium'
      });
    }

    if (abcde.circulation?.heartRate > 120 || abcde.circulation?.heartRate < 50) {
      rules.push({
        name: 'Abnormal Heart Rate',
        description: `Heart rate: ${abcde.circulation.heartRate} bpm`,
        threshold: ageGroup === 'adult' ? '50-120 bpm' : '60-160 bpm',
        severity: 'medium'
      });
    }

    if (abcde.circulation?.systolicBP < 90) {
      rules.push({
        name: 'Hypotension',
        description: `Systolic BP: ${abcde.circulation.systolicBP} mmHg`,
        threshold: '>90 mmHg',
        severity: 'high'
      });
    }

    if (abcde.disability?.gcs < 15) {
      rules.push({
        name: 'Altered Mental Status',
        description: `GCS: ${abcde.disability.gcs}`,
        threshold: '15',
        severity: 'high'
      });
    }
  }

  // Vital signs rules
  if (vitals) {
    if (vitals.spo2 && vitals.spo2 < 94) {
      rules.push({
        name: 'Hypoxemia',
        description: `SpO2: ${vitals.spo2}%`,
        threshold: '≥94%',
        severity: 'medium'
      });
    }

    if (vitals.temp && vitals.temp > 38) {
      rules.push({
        name: 'Fever',
        description: `Temperature: ${vitals.temp}°C`,
        threshold: '<38°C',
        severity: 'medium'
      });
    }
  }

  // SAMPLE history rules
  if (sample) {
    if (sample.allergies && sample.allergies.length > 0) {
      rules.push({
        name: 'Known Allergies',
        description: `Allergies: ${sample.allergies.join(', ')}`,
        threshold: 'None',
        severity: 'low'
      });
    }

    if (sample.medications && sample.medications.length > 0) {
      rules.push({
        name: 'Current Medications',
        description: `Medications: ${sample.medications.join(', ')}`,
        threshold: 'None',
        severity: 'low'
      });
    }
  }

  return rules;
};

/**
 * Generate clinician notes based on assessment
 */
const generateClinicianNotes = (payload, result) => {
  const notes = [];

  // Add triage priority notes
  if (result?.triage) {
    notes.push(`Triage Priority: ${result.triage.priority} (${result.triage.color})`);
    notes.push(`Recommended Action: ${result.triage.recommendedAction}`);
  }

  // Add vital signs notes
  if (payload.vitals) {
    const vitals = payload.vitals;
    if (vitals.hr || vitals.rr || vitals.sbp || vitals.dbp || vitals.spo2 || vitals.temp) {
      notes.push('Vital Signs:');
      if (vitals.hr) notes.push(`  - Heart Rate: ${vitals.hr} bpm`);
      if (vitals.rr) notes.push(`  - Respiratory Rate: ${vitals.rr} /min`);
      if (vitals.sbp) notes.push(`  - Systolic BP: ${vitals.sbp} mmHg`);
      if (vitals.dbp) notes.push(`  - Diastolic BP: ${vitals.dbp} mmHg`);
      if (vitals.spo2) notes.push(`  - SpO2: ${vitals.spo2}%`);
      if (vitals.temp) notes.push(`  - Temperature: ${vitals.temp}°C`);
    }
  }

  // Add ABCDE assessment notes
  if (payload.abcde) {
    notes.push('ABCDE Assessment:');
    if (payload.abcde.airway) notes.push(`  - Airway: ${payload.abcde.airway}`);
    if (payload.abcde.breathing) notes.push(`  - Breathing: ${JSON.stringify(payload.abcde.breathing)}`);
    if (payload.abcde.circulation) notes.push(`  - Circulation: ${JSON.stringify(payload.abcde.circulation)}`);
    if (payload.abcde.disability) notes.push(`  - Disability: ${JSON.stringify(payload.abcde.disability)}`);
    if (payload.abcde.exposure) notes.push(`  - Exposure: ${JSON.stringify(payload.abcde.exposure)}`);
  }

  // Add provisional diagnoses
  if (result?.top5 && result.top5.length > 0) {
    notes.push('Provisional Diagnoses:');
    result.top5.forEach((dx, index) => {
      notes.push(`  ${index + 1}. ${dx.label} (${Math.round(dx.confidence * 100)}%)`);
    });
  }

  return notes.join('\n');
};

/**
 * Submit feedback for a completed session
 * POST /api/symptoms/feedback
 */
const submitFeedback = async (req, res) => {
  try {
    const { sessionId, outcome, confirmedDiagnosis, notes } = req.body;
    const userId = req.user.id;

    if (!sessionId || !outcome) {
      return res.status(400).json({
        error: 'Session ID and outcome are required'
      });
    }

    // Validate outcome
    const validOutcomes = ['improved', 'worsened', 'diagnosed'];
    if (!validOutcomes.includes(outcome)) {
      return res.status(400).json({
        error: 'Invalid outcome. Must be one of: improved, worsened, diagnosed'
      });
    }

    // Check if session exists and is completed
    const session = await SymptomSession.findOne({
      where: { id: sessionId, userId }
    });

    if (!session) {
      return res.status(404).json({
        error: 'Session not found or access denied'
      });
    }

    if (!session.result) {
      return res.status(400).json({
        error: 'Session must be completed before feedback can be submitted'
      });
    }

    // Create feedback
    const feedback = await SymptomFeedback.create({
      sessionId,
      userId,
      outcome,
      confirmedDiagnosis,
      notes
    });

    res.status(201).json({
      message: 'Feedback submitted successfully',
      feedbackId: feedback.id,
      feedback
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({
      error: 'Failed to submit feedback'
    });
  }
};

module.exports = {
  createSession,
  addAnswer,
  completeSession,
  getSession,
  submitFeedback
};
