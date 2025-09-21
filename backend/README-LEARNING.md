# Self-Learning System Documentation

## Overview

The ErMate backend includes a self-learning system that continuously improves diagnosis accuracy through Bayesian updates based on user feedback. The system is designed to be safe, simple, and privacy-preserving.

## Key Features

### 1. Bayesian Learning Updates

The system applies lightweight Bayesian updates to diagnosis confidence scores:

```
new_confidence = sigmoid( logit(base) + alpha*(successes - failures) )
```

Where:
- `base` = original confidence score (0-1)
- `alpha` = learning rate (default: 0.1, configurable)
- `successes` = count of feedback where confirmedDiagnosis == dx.label
- `failures` = count where a different dx was confirmed

### 2. Feature Matching

The system matches historical feedback based on:
- **Age group** (adult/pediatric)
- **Chief complaint** (primary symptom or site)
- **Top symptoms** (up to 5 most relevant symptoms)
- **Key vitals** (HR, SBP, SpO2, Temp)
- **Risk factors** (from past history)

### 3. Privacy-Preserving Analytics

- Feedback data is de-identified in analytics aggregation
- No personally identifiable information is exposed in learning statistics
- Data is aggregated at the diagnosis level, not individual level

## Architecture

### Learning Service (`src/services/learningService.js`)

Core learning functionality:
- Feature extraction from clinical data
- Historical feedback matching
- Bayesian confidence updates
- Learning statistics computation

### Cron Service (`src/services/cronService.js`)

Scheduled tasks for analytics:
- **Daily summary statistics** (2 AM UTC)
- **Weekly learning analytics** (Sunday 3 AM UTC)
- **Performance optimization** through cached statistics

### Learning Routes (`src/routes/learning.js`)

API endpoints for learning analytics:
- `GET /api/learning/stats/:diagnosis` - Get learning statistics for a diagnosis
- `GET /api/learning/summary` - Get current summary statistics
- `GET /api/learning/analytics` - Get learning analytics for all diagnoses

## Usage Examples

### 1. Submitting Feedback

```bash
curl -X POST http://localhost:3000/api/symptoms/feedback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "sessionId": "session-uuid",
    "outcome": "diagnosed",
    "confirmedDiagnosis": "Acute Coronary Syndrome",
    "notes": "Confirmed by cardiologist - STEMI on ECG"
  }'
```

### 2. Getting Learning Statistics

```bash
# Get statistics for a specific diagnosis
curl -X GET "http://localhost:3000/api/learning/stats/Acute%20Coronary%20Syndrome" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response:
{
  "message": "Learning statistics retrieved successfully",
  "diagnosis": "Acute Coronary Syndrome",
  "stats": {
    "totalFeedback": 15,
    "confirmedCount": 12,
    "successRate": 0.8,
    "recentFeedback": [...]
  }
}
```

### 3. Getting Summary Statistics

```bash
curl -X GET http://localhost:3000/api/learning/summary \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response:
{
  "message": "Summary statistics retrieved successfully",
  "stats": {
    "totalFeedback": 150,
    "feedbackByOutcome": {
      "diagnosed": 120,
      "improved": 20,
      "worsened": 10
    },
    "topDiagnoses": {
      "acute coronary syndrome": 25,
      "pneumonia": 18,
      "asthma/copd exacerbation": 15
    },
    "ageGroupDistribution": {
      "adult": 120,
      "pediatric": 30
    },
    "recentActivity": [...]
  }
}
```

## Configuration

### Learning Rate

The learning rate (`alpha`) can be configured in `src/services/learningService.js`:

```javascript
class LearningService {
  constructor() {
    this.alpha = 0.1; // Learning rate (configurable)
  }
}
```

### Cron Schedule

Cron jobs can be configured in `src/services/cronService.js`:

