export type ABCDE = {
  airway: 'clear' | 'obstructed' | 'stridor' | 'unknown';
  breathing: {
    rr?: number;
    spo2?: number;
    distress?: boolean;
    wheeze?: boolean;
    cyanosis?: boolean;
  };
  circulation: {
    hr?: number;
    sbp?: number;
    dbp?: number;
    capRefillSec?: number;
    temp?: number;
    bleeding?: 'none' | 'minor' | 'major';
  };
  disability: {
    gcs?: number;
    avpu?: 'A' | 'V' | 'P' | 'U';
    seizure?: boolean;
    focalDeficit?: boolean;
    glucose?: number;
  };
  exposure: {
    trauma?: boolean;
    rash?: boolean;
    painPresent?: boolean;
    burns?: 'none' | 'minor' | 'major';
    tempExtremes?: boolean;
  };
};

export type SAMPLE = {
  signsSymptoms: string[];
  allergies?: string[];
  medications?: string[]; // names or RxNorm codes
  pastHistory?: string[]; // comorbidities
  lastMeal?: string;
  events?: string; // events leading up to illness
};

export type SOCRATES = {
  site?: string;
  onset?: 'sudden' | 'gradual' | 'intermittent';
  character?: string; // e.g., 'crushing', 'sharp', 'burning'
  radiation?: string[];
  associated?: string[]; // nausea, diaphoresis, dyspnea...
  timeCourse?: string; // duration, pattern
  exacerbatingRelieving?: string; // exertion, rest, posture, nitro, etc.
  severityNRS?: number; // 0-10
};

export type Vitals = {
  hr?: number;
  rr?: number;
  sbp?: number;
  dbp?: number;
  spo2?: number;
  temp?: number;
  gcs?: number;
};

export type AgeGroup = 'adult' | 'pediatric';

export type TriageResult = {
  priority: 'Priority I' | 'Priority II' | 'Priority III' | 'Priority IV';
  color: 'Red' | 'Orange' | 'Yellow' | 'Green';
  reasons: string[];
  map?: number;
  mews?: number;
  recommendedAction: string;
};

export type ProvisionalDx = {
  label: string; // e.g., 'Acute Coronary Syndrome'
  confidence: number; // 0-1
  rationale: string; // concise explanation
};

export type CheckResult = {
  triage: TriageResult;
  top5: ProvisionalDx[]; // five most probable
  safetyFlags: string[]; // red flags hit
  advice: string; // next-step layperson advice
  clinicianNotes?: string; // extra detail for doctor view
};

export type SessionTranscript = {
  id: string;
  userId: string;
  age: number;
  sex?: 'male' | 'female' | 'other';
  ageGroup: AgeGroup;
  abcde?: ABCDE;
  sample?: SAMPLE;
  socrates?: SOCRATES;
  ros?: string[]; // simple list for now; extend later
  vitals?: Vitals;
  createdAt: string;
  completedAt?: string;
  result?: CheckResult;
};
