const { assessTriage } = require('../triageController');

// Mock the clinical library
jest.mock('../../lib/clinical', () => ({
  triageAdult: jest.fn(),
  triagePediatric: jest.fn(),
  ruleBasedDx: jest.fn(),
  calcMAP: jest.fn(),
  calcMEWS: jest.fn()
}));

// Mock the auth middleware
jest.mock('../../middleware/auth', () => ({
  authenticateToken: jest.fn(),
  requirePatientOrDoctor: jest.fn()
}));

describe('Triage Controller', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockReq = {
      body: {
        abcde: {
          airway: 'clear',
          breathing: { spo2: 98, distress: false },
          circulation: { sbp: 120, dbp: 80, bleeding: 'none' },
          disability: { gcs: 15 },
          exposure: { trauma: false }
        },
        vitals: {
          hr: 80,
          rr: 16,
          sbp: 120,
          dbp: 80,
          spo2: 98,
          temp: 37.0,
          gcs: 15
        },
        sample: {
          signsSymptoms: ['chest pain'],
          allergies: [],
          medications: [],
          pastHistory: [],
          lastMeal: '2 hours ago',
          events: []
        },
        socrates: {
          site: ['chest'],
          character: ['pressure'],
          onset: 'gradual',
          radiation: ['left arm'],
          associated: ['shortness of breath'],
          timeCourse: '2 hours',
          severityNRS: 7
        },
        age: 45,
        ageGroup: 'adult'
      }
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('assessTriage', () => {
    it('should include provenance information in the result', async () => {
      const { triageAdult, ruleBasedDx, calcMAP, calcMEWS } = require('../../lib/clinical');
      
      // Mock the return values
      triageAdult.mockReturnValue({
        priority: 'Priority II',
        color: 'Orange',
        reasons: ['Urgent condition requiring prompt attention'],
        map: 93,
        mews: 2,
        recommendedAction: 'Seek urgent medical care within 1-2 hours'
      });

      ruleBasedDx.mockResolvedValue({
        diagnoses: [
          {
            label: 'Acute Coronary Syndrome',
            confidence: 0.85,
            rationale: 'Chest pain with typical cardiac features'
          }
        ],
        provenance: {
          rulePack: 'core-em-wikem-2024-01-01',
          license: 'CC BY-SA 4.0',
          sourceUrl: 'https://wikem.org/wiki/Main_Page'
        }
      });

      calcMAP.mockReturnValue(93);
      calcMEWS.mockReturnValue(2);

      await assessTriage(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Triage assessment completed',
          result: expect.objectContaining({
            provenance: expect.objectContaining({
              rulePack: 'core-em-wikem-2024-01-01',
              license: 'CC BY-SA 4.0',
              sourceUrl: 'https://wikem.org/wiki/Main_Page'
            })
          })
        })
      );
    });

    it('should include vitals data with MAP and MEWS in the result', async () => {
      const { triageAdult, ruleBasedDx, calcMAP, calcMEWS } = require('../../lib/clinical');
      
      triageAdult.mockReturnValue({
        priority: 'Priority II',
        color: 'Orange',
        reasons: ['Urgent condition requiring prompt attention'],
        map: 93,
        mews: 2,
        recommendedAction: 'Seek urgent medical care within 1-2 hours'
      });

      ruleBasedDx.mockResolvedValue({
        diagnoses: [
          {
            label: 'Acute Coronary Syndrome',
            confidence: 0.85,
            rationale: 'Chest pain with typical cardiac features'
          }
        ],
        provenance: {
          rulePack: 'core-em-wikem-2024-01-01',
          license: 'CC BY-SA 4.0',
          sourceUrl: 'https://wikem.org/wiki/Main_Page'
        }
      });

      calcMAP.mockReturnValue(93);
      calcMEWS.mockReturnValue(2);

      await assessTriage(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          result: expect.objectContaining({
            vitals: expect.objectContaining({
              map: 93,
              mews: 2
            })
          })
        })
      );
    });
  });
});