```javascript
// Daily summary statistics (2 AM UTC)
cron.schedule('0 2 * * *', async () => {
  // ...
});

// Weekly learning analytics (Sunday 3 AM UTC)
cron.schedule('0 3 * * 0', async () => {
  // ...
});
```

## Learning Process

### 1. Feature Extraction

When a diagnosis is requested, the system extracts key features:

```javascript
const features = {
  ageGroup: 'adult',
  chiefComplaint: 'chest pain',
  topSymptoms: ['chest pain', 'shortness of breath', 'diaphoresis'],
  keyVitals: { hr: 110, sbp: 140, spo2: 92 },
  riskFactors: ['hypertension', 'diabetes']
};
```

### 2. Historical Matching

The system finds historical feedback with similar features:

```javascript
const historicalFeedback = await learningService.fetchHistoricalFeedback(
  features,
  candidateLabels
);
```

### 3. Bayesian Update

For each diagnosis, the system applies Bayesian updates:

```javascript
const update = learningService.calculateBayesianUpdate(
  baseConfidence,
  diagnosisLabel,
  historicalFeedback
);
```

### 4. Confidence Adjustment

The final confidence is adjusted based on learning:

```javascript
const finalConfidence = update.newConfidence;
const learningData = {
  successes: update.successes,
  failures: update.failures,
  update: update.update,
  historicalMatches: historicalFeedback.length
};
```

## Privacy and Security

### Data De-identification

- Feedback data is aggregated at the diagnosis level
- No individual patient data is exposed in analytics
- Session IDs and user IDs are not included in learning statistics

### Access Control

- Learning analytics require doctor-level authentication
- Feedback submission requires patient or doctor authentication
- All endpoints are protected by JWT authentication

### Data Retention

- Historical feedback is retained for learning purposes
- Analytics are computed on-demand and cached
- Old feedback can be archived or deleted based on policy

## Monitoring and Analytics

### Daily Summary Statistics

Computed daily at 2 AM UTC:
- Total feedback count
- Success rates by diagnosis
- Age group distribution
- Common symptoms by diagnosis
- Average confidence scores

### Weekly Learning Analytics

Computed weekly on Sundays at 3 AM UTC:
- Learning progress over time
- Diagnosis accuracy trends
- Feedback patterns
- Performance metrics

### Real-time Statistics

Available via API endpoints:
- Current learning statistics
- Recent feedback activity
- Diagnosis performance metrics

## Testing

### Running Learning Tests

```bash
# Run all learning tests
npm test -- --testPathPattern=learning.test.js

# Run specific learning test
npm test -- --testNamePattern="should apply learning to subsequent diagnoses"
```

### Test Coverage

The learning system includes tests for:
- Feedback submission and storage
- Bayesian update calculations
- Feature extraction and matching
- Privacy and data protection
- API endpoint functionality

## Troubleshooting

### Common Issues

1. **Learning not applied**: Check if historical feedback exists for the diagnosis
2. **Low confidence scores**: Verify that feedback data is being submitted correctly
3. **Cron jobs not running**: Check server logs and cron service initialization
4. **API errors**: Verify authentication and request format

### Debugging

Enable debug logging in `src/services/learningService.js`:

```javascript
console.log('Learning update:', {
  diagnosis: diagnosisLabel,
  baseConfidence,
  successes,
  failures,
  newConfidence: update.newConfidence
});
```

## Future Enhancements

### Planned Features

1. **Advanced Feature Matching**: Machine learning-based feature similarity
2. **Confidence Intervals**: Statistical confidence bounds for predictions
3. **A/B Testing**: Experimental diagnosis algorithms
4. **Real-time Learning**: Immediate updates based on feedback
5. **Performance Optimization**: Cached learning results for faster queries

### Integration Opportunities

1. **EMR Integration**: Import confirmed diagnoses from electronic medical records
2. **Clinical Decision Support**: Integration with clinical guidelines
3. **Research Analytics**: Anonymized data for research purposes
4. **Quality Assurance**: Automated quality checks and alerts
