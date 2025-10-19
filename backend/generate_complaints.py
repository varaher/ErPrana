#!/usr/bin/env python3
"""
Generate complaint JSON files for top 20 Red-level complaints
"""

import json
import os

COMPLAINTS_DIR = "/app/backend/symptom_intelligence/complaints"

# Define all 20 top Red-level complaints with their configurations
complaints = {
    "shortness_of_breath": {
        "chief_complaint": "Shortness of Breath",
        "priority": "🟥 Red",
        "slots": ["onset", "severity", "rest_or_exertion", "chest_pain", "risk_factors", "duration"],
        "questions": {
            "onset": "When did the shortness of breath start? Was it sudden or gradual?",
            "severity": "On a scale of 1-10, how severe is your breathing difficulty?",
            "rest_or_exertion": "Does it occur at rest or only with activity?",
            "chest_pain": "Do you have any chest pain along with the shortness of breath?",
            "risk_factors": "Do you have any of these: recent surgery, long travel, leg swelling, history of blood clots?",
            "duration": "How long have you been experiencing this?"
        },
        "completion_threshold": 4,
        "triage_rules": [
            {
                "expression": "'sudden' in str(onset).lower() and 'rest' in str(rest_or_exertion).lower() and int(severity) >= 7 and ('yes' in str(risk_factors).lower() or 'surgery' in str(risk_factors).lower())",
                "level": "🟥 Red",
                "reason": "Possible Pulmonary Embolism (PE) - Immediate Emergency Care Required"
            },
            {
                "expression": "'rest' in str(rest_or_exertion).lower() and int(severity) >= 6",
                "level": "🟥 Red",
                "reason": "Severe shortness of breath at rest - Emergency evaluation needed"
            },
            {
                "expression": "int(severity) >= 5 and 'yes' in str(chest_pain).lower()",
                "level": "🟧 Orange",
                "reason": "Moderate shortness of breath with chest pain - Urgent evaluation needed"
            }
        ]
    },
    "fever": {
        "chief_complaint": "Fever",
        "priority": "🟥 Red",
        "slots": ["duration", "temperature", "pattern", "associated_symptoms", "recent_travel", "immune_status"],
        "questions": {
            "duration": "How long have you had a fever?",
            "temperature": "What is the highest temperature you've recorded?",
            "pattern": "Is the fever constant or does it come and go?",
            "associated_symptoms": "Do you have any other symptoms like headache, stiff neck, rash, confusion, or difficulty breathing?",
            "recent_travel": "Have you traveled recently or been exposed to anyone who is sick?",
            "immune_status": "Do you have any conditions that affect your immune system, or are you on immunosuppressive medications?"
        },
        "completion_threshold": 3,
        "triage_rules": [
            {
                "expression": "float(str(temperature).replace('f','').replace('c','').replace('°','').split()[0]) >= 39.0 and ('stiff neck' in str(associated_symptoms).lower() or 'confusion' in str(associated_symptoms).lower() or 'rash' in str(associated_symptoms).lower())",
                "level": "🟥 Red",
                "reason": "Possible Meningitis or Sepsis - Immediate Emergency Care Required"
            },
            {
                "expression": "float(str(temperature).replace('f','').replace('c','').replace('°','').split()[0]) >= 40.0",
                "level": "🟥 Red",
                "reason": "Very high fever (>104°F/40°C) - Emergency evaluation needed"
            },
            {
                "expression": "'yes' in str(immune_status).lower() and float(str(temperature).replace('f','').replace('c','').replace('°','').split()[0]) >= 38.5",
                "level": "🟧 Orange",
                "reason": "Fever in immunocompromised patient - Urgent evaluation needed"
            }
        ]
    },
    "altered_mental_status": {
        "chief_complaint": "Altered Mental Status",
        "priority": "🟥 Red",
        "slots": ["onset", "level_of_consciousness", "recent_trauma", "medical_history", "medications", "associated_symptoms"],
        "questions": {
            "onset": "When did the confusion or altered mental status start?",
            "level_of_consciousness": "Is the person alert, confused, drowsy, or unresponsive?",
            "recent_trauma": "Has there been any recent head injury or trauma?",
            "medical_history": "Do you have diabetes, seizure disorder, or other medical conditions?",
            "medications": "What medications are you currently taking?",
            "associated_symptoms": "Are there any other symptoms like fever, headache, weakness, or difficulty speaking?"
        },
        "completion_threshold": 3,
        "triage_rules": [
            {
                "expression": "'unresponsive' in str(level_of_consciousness).lower() or 'drowsy' in str(level_of_consciousness).lower()",
                "level": "🟥 Red",
                "reason": "Decreased level of consciousness - Immediate Emergency Care Required"
            },
            {
                "expression": "'yes' in str(recent_trauma).lower() and 'confused' in str(level_of_consciousness).lower()",
                "level": "🟥 Red",
                "reason": "Altered mental status after trauma - Possible head injury - Emergency evaluation needed"
            },
            {
                "expression": "'confused' in str(level_of_consciousness).lower() and 'fever' in str(associated_symptoms).lower()",
                "level": "🟥 Red",
                "reason": "Confusion with fever - Possible meningitis or encephalitis - Emergency care required"
            }
        ]
    },
    "headache": {
        "chief_complaint": "Headache",
        "priority": "🟥 Red",
        "slots": ["onset", "severity", "location", "character", "associated_symptoms", "duration"],
        "questions": {
            "onset": "When did the headache start? Was it sudden (thunderclap) or gradual?",
            "severity": "On a scale of 1-10, how severe is the headache? Is it the worst headache of your life?",
            "location": "Where is the headache located? (front, back, side, all over)",
            "character": "How would you describe the pain? (throbbing, sharp, dull, pressure)",
            "associated_symptoms": "Do you have any other symptoms like vision changes, weakness, confusion, stiff neck, fever, or nausea?",
            "duration": "How long have you had this headache?"
        },
        "completion_threshold": 4,
        "triage_rules": [
            {
                "expression": "'sudden' in str(onset).lower() and int(severity) >= 8 and ('worst' in str(severity).lower() or 'thunderclap' in str(onset).lower())",
                "level": "🟥 Red",
                "reason": "Thunderclap headache - Possible Subarachnoid Hemorrhage (SAH) - Immediate Emergency Care Required"
            },
            {
                "expression": "('stiff neck' in str(associated_symptoms).lower() or 'confusion' in str(associated_symptoms).lower()) and 'fever' in str(associated_symptoms).lower()",
                "level": "🟥 Red",
                "reason": "Headache with meningeal signs - Possible Meningitis - Immediate Emergency Care Required"
            },
            {
                "expression": "'weakness' in str(associated_symptoms).lower() or 'vision' in str(associated_symptoms).lower() or 'confusion' in str(associated_symptoms).lower()",
                "level": "🟧 Orange",
                "reason": "Headache with neurological symptoms - Urgent evaluation needed"
            }
        ]
    },
    "syncope": {
        "chief_complaint": "Syncope",
        "priority": "🟥 Red",
        "slots": ["circumstances", "warning_signs", "duration_unconscious", "recovery", "chest_pain", "palpitations"],
        "questions": {
            "circumstances": "What were you doing when you fainted? (standing, sitting, exercising)",
            "warning_signs": "Did you have any warning before fainting? (dizziness, nausea, vision changes)",
            "duration_unconscious": "How long were you unconscious?",
            "recovery": "Did you recover immediately or feel confused afterward?",
            "chest_pain": "Did you have chest pain before or after fainting?",
            "palpitations": "Did you feel your heart racing or skipping beats?"
        },
        "completion_threshold": 3,
        "triage_rules": [
            {
                "expression": "'yes' in str(chest_pain).lower() or 'yes' in str(palpitations).lower()",
                "level": "🟥 Red",
                "reason": "Syncope with cardiac symptoms - Possible arrhythmia - Immediate Emergency Care Required"
            },
            {
                "expression": "'exercising' in str(circumstances).lower() or 'exercise' in str(circumstances).lower()",
                "level": "🟥 Red",
                "reason": "Syncope during exertion - Possible cardiac cause - Emergency evaluation needed"
            },
            {
                "expression": "'confused' in str(recovery).lower() or int(str(duration_unconscious).split()[0] if str(duration_unconscious).split() else '0') > 1",
                "level": "🟧 Orange",
                "reason": "Prolonged loss of consciousness or slow recovery - Urgent evaluation needed"
            }
        ]
    },
    "seizures": {
        "chief_complaint": "Seizures",
        "priority": "🟥 Red",
        "slots": ["first_seizure", "duration", "type", "post_ictal_state", "head_trauma", "fever"],
        "questions": {
            "first_seizure": "Is this the first seizure ever, or have you had seizures before?",
            "duration": "How long did the seizure last?",
            "type": "What type of movements occurred? (shaking, stiffness, staring)",
            "post_ictal_state": "How is the person now? Alert, confused, or still drowsy?",
            "head_trauma": "Was there any recent head injury?",
            "fever": "Is there a fever present?"
        },
        "completion_threshold": 3,
        "triage_rules": [
            {
                "expression": "'first' in str(first_seizure).lower() and 'yes' in str(first_seizure).lower()",
                "level": "🟥 Red",
                "reason": "First-time seizure - Immediate Emergency Care Required"
            },
            {
                "expression": "int(str(duration).split()[0] if str(duration).split() else '0') > 5",
                "level": "🟥 Red",
                "reason": "Prolonged seizure (>5 minutes) - Status epilepticus - Emergency care required"
            },
            {
                "expression": "'yes' in str(head_trauma).lower()",
                "level": "🟥 Red",
                "reason": "Seizure after head trauma - Emergency evaluation needed"
            }
        ]
    }
}

# Additional complaints (shortened for brevity - will add full details)
additional_complaints = [
    "hematemesis", "hemoptysis", "sudden_vision_loss", "severe_abdominal_pain",
    "unconsciousness", "stroke_symptoms", "weakness_acute", "chest_tightness",
    "cyanosis", "severe_bleeding", "hypotension", "palpitations", "anaphylaxis"
]

# Create complaint files
os.makedirs(COMPLAINTS_DIR, exist_ok=True)

for filename, data in complaints.items():
    filepath = os.path.join(COMPLAINTS_DIR, f"{filename}.json")
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"✅ Created {filepath}")

print(f"\n📊 Created {len(complaints)} complaint files")
print("Note: Additional complaint files need to be created for complete top 20")
