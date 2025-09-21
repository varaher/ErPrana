# Triage API Documentation

## Overview

The Triage API provides stateless assessment capabilities for emergency triage and differential diagnosis. It includes both authenticated and playground routes for testing and development.

## Routes

### 1. Playground Route (No Authentication Required)

**Endpoint:** `POST /api/playground`

**Purpose:** Stateless triage assessment for testing and development. No authentication required.

**Request Body:**
```json
{
  "age": 65,
  "sex": "male",
  "abcde": {
    "airway": "clear",
    "breathing": {
      "rr": 24,
      "spo2": 92,
      "distress": true,
      "wheeze": false,
      "cyanosis": false
    },
    "circulation": {
      "hr": 110,
      "sbp": 140,
      "dbp": 90,
      "capRefillSec": 2,
      "temp": 37.2,
      "bleeding": "none"
    },
    "disability": {
      "gcs": 15,
      "avpu": "A",
      "seizure": false,
      "focalDeficit": false,
      "glucose": 120
    },
    "exposure": {
      "trauma": false,
      "rash": false,
      "painPresent": true,
      "burns": "none",
      "tempExtremes": false
    }
  },
  "sample": {
    "signsSymptoms": ["chest pain", "shortness of breath", "diaphoresis"],
    "allergies": ["penicillin"],
    "medications": ["aspirin", "metoprolol"],
    "pastHistory": ["hypertension", "diabetes"],
    "lastMeal": "2 hours ago",
    "events": "Started while walking up stairs"
  },
  "socrates": {
    "site": "chest",
    "onset": "sudden",
    "character": "crushing",
    "radiation": ["left arm", "jaw"],
    "associated": ["shortness of breath", "diaphoresis", "nausea"],
    "timeCourse": "30 minutes",
    "exacerbatingRelieving": "worse with exertion, no relief with rest",
    "severityNRS": 9
  },
  "vitals": {
    "hr": 110,
    "rr": 24,
    "sbp": 140,
    "dbp": 90,
    "spo2": 92,
    "temp": 37.2,
    "gcs": 15
  }
}
```

