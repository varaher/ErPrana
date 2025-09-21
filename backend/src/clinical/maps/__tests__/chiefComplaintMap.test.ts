import {
  chiefComplaintMap,
  mapTopicToChiefComplaint,
  getChiefComplaintsByCategory,
  getChiefComplaintsBySeverity,
  searchChiefComplaints,
  getAvailableCategories,
  getChiefComplaintCoverage,
  ChiefComplaint
} from '../chiefComplaintMap';

describe('Chief Complaint Mapping', () => {
  describe('chiefComplaintMap', () => {
    it('should contain expected number of chief complaints', () => {
      expect(Object.keys(chiefComplaintMap).length).toBeGreaterThan(30);
    });

    it('should have valid SNOMED codes for all entries', () => {
      Object.values(chiefComplaintMap).forEach(cc => {
        expect(cc.system).toBe('SNOMED');
        expect(cc.code).toMatch(/^\d+$/);
        expect(cc.label).toBeTruthy();
      });
    });

    it('should have valid severity levels', () => {
      const validSeverities = ['low', 'medium', 'high', 'critical'];
      Object.values(chiefComplaintMap).forEach(cc => {
        if (cc.severity) {
          expect(validSeverities).toContain(cc.severity);
        }
      });
    });

    it('should have valid categories', () => {
      const validCategories = [
        'cardiovascular', 'respiratory', 'neurological', 'gastrointestinal',
        'trauma', 'infectious', 'obstetric', 'gynecological', 'pediatric',
        'toxicology', 'environmental', 'psychiatric', 'general', 'musculoskeletal'
      ];
      Object.values(chiefComplaintMap).forEach(cc => {
        if (cc.category) {
          expect(validCategories).toContain(cc.category);
        }
      });
    });
  });

  describe('mapTopicToChiefComplaint', () => {
    it('should return correct chief complaint for valid slug', () => {
      const result = mapTopicToChiefComplaint('Chest_pain');
      expect(result).toEqual({
        system: 'SNOMED',
        code: '29857009',
        label: 'Chest pain',
        description: 'Pain or discomfort in the chest area',
        category: 'cardiovascular',
        severity: 'high'
      });
    });

    it('should return null for invalid slug', () => {
      const result = mapTopicToChiefComplaint('Invalid_topic');
      expect(result).toBeNull();
    });

    it('should handle case-sensitive slugs', () => {
      const result = mapTopicToChiefComplaint('chest_pain');
      expect(result).toBeNull();
    });

    it('should handle empty string', () => {
      const result = mapTopicToChiefComplaint('');
      expect(result).toBeNull();
    });
  });

  describe('getChiefComplaintsByCategory', () => {
    it('should return all cardiovascular complaints', () => {
      const result = getChiefComplaintsByCategory('cardiovascular');
      expect(result.length).toBeGreaterThan(0);
      result.forEach(cc => {
        expect(cc.category).toBe('cardiovascular');
      });
    });

    it('should return all respiratory complaints', () => {
      const result = getChiefComplaintsByCategory('respiratory');
      expect(result.length).toBeGreaterThan(0);
      result.forEach(cc => {
        expect(cc.category).toBe('respiratory');
      });
    });

    it('should return empty array for invalid category', () => {
      const result = getChiefComplaintsByCategory('invalid_category');
      expect(result).toEqual([]);
    });

    it('should handle case-sensitive categories', () => {
      const result = getChiefComplaintsByCategory('Cardiovascular');
      expect(result).toEqual([]);
    });
  });

  describe('getChiefComplaintsBySeverity', () => {
    it('should return all critical complaints', () => {
      const result = getChiefComplaintsBySeverity('critical');
      expect(result.length).toBeGreaterThan(0);
      result.forEach(cc => {
        expect(cc.severity).toBe('critical');
      });
    });

    it('should return all high severity complaints', () => {
      const result = getChiefComplaintsBySeverity('high');
      expect(result.length).toBeGreaterThan(0);
      result.forEach(cc => {
        expect(cc.severity).toBe('high');
      });
    });

    it('should return empty array for invalid severity', () => {
      const result = getChiefComplaintsBySeverity('invalid' as any);
      expect(result).toEqual([]);
    });
  });

  describe('searchChiefComplaints', () => {
    it('should find complaints by label', () => {
      const result = searchChiefComplaints('pain');
      expect(result.length).toBeGreaterThan(0);
      result.forEach(cc => {
        expect(cc.label.toLowerCase()).toContain('pain');
      });
    });

    it('should find complaints by description', () => {
      const result = searchChiefComplaints('breathing');
      expect(result.length).toBeGreaterThan(0);
      result.forEach(cc => {
        expect(cc.description?.toLowerCase()).toContain('breathing');
      });
    });

    it('should be case-insensitive', () => {
      const result1 = searchChiefComplaints('CHEST');
      const result2 = searchChiefComplaints('chest');
      expect(result1).toEqual(result2);
    });

    it('should return empty array for no matches', () => {
      const result = searchChiefComplaints('xyz123');
      expect(result).toEqual([]);
    });

    it('should handle empty query', () => {
      const result = searchChiefComplaints('');
      expect(result.length).toBeGreaterThan(0); // Should return all complaints
    });
  });

  describe('getAvailableCategories', () => {
    it('should return array of unique categories', () => {
      const categories = getAvailableCategories();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
      
      // Check for uniqueness
      const uniqueCategories = new Set(categories);
      expect(uniqueCategories.size).toBe(categories.length);
    });

    it('should include expected categories', () => {
      const categories = getAvailableCategories();
      expect(categories).toContain('cardiovascular');
      expect(categories).toContain('respiratory');
      expect(categories).toContain('neurological');
    });

    it('should not include undefined or null categories', () => {
      const categories = getAvailableCategories();
      expect(categories).not.toContain(undefined);
      expect(categories).not.toContain(null);
    });
  });

  describe('getChiefComplaintCoverage', () => {
    it('should return correct total count', () => {
      const coverage = getChiefComplaintCoverage();
      expect(coverage.total).toBe(Object.keys(chiefComplaintMap).length);
    });

    it('should return category breakdown', () => {
      const coverage = getChiefComplaintCoverage();
      expect(typeof coverage.byCategory).toBe('object');
      expect(Object.keys(coverage.byCategory).length).toBeGreaterThan(0);
      
      // Verify counts add up
      const totalByCategory = Object.values(coverage.byCategory).reduce((sum, count) => sum + count, 0);
      expect(totalByCategory).toBe(coverage.total);
    });

    it('should return severity breakdown', () => {
      const coverage = getChiefComplaintCoverage();
      expect(typeof coverage.bySeverity).toBe('object');
      expect(Object.keys(coverage.bySeverity).length).toBeGreaterThan(0);
      
      // Verify counts add up
      const totalBySeverity = Object.values(coverage.bySeverity).reduce((sum, count) => sum + count, 0);
      expect(totalBySeverity).toBe(coverage.total);
    });

    it('should have consistent data structure', () => {
      const coverage = getChiefComplaintCoverage();
      expect(coverage).toHaveProperty('total');
      expect(coverage).toHaveProperty('byCategory');
      expect(coverage).toHaveProperty('bySeverity');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle special characters in search', () => {
      const result = searchChiefComplaints('pain!@#');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle very long search queries', () => {
      const longQuery = 'a'.repeat(1000);
      const result = searchChiefComplaints(longQuery);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle null/undefined values gracefully', () => {
      // These should not throw errors
      expect(() => mapTopicToChiefComplaint(null as any)).not.toThrow();
      expect(() => mapTopicToChiefComplaint(undefined as any)).not.toThrow();
    });
  });

  describe('Data Integrity', () => {
    it('should have unique SNOMED codes', () => {
      const codes = Object.values(chiefComplaintMap).map(cc => cc.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });

    it('should have unique labels', () => {
      const labels = Object.values(chiefComplaintMap).map(cc => cc.label);
      const uniqueLabels = new Set(labels);
      expect(uniqueLabels.size).toBe(labels.length);
    });

    it('should have consistent data types', () => {
      Object.values(chiefComplaintMap).forEach(cc => {
        expect(typeof cc.system).toBe('string');
        expect(typeof cc.code).toBe('string');
        expect(typeof cc.label).toBe('string');
        if (cc.description) expect(typeof cc.description).toBe('string');
        if (cc.category) expect(typeof cc.category).toBe('string');
        if (cc.severity) expect(typeof cc.severity).toBe('string');
      });
    });
  });
});
