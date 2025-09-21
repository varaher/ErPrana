/**
 * Chief Complaint Mapping for WikiEM Topics
 * Maps WikiEM topic slugs to SNOMED CT codes for medical terminology standardization
 */

export interface ChiefComplaint {
  system: 'SNOMED';
  code: string;
  label: string;
  description?: string;
  category?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface ChiefComplaintMap {
  [topicSlug: string]: ChiefComplaint;
}

/**
 * Comprehensive mapping of WikiEM topics to SNOMED CT codes
 * Based on common emergency medicine chief complaints
 */
export const chiefComplaintMap: ChiefComplaintMap = {
  // Cardiovascular Emergencies
  'Chest_pain': {
    system: 'SNOMED',
    code: '29857009',
    label: 'Chest pain',
    description: 'Pain or discomfort in the chest area',
    category: 'cardiovascular',
    severity: 'high'
  },
  'Shortness_of_breath': {
    system: 'SNOMED',
    code: '267036007',
    label: 'Shortness of breath',
    description: 'Difficulty breathing or breathlessness',
    category: 'respiratory',
    severity: 'high'
  },
  'Palpitations': {
    system: 'SNOMED',
    code: '410430005',
    label: 'Palpitations',
    description: 'Sensation of rapid or irregular heartbeat',
    category: 'cardiovascular',
    severity: 'medium'
  },
  'Syncope': {
    system: 'SNOMED',
    code: '365640003',
    label: 'Syncope',
    description: 'Temporary loss of consciousness',
    category: 'neurological',
    severity: 'high'
  },

  // Respiratory Emergencies
  'Dyspnea': {
    system: 'SNOMED',
    code: '267036007',
    label: 'Dyspnea',
    description: 'Labored or difficult breathing',
    category: 'respiratory',
    severity: 'high'
  },
  'Cough': {
    system: 'SNOMED',
    code: '49727002',
    label: 'Cough',
    description: 'Sudden expulsion of air from the lungs',
    category: 'respiratory',
    severity: 'low'
  },
  'Hemoptysis': {
    system: 'SNOMED',
    code: '66857006',
    label: 'Hemoptysis',
    description: 'Coughing up blood',
    category: 'respiratory',
    severity: 'critical'
  },

  // Neurological Emergencies
  'Stroke': {
    system: 'SNOMED',
    code: '230690007',
    label: 'Stroke',
    description: 'Sudden loss of brain function due to blood clot or bleeding',
    category: 'neurological',
    severity: 'critical'
  },
  'Seizure': {
    system: 'SNOMED',
    code: '91175000',
    label: 'Seizure',
    description: 'Sudden, uncontrolled electrical disturbance in the brain',
    category: 'neurological',
    severity: 'high'
  },
  'Headache': {
    system: 'SNOMED',
    code: '25064002',
    label: 'Headache',
    description: 'Pain in the head or upper neck',
    category: 'neurological',
    severity: 'medium'
  },
  'Altered_mental_status': {
    system: 'SNOMED',
    code: '419045004',
    label: 'Altered mental status',
    description: 'Change in level of consciousness or cognitive function',
    category: 'neurological',
    severity: 'high'
  },

  // Gastrointestinal Emergencies
  'Abdominal_pain': {
    system: 'SNOMED',
    code: '21522001',
    label: 'Abdominal pain',
    description: 'Pain in the abdomen',
    category: 'gastrointestinal',
    severity: 'medium'
  },
  'Nausea': {
    system: 'SNOMED',
    code: '422587007',
    label: 'Nausea',
    description: 'Feeling of sickness with an urge to vomit',
    category: 'gastrointestinal',
    severity: 'low'
  },
  'Vomiting': {
    system: 'SNOMED',
    code: '422400008',
    label: 'Vomiting',
    description: 'Forceful expulsion of stomach contents',
    category: 'gastrointestinal',
    severity: 'medium'
  },
  'Diarrhea': {
    system: 'SNOMED',
    code: '62315008',
    label: 'Diarrhea',
    description: 'Frequent, loose, watery stools',
    category: 'gastrointestinal',
    severity: 'medium'
  },
  'Gastrointestinal_bleeding': {
    system: 'SNOMED',
    code: '74474003',
    label: 'Gastrointestinal bleeding',
    description: 'Bleeding in the digestive tract',
    category: 'gastrointestinal',
    severity: 'critical'
  },

  // Trauma and Injury
  'Trauma': {
    system: 'SNOMED',
    code: '248062006',
    label: 'Trauma',
    description: 'Physical injury or wound',
    category: 'trauma',
    severity: 'high'
  },
  'Fracture': {
    system: 'SNOMED',
    code: '72704001',
    label: 'Fracture',
    description: 'Broken bone',
    category: 'trauma',
    severity: 'high'
  },
  'Laceration': {
    system: 'SNOMED',
    code: '397709008',
    label: 'Laceration',
    description: 'Deep cut or tear in the skin',
    category: 'trauma',
    severity: 'medium'
  },
  'Burn': {
    system: 'SNOMED',
    code: '282093007',
    label: 'Burn',
    description: 'Tissue damage caused by heat, chemicals, or radiation',
    category: 'trauma',
    severity: 'high'
  },

  // Infectious Diseases
  'Fever': {
    system: 'SNOMED',
    code: '386661006',
    label: 'Fever',
    description: 'Elevated body temperature above normal',
    category: 'infectious',
    severity: 'medium'
  },
  'Sepsis': {
    system: 'SNOMED',
    code: '91302008',
    label: 'Sepsis',
    description: 'Life-threatening response to infection',
    category: 'infectious',
    severity: 'critical'
  },
  'Pneumonia': {
    system: 'SNOMED',
    code: '233604007',
    label: 'Pneumonia',
    description: 'Infection of the lungs',
    category: 'infectious',
    severity: 'high'
  },
  'Urinary_tract_infection': {
    system: 'SNOMED',
    code: '68566005',
    label: 'Urinary tract infection',
    description: 'Infection in any part of the urinary system',
    category: 'infectious',
    severity: 'medium'
  },

  // Obstetric and Gynecological
  'Pregnancy_complications': {
    system: 'SNOMED',
    code: '289908002',
    label: 'Pregnancy complications',
    description: 'Problems during pregnancy',
    category: 'obstetric',
    severity: 'high'
  },
  'Vaginal_bleeding': {
    system: 'SNOMED',
    code: '300751009',
    label: 'Vaginal bleeding',
    description: 'Bleeding from the vagina',
    category: 'gynecological',
    severity: 'high'
  },

  // Pediatric Emergencies
  'Pediatric_fever': {
    system: 'SNOMED',
    code: '386661006',
    label: 'Pediatric fever',
    description: 'Fever in children',
    category: 'pediatric',
    severity: 'medium'
  },
  'Pediatric_dehydration': {
    system: 'SNOMED',
    code: '34095006',
    label: 'Pediatric dehydration',
    description: 'Loss of body fluids in children',
    category: 'pediatric',
    severity: 'high'
  },

  // Environmental and Toxicity
  'Poisoning': {
    system: 'SNOMED',
    code: '441935004',
    label: 'Poisoning',
    description: 'Exposure to toxic substances',
    category: 'toxicology',
    severity: 'critical'
  },
  'Heat_exhaustion': {
    system: 'SNOMED',
    code: '194828000',
    label: 'Heat exhaustion',
    description: 'Condition caused by excessive heat exposure',
    category: 'environmental',
    severity: 'high'
  },
  'Hypothermia': {
    system: 'SNOMED',
    code: '238530007',
    label: 'Hypothermia',
    description: 'Abnormally low body temperature',
    category: 'environmental',
    severity: 'critical'
  },

  // Psychiatric Emergencies
  'Suicidal_ideation': {
    system: 'SNOMED',
    code: '21900002',
    label: 'Suicidal ideation',
    description: 'Thoughts of suicide',
    category: 'psychiatric',
    severity: 'critical'
  },
  'Psychosis': {
    system: 'SNOMED',
    code: '58214004',
    label: 'Psychosis',
    description: 'Loss of contact with reality',
    category: 'psychiatric',
    severity: 'high'
  },

  // Other Common Complaints
  'Dizziness': {
    system: 'SNOMED',
    code: '44506000',
    label: 'Dizziness',
    description: 'Sensation of spinning or lightheadedness',
    category: 'neurological',
    severity: 'medium'
  },
  'Fatigue': {
    system: 'SNOMED',
    code: '84229001',
    label: 'Fatigue',
    description: 'Extreme tiredness or exhaustion',
    category: 'general',
    severity: 'low'
  },
  'Back_pain': {
    system: 'SNOMED',
    code: '161891005',
    label: 'Back pain',
    description: 'Pain in the back region',
    category: 'musculoskeletal',
    severity: 'medium'
  },
  'Joint_pain': {
    system: 'SNOMED',
    code: '57676002',
    label: 'Joint pain',
    description: 'Pain in one or more joints',
    category: 'musculoskeletal',
    severity: 'medium'
  }
};

/**
 * Helper function to map a WikiEM topic slug to its chief complaint
 * @param slug - The WikiEM topic slug (e.g., 'Chest_pain')
 * @returns ChiefComplaint object or null if not found
 */
export function mapTopicToChiefComplaint(slug: string): ChiefComplaint | null {
  return chiefComplaintMap[slug] || null;
}

/**
 * Get all chief complaints for a specific category
 * @param category - The category to filter by
 * @returns Array of ChiefComplaint objects
 */
export function getChiefComplaintsByCategory(category: string): ChiefComplaint[] {
  return Object.values(chiefComplaintMap).filter(cc => cc.category === category);
}

/**
 * Get all chief complaints by severity level
 * @param severity - The severity level to filter by
 * @returns Array of ChiefComplaint objects
 */
export function getChiefComplaintsBySeverity(severity: 'low' | 'medium' | 'high' | 'critical'): ChiefComplaint[] {
  return Object.values(chiefComplaintMap).filter(cc => cc.severity === severity);
}

/**
 * Search chief complaints by label or description
 * @param query - The search query
 * @returns Array of ChiefComplaint objects matching the query
 */
export function searchChiefComplaints(query: string): ChiefComplaint[] {
  const lowerQuery = query.toLowerCase();
  return Object.values(chiefComplaintMap).filter(cc => 
    cc.label.toLowerCase().includes(lowerQuery) ||
    (cc.description && cc.description.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get all available categories
 * @returns Array of unique category names
 */
export function getAvailableCategories(): string[] {
  const categories = new Set(Object.values(chiefComplaintMap).map(cc => cc.category));
  return Array.from(categories).filter(Boolean) as string[];
}

/**
 * Get coverage statistics for chief complaints
 * @returns Object with coverage information
 */
export function getChiefComplaintCoverage(): {
  total: number;
  byCategory: { [category: string]: number };
  bySeverity: { [severity: string]: number };
} {
  const byCategory: { [category: string]: number } = {};
  const bySeverity: { [severity: string]: number } = {};

  Object.values(chiefComplaintMap).forEach(cc => {
    if (cc.category) {
      byCategory[cc.category] = (byCategory[cc.category] || 0) + 1;
    }
    if (cc.severity) {
      bySeverity[cc.severity] = (bySeverity[cc.severity] || 0) + 1;
    }
  });

  return {
    total: Object.keys(chiefComplaintMap).length,
    byCategory,
    bySeverity
  };
}

export default chiefComplaintMap;