**Response:**
```json
{
  "message": "Triage assessment completed",
  "result": {
    "triage": {
      "priority": "Priority I",
      "color": "Red",
      "reasons": ["Life-threatening condition detected"],
      "map": 107,
      "mews": 3,
      "recommendedAction": "Call emergency services immediately (911) - Life-threatening condition"
    },
    "top5": [
      {
        "label": "Acute Coronary Syndrome",
        "confidence": 0.85,
        "rationale": "Chest pain with typical cardiac features"
      },
      {
        "label": "Pulmonary Embolism",
        "confidence": 0.45,
        "rationale": "Shortness of breath with risk factors"
      }
    ],
    "safetyFlags": ["Severe hypoxia", "Hypotension"],
    "advice": "Call emergency services immediately (911) - Life-threatening condition\n\nSafety concerns: Severe hypoxia, Hypotension",
    "clinicianNotes": "Age: 65, Age Group: adult. Safety flags present: Severe hypoxia, Hypotension."
  },
  "metadata": {
    "age": 65,
    "ageGroup": "adult",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### 2. Authenticated Route

**Endpoint:** `POST /api/triage/assess`

**Purpose:** Stateless triage assessment requiring authentication.

**Authentication:** Required (JWT token in Authorization header)

**Request Body:** Same as playground route

**Response:** Same as playground route

## Test Cases

### 1. Adult Chest Pain (Red Priority)

**Scenario:** 65-year-old male with crushing chest pain, shortness of breath, and concerning vitals.

**Expected Result:**
- Priority: Priority I (Red)
- Top diagnosis: Acute Coronary Syndrome
- Safety flags: Severe hypoxia, Hypotension

### 2. Pediatric Wheeze (Orange Priority)

**Scenario:** 8-year-old female with wheezing, respiratory distress, and asthma history.

**Expected Result:**
- Priority: Priority II (Orange)
- Top diagnosis: Asthma/COPD exacerbation
- Safety flags: Moderate respiratory distress

### 3. Trauma with Altered Mental Status (Red Priority)

**Scenario:** 35-year-old male with head injury, GCS 12, and focal deficits.

**Expected Result:**
- Priority: Priority I (Red)
- Top diagnosis: Head injury/Concussion
- Safety flags: Altered mental status

### 4. Minor Illness (Green Priority)

**Scenario:** 25-year-old female with sore throat and mild symptoms.

**Expected Result:**
- Priority: Priority IV (Green)
- Top diagnosis: Upper respiratory infection
- Safety flags: None

## Running Tests

### Quick Test
```bash
npm run test:playground
```

### Full Test Suite
```bash
npm test
```

### Watch Mode
```bash
npm run test:watch
```

## Validation Rules

### Required Fields
- `age`: Integer (0-120)
- `abcde`: Object with airway, breathing, circulation, disability, exposure
- `sample`: Object with signsSymptoms, allergies, medications, pastHistory, lastMeal, events
- `vitals`: Object with hr, rr, sbp, dbp, spo2, temp, gcs

### Vital Sign Ranges
- Heart Rate: 30-220 bpm
- Respiratory Rate: 4-60 breaths/min
- Systolic BP: 60-250 mmHg
- Diastolic BP: 30-150 mmHg
- SpO2: 50-100%
- Temperature: 33-42°C
- GCS: 3-15

### Optional Fields
- `sex`: "male", "female", or "other"
- `socrates`: Object with pain assessment details

## Clinical Logic

### Triage Priorities

1. **Priority I (Red)**: Life-threatening conditions
   - Cardiac/respiratory arrest
   - Severe shock (MAP < 65)
   - GCS < 8
   - Active seizure
   - Severe respiratory distress (SpO2 < 90)
   - Major bleeding

2. **Priority II (Orange)**: Urgent conditions
   - Severe chest pain
   - Suspected stroke symptoms
   - Severe pain (NRS ≥ 9)
   - Sepsis suspicion
   - DKA suspicion
   - Open fractures

3. **Priority III (Yellow)**: Semi-urgent conditions
   - Moderate trauma
   - Acute abdomen
   - Dehydration
   - UTI with flank pain
   - Allergic reactions

4. **Priority IV (Green)**: Non-urgent conditions
   - Mild fever
   - URI symptoms
   - Minor injuries

### MAP Computation
Mean Arterial Pressure = (SBP + 2×DBP) / 3

### MEWS Scoring
Modified Early Warning Score based on:
- Heart rate
- Respiratory rate
- Systolic blood pressure
- Temperature
- Glasgow Coma Scale

## Error Handling

### Validation Errors
```json
{
  "errors": [
    {
      "type": "field",
      "value": 300,
      "msg": "Heart rate must be between 30 and 220",
      "path": "vitals.hr",
      "location": "body"
    }
  ]
}
```

### Server Errors
```json
{
  "error": "Failed to perform triage assessment"
}
```

## Integration Examples

### cURL Example
```bash
curl -X POST http://localhost:3000/api/playground \
  -H "Content-Type: application/json" \
  -d '{
    "age": 65,
    "sex": "male",
    "abcde": {
      "airway": "clear",
      "breathing": {"rr": 24, "spo2": 92, "distress": true},
      "circulation": {"hr": 110, "sbp": 140, "dbp": 90},
      "disability": {"gcs": 15},
      "exposure": {"trauma": false}
    },
    "sample": {
      "signsSymptoms": ["chest pain"],
      "allergies": [],
      "medications": [],
      "pastHistory": [],
      "lastMeal": "2 hours ago",
      "events": "Started while walking"
    },
    "vitals": {
      "hr": 110,
      "rr": 24,
      "sbp": 140,
      "dbp": 90,
      "spo2": 92,
      "temp": 37.2,
      "gcs": 15
    }
  }'
```

### JavaScript Example
```javascript
const response = await fetch('http://localhost:3000/api/playground', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload)
});

const result = await response.json();
console.log('Triage Priority:', result.result.triage.priority);
console.log('Color:', result.result.triage.color);
```
