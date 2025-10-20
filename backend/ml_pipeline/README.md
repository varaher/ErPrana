# ML Training Pipeline for Symptom Intelligence Layer

## Overview
This pipeline collects interaction data from the Symptom Intelligence Layer and prepares it for ML model training.

## Data Collection

The system automatically logs all interactions to MongoDB:
- **Collection**: `interactions_log`
- **Session Data**: `symptom_sessions`

### Logged Events:
1. `session_created` - New interview started
2. `slot_filled` - User answered a question
3. `triage_completed` - Interview completed with triage level

## Usage

### Export Training Data
```bash
python ml_data_collector.py --export --days 30
```
Exports last 30 days of completed sessions to CSV and JSON formats.

### View Statistics
```bash
python ml_data_collector.py --stats --days 7
```
Shows statistics about the training data.

### Analyze Triage Accuracy
```bash
python ml_data_collector.py --accuracy
```
Analyzes triage level distribution across complaints.

## Data Format

### Training Dataset Columns:
- `session_id`: Unique session identifier
- `chief_complaint`: Type of complaint (chest pain, fever, etc.)
- `collected_slots`: JSON of all collected slot values
- `triage_level`: Final triage level (🟥 Red, 🟧 Orange, 🟨 Yellow, 🟩 Green)
- `interaction_count`: Number of interactions in session
- `completion_time_seconds`: Time to complete interview
- `user_responses`: List of all user responses
- `created_at`: Session creation timestamp

## Future ML Models

### Planned Models:

1. **Triage Prediction Model**
   - Input: Chief complaint + partial slot data
   - Output: Predicted triage level
   - Use case: Early emergency detection

2. **Slot Value Prediction Model**
   - Input: Chief complaint + answered slots
   - Output: Suggested next question priority
   - Use case: Adaptive questioning

3. **Natural Language Understanding Model**
   - Input: User free-text response
   - Output: Structured slot value
   - Use case: Better entity extraction

4. **Completion Time Prediction**
   - Input: Chief complaint + user characteristics
   - Output: Expected interview duration
   - Use case: User experience optimization

## Data Privacy

All data is anonymized:
- User IDs are hashed
- No PHI (Protected Health Information) is stored
- Only symptom responses and triage outcomes are collected

## Requirements

```bash
pip install pandas pymongo
```

## Integration

The ML pipeline integrates with:
- Symptom Intelligence Layer (data source)
- MongoDB (data storage)
- Future: TensorFlow/PyTorch for model training
