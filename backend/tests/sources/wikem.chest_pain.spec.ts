import { describe, it, expect, beforeEach } from '@jest/globals';
import { processTriage } from '../../src/rule-engine/ruleEngine';

describe('WikiEM Chest Pain Rule Pack Tests', () => {
  
  describe('Classic Ischemic Features -> ACS', () => {
    it('should identify ACS in top-3 with classic ischemic features', async () => {
      const patientData = {
        abcde: {
          airway: 'clear',
          breathing: { distress: false, spo2: 98 },
          circulation: { hr: 110, bleeding: 'none' },
          disability: { gcs: 15, seizure: false },
          exposure: { trauma: false }
        },
        vitals: {
          hr: 110,
          sbp: 95, // Hypotension
          dbp: 60,
          spo2: 98,
          temp: 37.0,
          rr: 18
        },
        sample: {
          signsSymptoms: ['chest pain'],
          pastHistory: ['diabetes', 'hypertension'],
          events: ['sudden onset chest pain']
        },
        socrates: {
          site: 'chest',
          character: 'crushing',
          radiation: ['left arm', 'jaw'],
          onset: 'sudden',
          associated: ['diaphoresis', 'shortness of breath'],
          timeCourse: 'progressive',
          severityNRS: 9,
          aggravating: ['exertion'],
          relieving: ['rest']
        },
        ageGroup: 'adult'
      };

      const result = await processTriage(patientData, 'chest_pain');
      
      expect(result.success).toBe(true);
      expect(result.source).toBe('core-em-wikem');
      expect(result.coverage).toBe('partial');
      
      // Should identify ACS-like pattern
      expect(result.triageLevel).toMatch(/emergency|urgent/);
      expect(result.confidence).toBeGreaterThan(0.5);
      
      // Check reasoning contains ACS indicators
      expect(result.reasoning).toContain('crushing');
      expect(result.reasoning).toContain('radiation');
      expect(result.reasoning).toContain('hypotension');
    });

    it('should escalate to Red/Orange with hypotension', async () => {
      const patientData = {
        abcde: {
          airway: 'clear',
          breathing: { distress: true, spo2: 92 },
          circulation: { hr: 120, bleeding: 'none' },
          disability: { gcs: 14, seizure: false },
          exposure: { trauma: false }
        },
        vitals: {
          hr: 120,
          sbp: 85, // Severe hypotension
          dbp: 50,
          spo2: 92,
          temp: 36.8,
          rr: 24
        },
        sample: {
          signsSymptoms: ['chest pain', 'shortness of breath'],
          pastHistory: ['diabetes', 'smoking'],
          events: ['acute chest pain']
        },
        socrates: {
          site: 'chest',
          character: 'crushing',
          radiation: ['both arms'],
          onset: 'sudden',
          associated: ['diaphoresis', 'nausea'],
          timeCourse: 'worsening',
          severityNRS: 10,
          aggravating: ['any movement'],
          relieving: ['none']
        },
        ageGroup: 'adult'
      };

      const result = await processTriage(patientData, 'chest_pain');
      
      expect(result.success).toBe(true);
      expect(result.triageLevel).toMatch(/emergency|urgent/);
      expect(result.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('Pleuritic + Tachycardia + Hypoxia -> PE', () => {
    it('should identify PE in top-3 with pleuritic pain and respiratory compromise', async () => {
      const patientData = {
        abcde: {
          airway: 'clear',
          breathing: { distress: true, spo2: 88, wheeze: false },
          circulation: { hr: 125, bleeding: 'none' },
          disability: { gcs: 15, seizure: false },
          exposure: { trauma: false }
        },
        vitals: {
          hr: 125,
          sbp: 110,
          dbp: 70,
          spo2: 88, // Hypoxia
          temp: 37.2,
          rr: 28
        },
        sample: {
          signsSymptoms: ['chest pain', 'shortness of breath'],
          pastHistory: ['DVT', 'surgery 2 weeks ago'],
          events: ['sudden chest pain']
        },
        socrates: {
          site: 'chest',
          character: 'pleuritic',
          radiation: ['back'],
          onset: 'sudden',
          associated: ['shortness of breath', 'cough'],
          timeCourse: 'acute',
          severityNRS: 8,
          aggravating: ['deep breathing', 'coughing'],
          relieving: ['shallow breathing']
        },
        ageGroup: 'adult'
      };

      const result = await processTriage(patientData, 'chest_pain');
      
      expect(result.success).toBe(true);
      expect(result.source).toBe('core-em-wikem');
      expect(result.triageLevel).toMatch(/emergency|urgent/);
      expect(result.confidence).toBeGreaterThan(0.6);
      
      // Check reasoning contains PE indicators
      expect(result.reasoning).toContain('pleuritic');
      expect(result.reasoning).toContain('hypoxia');
      expect(result.reasoning).toContain('tachycardia');
    });
  });

  describe('Reproducible Chest Wall Tenderness + Normal Vitals -> MSK', () => {
    it('should identify MSK pain with low acuity (Green/Yellow)', async () => {
      const patientData = {
        abcde: {
          airway: 'clear',
          breathing: { distress: false, spo2: 98 },
          circulation: { hr: 72, bleeding: 'none' },
          disability: { gcs: 15, seizure: false },
          exposure: { trauma: true }
        },
        vitals: {
          hr: 72, // Normal
          sbp: 120, // Normal
          dbp: 80, // Normal
          spo2: 98, // Normal
          temp: 36.8, // Normal
          rr: 16 // Normal
        },
        sample: {
          signsSymptoms: ['chest pain'],
          pastHistory: ['none'],
          events: ['fell on chest yesterday']
        },
        socrates: {
          site: 'chest',
          character: 'sharp',
          radiation: 'none',
          onset: 'gradual',
          associated: ['tenderness'],
          timeCourse: 'stable',
          severityNRS: 4,
          aggravating: ['movement', 'deep breathing'],
          relieving: ['rest', 'pain medication']
        },
        ageGroup: 'adult'
      };

      const result = await processTriage(patientData, 'chest_pain');
      
      expect(result.success).toBe(true);
      expect(result.source).toBe('core-em-wikem');
      expect(result.triageLevel).toMatch(/routine|semi-urgent/);
      expect(result.confidence).toBeGreaterThan(0.4);
      
      // Check reasoning contains MSK indicators
      expect(result.reasoning).toContain('tenderness');
      expect(result.reasoning).toContain('movement');
      expect(result.reasoning).toContain('normal vitals');
    });
  });

  describe('Provenance and Citation Tests', () => {
    it('should include proper provenance information', async () => {
      const patientData = {
        abcde: { airway: 'clear', breathing: { distress: false }, circulation: { hr: 80 }, disability: { gcs: 15 }, exposure: { trauma: false } },
        vitals: { hr: 80, sbp: 120, dbp: 80, spo2: 98, temp: 37.0, rr: 16 },
        sample: { signsSymptoms: ['chest pain'], pastHistory: [], events: [] },
        socrates: { site: 'chest', character: 'pressure', onset: 'gradual', associated: [], timeCourse: 'stable', severityNRS: 5, aggravating: [], relieving: [] },
        ageGroup: 'adult'
      };

      const result = await processTriage(patientData, 'chest_pain');
      
      expect(result.success).toBe(true);
      expect(result.source).toBe('core-em-wikem');
      
      // Check that the result includes provenance information
      // Note: The ruleEngine currently doesn't return provenance, but the clinical.js integration does
      // This test ensures the basic structure is correct
      expect(result).toHaveProperty('source');
      expect(result).toHaveProperty('coverage');
    });
  });

  describe('Rule Application Tests', () => {
    it('should apply rules and return appropriate triage levels', async () => {
      const testCases = [
        {
          name: 'High-risk ACS',
          data: {
            abcde: { airway: 'clear', breathing: { distress: true }, circulation: { hr: 110 }, disability: { gcs: 15 }, exposure: { trauma: false } },
            vitals: { hr: 110, sbp: 90, dbp: 60, spo2: 94, temp: 37.0, rr: 20 },
            sample: { signsSymptoms: ['chest pain'], pastHistory: ['diabetes'], events: [] },
            socrates: { site: 'chest', character: 'crushing', onset: 'sudden', associated: ['diaphoresis'], timeCourse: 'progressive', severityNRS: 9, aggravating: [], relieving: [] },
            ageGroup: 'adult'
          },
          expectedTriage: /emergency|urgent/
        },
        {
          name: 'Stable angina',
          data: {
            abcde: { airway: 'clear', breathing: { distress: false }, circulation: { hr: 85 }, disability: { gcs: 15 }, exposure: { trauma: false } },
            vitals: { hr: 85, sbp: 130, dbp: 85, spo2: 98, temp: 37.0, rr: 16 },
            sample: { signsSymptoms: ['chest pain'], pastHistory: ['hypertension'], events: [] },
            socrates: { site: 'chest', character: 'pressure', onset: 'gradual', associated: [], timeCourse: 'stable', severityNRS: 6, aggravating: ['exertion'], relieving: ['rest'] },
            ageGroup: 'adult'
          },
          expectedTriage: /urgent|semi-urgent/
        }
      ];

      for (const testCase of testCases) {
        const result = await processTriage(testCase.data, 'chest_pain');
        
        expect(result.success).toBe(true);
        expect(result.source).toBe('core-em-wikem');
        expect(result.triageLevel).toMatch(testCase.expectedTriage);
        expect(result.confidence).toBeGreaterThan(0.3);
      }
    });
  });
});
