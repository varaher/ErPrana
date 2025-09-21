import { WikiEMParserClass, RulePack, RulePackRule } from '../parse';
import { WikiEMScrapedData } from '../scrape';

describe('WikiEMParser', () => {
  let parser: WikiEMParserClass;

  beforeEach(() => {
    parser = new WikiEMParserClass('2024-01-01');
  });

  describe('Constructor', () => {
    test('should create parser with custom version', () => {
      const customParser = new WikiEMParserClass('2024-01-15');
      expect(customParser).toBeDefined();
    });

    test('should create parser with default version', () => {
      const defaultParser = new WikiEMParserClass();
      expect(defaultParser).toBeDefined();
    });
  });

  describe('parseWikiEMData', () => {
    const mockScrapedData: WikiEMScrapedData = {
      topic: 'Chest Pain',
      slug: 'Chest_pain',
      url: 'https://www.wikem.org/wiki/Chest_pain',
      title: 'Chest Pain',
      sections: [
        {
          title: 'Red Flags',
          content: '• Severe chest pain\n• Shortness of breath\n• Dizziness\n• Sweating',
        },
        {
          title: 'Differential Diagnosis',
          content: '• Acute coronary syndrome\n• Pulmonary embolism\n• Aortic dissection\n• Pneumonia',
        },
        {
          title: 'Treatment',
          content: '• Immediate ECG\n• Aspirin 325mg\n• Nitroglycerin if BP >90\n• Oxygen therapy',
        },
        {
          title: 'Workup',
          content: '• ECG\n• Troponin\n• Chest X-ray\n• D-dimer if PE suspected',
        },
        {
          title: 'Disposition',
          content: '• Admit to cardiac unit\n• Consider ICU if unstable\n• Discharge if low risk',
        },
      ],
      retrievedAt: '2024-01-01T00:00:00.000Z',
      source: 'WikiEM',
    };

    test('should parse complete WikiEM data into rule pack', () => {
      const result = parser.parseWikiEMData(mockScrapedData);

      expect(result).toBeDefined();
      expect(result.id).toBe('core-em-wikem-2024-01-01');
      expect(result.name).toBe('Core Emergency Medicine - WikiEM (2024-01-01)');
      expect(result.version).toBe('2024-01-01');
      expect(result.description).toContain('Chest Pain');
      expect(result.source).toBe('WikiEM');
      expect(result.rules.length).toBeGreaterThan(0);
    });

    test('should extract red flag rules correctly', () => {
      const result = parser.parseWikiEMData(mockScrapedData);
      const redFlagRules = result.rules.filter(rule => 
        rule.metadata.tags.includes('red-flag')
      );

      expect(redFlagRules.length).toBeGreaterThan(0);
      redFlagRules.forEach(rule => {
        expect(rule.effects[0].triage).toBe('Red');
        expect(rule.effects[0].urgency).toBe('Immediate');
        expect(rule.priority).toBe(1);
      });
    });

    test('should extract differential diagnosis rules correctly', () => {
      const result = parser.parseWikiEMData(mockScrapedData);
      const diffRules = result.rules.filter(rule => 
        rule.metadata.tags.includes('differential')
      );

      expect(diffRules.length).toBeGreaterThan(0);
      diffRules.forEach(rule => {
        expect(rule.effects[0].triage).toBe('Yellow');
        expect(rule.effects[0].urgency).toBe('Routine');
        expect(rule.priority).toBe(2);
      });
    });

    test('should extract treatment rules correctly', () => {
      const result = parser.parseWikiEMData(mockScrapedData);
      const treatmentRules = result.rules.filter(rule => 
        rule.metadata.tags.includes('treatment')
      );

      expect(treatmentRules.length).toBeGreaterThan(0);
      treatmentRules.forEach(rule => {
        expect(rule.effects[0].triage).toBe('Green');
        expect(rule.effects[0].urgency).toBe('Routine');
        expect(rule.priority).toBe(3);
      });
    });

    test('should extract workup rules correctly', () => {
      const result = parser.parseWikiEMData(mockScrapedData);
      const workupRules = result.rules.filter(rule => 
        rule.metadata.tags.includes('workup')
      );

      expect(workupRules.length).toBeGreaterThan(0);
      workupRules.forEach(rule => {
        expect(rule.effects[0].triage).toBe('Yellow');
        expect(rule.effects[0].urgency).toBe('Urgent');
        expect(rule.priority).toBe(2);
      });
    });

    test('should extract disposition rules correctly', () => {
      const result = parser.parseWikiEMData(mockScrapedData);
      const dispositionRules = result.rules.filter(rule => 
        rule.metadata.tags.includes('disposition')
      );

      expect(dispositionRules.length).toBeGreaterThan(0);
      dispositionRules.forEach(rule => {
        expect(rule.effects[0].triage).toBe('Green');
        expect(rule.effects[0].urgency).toBe('Routine');
        expect(rule.priority).toBe(3);
      });
    });
  });

  describe('parseRedFlags', () => {
    test('should parse red flags from content', () => {
      const mockData: WikiEMScrapedData = {
        topic: 'Test Topic',
        slug: 'test_topic',
        url: 'https://test.com',
        title: 'Test Topic',
        sections: [
          {
            title: 'Red Flags',
            content: '• Severe pain\n• Bleeding\n• Loss of consciousness',
          },
        ],
        retrievedAt: '2024-01-01T00:00:00.000Z',
        source: 'WikiEM',
      };

      const result = parser.parseWikiEMData(mockData);
      const redFlagRules = result.rules.filter(rule => 
        rule.metadata.tags.includes('red-flag')
      );

      expect(redFlagRules).toHaveLength(3);
      expect(redFlagRules[0].conditions[0]).toBe('Severe pain');
      expect(redFlagRules[1].conditions[0]).toBe('Bleeding');
      expect(redFlagRules[2].conditions[0]).toBe('Loss of consciousness');
    });

    test('should handle red flags with different list formats', () => {
      const mockData: WikiEMScrapedData = {
        topic: 'Test Topic',
        slug: 'test_topic',
        url: 'https://test.com',
        title: 'Test Topic',
        sections: [
          {
            title: 'Red Flags',
            content: '- Item 1\n* Item 2\n• Item 3\n1. Item 4',
          },
        ],
        retrievedAt: '2024-01-01T00:00:00.000Z',
        source: 'WikiEM',
      };

      const result = parser.parseWikiEMData(mockData);
      const redFlagRules = result.rules.filter(rule => 
        rule.metadata.tags.includes('red-flag')
      );

      expect(redFlagRules.length).toBeGreaterThan(0);
    });

    test('should handle red flags without clear list markers', () => {
      const mockData: WikiEMScrapedData = {
        topic: 'Test Topic',
        slug: 'test_topic',
        url: 'https://test.com',
        title: 'Test Topic',
        sections: [
          {
            title: 'Red Flags',
            content: 'Severe pain is concerning. Bleeding requires attention. Loss of consciousness is critical.',
          },
        ],
        retrievedAt: '2024-01-01T00:00:00.000Z',
        source: 'WikiEM',
      };

      const result = parser.parseWikiEMData(mockData);
      const redFlagRules = result.rules.filter(rule => 
        rule.metadata.tags.includes('red-flag')
      );

      expect(redFlagRules.length).toBeGreaterThan(0);
    });
  });

  describe('parseDifferentialDiagnosis', () => {
    test('should parse differential diagnosis correctly', () => {
      const mockData: WikiEMScrapedData = {
        topic: 'Test Topic',
        slug: 'test_topic',
        url: 'https://test.com',
        title: 'Test Topic',
        sections: [
          {
            title: 'Differential Diagnosis',
            content: '• Condition A\n• Condition B\n• Condition C',
          },
        ],
        retrievedAt: '2024-01-01T00:00:00.000Z',
        source: 'WikiEM',
      };

      const result = parser.parseWikiEMData(mockData);
      const diffRules = result.rules.filter(rule => 
        rule.metadata.tags.includes('differential')
      );

      expect(diffRules).toHaveLength(3);
      diffRules.forEach(rule => {
        expect(rule.effects[0].triage).toBe('Yellow');
        expect(rule.effects[0].advice).toContain('Consider');
      });
    });
  });

  describe('parseTreatmentGuidelines', () => {
    test('should parse treatment guidelines correctly', () => {
      const mockData: WikiEMScrapedData = {
        topic: 'Test Topic',
        slug: 'test_topic',
        url: 'https://test.com',
        title: 'Test Topic',
        sections: [
          {
            title: 'Treatment',
            content: '• Medication A\n• Procedure B\n• Follow-up C',
          },
        ],
        retrievedAt: '2024-01-01T00:00:00.000Z',
        source: 'WikiEM',
      };

      const result = parser.parseWikiEMData(mockData);
      const treatmentRules = result.rules.filter(rule => 
        rule.metadata.tags.includes('treatment')
      );

      expect(treatmentRules).toHaveLength(3);
      treatmentRules.forEach(rule => {
        expect(rule.effects[0].triage).toBe('Green');
        expect(rule.effects[0].action).toBe('Follow treatment guidelines');
      });
    });
  });

  describe('parseWorkupRecommendations', () => {
    test('should parse workup recommendations correctly', () => {
      const mockData: WikiEMScrapedData = {
        topic: 'Test Topic',
        slug: 'test_topic',
        url: 'https://test.com',
        title: 'Test Topic',
        sections: [
          {
            title: 'Workup',
            content: '• Test A\n• Imaging B\n• Lab work C',
          },
        ],
        retrievedAt: '2024-01-01T00:00:00.000Z',
        source: 'WikiEM',
      };

      const result = parser.parseWikiEMData(mockData);
      const workupRules = result.rules.filter(rule => 
        rule.metadata.tags.includes('workup')
      );

      expect(workupRules).toHaveLength(3);
      workupRules.forEach(rule => {
        expect(rule.effects[0].triage).toBe('Yellow');
        expect(rule.effects[0].action).toBe('Order appropriate tests');
        expect(rule.effects[0].urgency).toBe('Urgent');
      });
    });
  });

  describe('parseDispositionGuidelines', () => {
    test('should parse disposition guidelines correctly', () => {
      const mockData: WikiEMScrapedData = {
        topic: 'Test Topic',
        slug: 'test_topic',
        url: 'https://test.com',
        title: 'Test Topic',
        sections: [
          {
            title: 'Disposition',
            content: '• Admit if unstable\n• Discharge if stable\n• Follow-up in clinic',
          },
        ],
        retrievedAt: '2024-01-01T00:00:00.000Z',
        source: 'WikiEM',
      };

      const result = parser.parseWikiEMData(mockData);
      const dispositionRules = result.rules.filter(rule => 
        rule.metadata.tags.includes('disposition')
      );

      expect(dispositionRules).toHaveLength(3);
      dispositionRules.forEach(rule => {
        expect(rule.effects[0].triage).toBe('Green');
        expect(rule.effects[0].action).toBe('Follow disposition guidelines');
      });
    });
  });

  describe('Metadata Generation', () => {
    test('should generate proper citations', () => {
      const mockData: WikiEMScrapedData = {
        topic: 'Test Topic',
        slug: 'test_topic',
        url: 'https://www.wikem.org/wiki/test_topic',
        title: 'Test Topic',
        sections: [],
        retrievedAt: '2024-01-01T00:00:00.000Z',
        source: 'WikiEM',
      };

      const result = parser.parseWikiEMData(mockData);
      
      result.rules.forEach(rule => {
        expect(rule.metadata.citation.id).toBe('WIKIEM-test_topic');
        expect(rule.metadata.citation.source).toBe('WikiEM');
        expect(rule.metadata.citation.url).toBe('https://www.wikem.org/wiki/test_topic');
        expect(rule.metadata.citation.level).toBe('Consensus');
        expect(rule.metadata.citation.year).toBe(new Date().getFullYear());
      });
    });

    test('should generate proper tags', () => {
      const mockData: WikiEMScrapedData = {
        topic: 'Test Topic',
        slug: 'test_topic',
        url: 'https://test.com',
        title: 'Test Topic',
        sections: [
          {
            title: 'Red Flags',
            content: '• Test item',
          },
        ],
        retrievedAt: '2024-01-01T00:00:00.000Z',
        source: 'WikiEM',
      };

      const result = parser.parseWikiEMData(mockData);
      
      result.rules.forEach(rule => {
        expect(rule.metadata.tags).toContain('emergency-medicine');
        expect(rule.metadata.tags).toContain('test_topic');
        expect(rule.metadata.confidence).toBe('Medium');
      });
    });
  });

  describe('Coverage Mapping', () => {
    test('should generate coverage map based on rule count', () => {
      const mockData: WikiEMScrapedData = {
        topic: 'Test Topic',
        slug: 'test_topic',
        url: 'https://test.com',
        title: 'Test Topic',
        sections: [
          {
            title: 'Red Flags',
            content: '• Item 1\n• Item 2\n• Item 3\n• Item 4\n• Item 5\n• Item 6\n• Item 7\n• Item 8\n• Item 9\n• Item 10\n• Item 11\n• Item 12\n• Item 13\n• Item 14\n• Item 15\n• Item 16\n• Item 17\n• Item 18\n• Item 19\n• Item 20',
          },
        ],
        retrievedAt: '2024-01-01T00:00:00.000Z',
        source: 'WikiEM',
      };

      const result = parser.parseWikiEMData(mockData);
      const coverage = result.metadata.coverage['test_topic'];
      
      expect(coverage).toBe('full');
    });

    test('should mark coverage as partial for medium rule count', () => {
      const mockData: WikiEMScrapedData = {
        topic: 'Test Topic',
        slug: 'test_topic',
        url: 'https://test.com',
        title: 'Test Topic',
        sections: [
          {
            title: 'Red Flags',
            content: '• Item 1\n• Item 2\n• Item 3\n• Item 4\n• Item 5\n• Item 6\n• Item 7\n• Item 8\n• Item 9\n• Item 10\n• Item 11\n• Item 12\n• Item 13\n• Item 14\n• Item 15',
          },
        ],
        retrievedAt: '2024-01-01T00:00:00.000Z',
        source: 'WikiEM',
      };

      const result = parser.parseWikiEMData(mockData);
      const coverage = result.metadata.coverage['test_topic'];
      
      expect(coverage).toBe('partial');
    });

    test('should mark coverage as minimal for low rule count', () => {
      const mockData: WikiEMScrapedData = {
        topic: 'Test Topic',
        slug: 'test_topic',
        url: 'https://test.com',
        title: 'Test Topic',
        sections: [
          {
            title: 'Red Flags',
            content: '• Item 1\n• Item 2\n• Item 3',
          },
        ],
        retrievedAt: '2024-01-01T00:00:00.000Z',
        source: 'WikiEM',
      };

      const result = parser.parseWikiEMData(mockData);
      const coverage = result.metadata.coverage['test_topic'];
      
      expect(coverage).toBe('minimal');
    });
  });

  describe('Validation', () => {
    test('should validate rule pack correctly', () => {
      const mockData: WikiEMScrapedData = {
        topic: 'Test Topic',
        slug: 'test_topic',
        url: 'https://test.com',
        title: 'Test Topic',
        sections: [
          {
            title: 'Red Flags',
            content: '• Test item',
          },
        ],
        retrievedAt: '2024-01-01T00:00:00.000Z',
        source: 'WikiEM',
      };

      const rulePack = parser.parseWikiEMData(mockData);
      const validation = parser.validateRulePack(rulePack);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should detect validation errors', () => {
      const invalidRulePack: RulePack = {
        id: '',
        name: '',
        version: '',
        description: '',
        rules: [],
        metadata: {
          source: '',
          topics: [],
          totalRules: 0,
          coverage: {},
          createdAt: '',
          updatedAt: '',
        },
      };

      const validation = parser.validateRulePack(invalidRulePack);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Summary Generation', () => {
    test('should generate summary statistics', () => {
      const mockData: WikiEMScrapedData = {
        topic: 'Test Topic',
        slug: 'test_topic',
        url: 'https://test.com',
        title: 'Test Topic',
        sections: [
          {
            title: 'Red Flags',
            content: '• Item 1\n• Item 2',
          },
          {
            title: 'Treatment',
            content: '• Treatment 1\n• Treatment 2',
          },
        ],
        retrievedAt: '2024-01-01T00:00:00.000Z',
        source: 'WikiEM',
      };

      const rulePack = parser.parseWikiEMData(mockData);
      const summary = parser.generateSummary(rulePack);

      expect(summary.totalRules).toBe(4);
      expect(summary.ruleTypes['red-flag']).toBe(2);
      expect(summary.ruleTypes['treatment']).toBe(2);
      expect(summary.coverage).toBe('minimal');
    });
  });

  describe('Multiple Topics', () => {
    test('should parse multiple topics', () => {
      const mockDataArray: WikiEMScrapedData[] = [
        {
          topic: 'Topic A',
          slug: 'topic_a',
          url: 'https://test.com/a',
          title: 'Topic A',
          sections: [{ title: 'Red Flags', content: '• Item 1' }],
          retrievedAt: '2024-01-01T00:00:00.000Z',
          source: 'WikiEM',
        },
        {
          topic: 'Topic B',
          slug: 'topic_b',
          url: 'https://test.com/b',
          title: 'Topic B',
          sections: [{ title: 'Treatment', content: '• Item 1' }],
          retrievedAt: '2024-01-01T00:00:00.000Z',
          source: 'WikiEM',
        },
      ];

      const result = parser.parseMultipleTopics(mockDataArray);

      expect(result).toHaveLength(2);
      expect(result[0].metadata.topics).toContain('Topic A');
      expect(result[1].metadata.topics).toContain('Topic B');
    });
  });
});
