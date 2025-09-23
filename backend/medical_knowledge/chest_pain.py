"""
Chest Pain Clinical Knowledge Base
Based on emergency medicine protocols for systematic chest pain evaluation
"""

CHEST_PAIN_KNOWLEDGE = {
    "initial_approach": {
        "mandatory_actions": [
            "Place patient on cardiac monitor",
            "Establish IV access",
            "Obtain vital signs including oxygen saturation"
        ]
    },
    
    "symptom_descriptors": {
        "abrupt_severe_ripping": {
            "differentials": ["aortic dissection", "esophageal rupture"],
            "keywords": ["abrupt", "sudden", "severe", "ripping", "tearing", "back radiation"],
            "urgency": "EMERGENCY"
        },
        "pleuritic_dyspnea": {
            "differentials": ["pulmonary embolism", "spontaneous pneumothorax"],
            "keywords": ["pleuritic", "sharp with breathing", "dyspnea", "shortness of breath"],
            "urgency": "EMERGENCY"
        },
        "gradual_pressure": {
            "differentials": ["myocardial infarction"],
            "keywords": ["gradual", "pressure", "crushing", "squeezing", "substernal"],
            "urgency": "EMERGENCY"
        }
    },
    
    "conditions": {
        "stemi": {
            "name": "ST Elevation Myocardial Infarction",
            "risk_factors": ["diabetes", "hypertension", "smoking", "family history"],
            "typical_presentation": "Substernal pain, gradual onset, pressure sensation",
            "examination": "May be normal or signs of heart failure",
            "essential_tests": ["EKG for ST elevations/LBBB", "CXR", "Troponin"],
            "treatment": [
                "Aspirin (clopidogrel if allergic)",
                "Nitroglycerin (avoid if RV infarct)",
                "Anticoagulation (heparin/LMWH)",
                "Emergent cardiac catheterization or thrombolytics"
            ],
            "urgency": "EMERGENCY",
            "likelihood_modifiers": {
                "high_risk": ["diabetes", "smoking", "family_history", "hypertension"],
                "typical_symptoms": ["substernal", "pressure", "gradual onset"],
                "age_male_over_40": 1.5,
                "age_female_over_50": 1.5
            }
        },
        
        "pulmonary_embolism": {
            "name": "Pulmonary Embolism",
            "risk_factors": ["cancer", "recent surgery", "long travel", "DVT history", "oral contraceptives"],
            "typical_presentation": "Dyspnea, cough, pleuritic chest pain",
            "examination": "Tachypnea, tachycardia, clear lungs, leg swelling",
            "essential_tests": ["EKG (right heart strain)", "CXR", "D-dimer", "CT angiogram"],
            "treatment": ["Anticoagulation with heparin/LMWH"],
            "urgency": "EMERGENCY",
            "likelihood_modifiers": {
                "high_risk": ["cancer", "recent_surgery", "immobilization", "pregnancy"],
                "typical_symptoms": ["dyspnea", "pleuritic", "cough"]
            }
        },
        
        "aortic_dissection": {
            "name": "Aortic Dissection",
            "risk_factors": ["marfan syndrome", "connective tissue disease", "family history", "aortic instrumentation"],
            "typical_presentation": "Abrupt onset, severe, ripping/tearing pain, back radiation",
            "examination": "Pulse deficit, neurologic deficits, new diastolic murmur",
            "essential_tests": ["EKG", "CXR (widened mediastinum)", "CT angiogram"],
            "treatment": [
                "Beta-blocker for rate control (pulse <60)",
                "IV morphine for pain",
                "Nitroprusside if SBP >120",
                "Emergent surgical consultation"
            ],
            "urgency": "EMERGENCY",
            "likelihood_modifiers": {
                "high_risk": ["marfan", "connective_tissue", "hypertension"],
                "typical_symptoms": ["abrupt", "ripping", "tearing", "severe"]
            }
        },
        
        "pneumothorax": {
            "name": "Spontaneous Pneumothorax",
            "risk_factors": ["tall thin young males", "marfan syndrome", "COPD"],
            "typical_presentation": "Sudden onset pleuritic pain with dyspnea",
            "examination": "Decreased/absent breath sounds on affected side",
            "essential_tests": ["CXR (pleural edge)"],
            "treatment": [
                "Small (<3cm): O2 + observation",
                "Large: tube thoracostomy",
                "Unstable: immediate decompression"
            ],
            "urgency": "URGENT",
            "likelihood_modifiers": {
                "high_risk": ["young_male", "tall_thin", "marfan"],
                "typical_symptoms": ["sudden", "pleuritic", "dyspnea"]
            }
        },
        
        "esophageal_rupture": {
            "name": "Ruptured Esophagus (Boerhaave Syndrome)",
            "risk_factors": ["alcohol abuse", "caustic ingestion", "forceful vomiting"],
            "typical_presentation": "Retrosternal pain following vomiting/retching",
            "examination": "Subcutaneous emphysema in chest wall",
            "essential_tests": ["CXR (pneumomediastinum)", "CT chest or gastrograffin swallow"],
            "treatment": ["Broad-spectrum antibiotics", "Surgical consultation"],
            "urgency": "EMERGENCY",
            "likelihood_modifiers": {
                "high_risk": ["alcohol_abuse", "recent_vomiting"],
                "typical_symptoms": ["post_vomiting", "retrosternal"]
            }
        }
    },
    
    "emergency_criteria": [
        "STEMI on EKG",
        "Aortic dissection symptoms (ripping/tearing pain)",
        "Massive PE with hemodynamic instability",
        "Tension pneumothorax",
        "Esophageal rupture"
    ],
    
    "red_flags": [
        "Hemodynamic instability",
        "New neurologic deficits",
        "Pulse deficits",
        "Severe respiratory distress",
        "Subcutaneous emphysema"
    ]
}

def analyze_chest_pain_symptoms(symptoms: dict, patient_factors: dict) -> dict:
    """
    Analyze chest pain symptoms using clinical knowledge base
    Returns structured assessment with differentials and urgency
    """
    
    assessment = {
        "differentials": [],
        "urgency": "URGENT",  # Default for chest pain
        "recommended_tests": [],
        "immediate_actions": CHEST_PAIN_KNOWLEDGE["initial_approach"]["mandatory_actions"]
    }
    
    # Analyze symptom descriptors
    symptom_text = symptoms.get("description", "").lower()
    
    for descriptor, info in CHEST_PAIN_KNOWLEDGE["symptom_descriptors"].items():
        if any(keyword in symptom_text for keyword in info["keywords"]):
            assessment["differentials"].extend(info["differentials"])
            if info["urgency"] == "EMERGENCY":
                assessment["urgency"] = "EMERGENCY"
    
    # Calculate likelihood for each condition
    condition_scores = {}
    
    for condition_key, condition in CHEST_PAIN_KNOWLEDGE["conditions"].items():
        score = 0.3  # Base probability for chest pain
        
        # Risk factor scoring
        patient_risk_factors = patient_factors.get("risk_factors", [])
        condition_risk_factors = condition["risk_factors"]
        
        for risk_factor in condition_risk_factors:
            if any(rf.lower() in risk_factor.lower() for rf in patient_risk_factors):
                score += 0.2
        
        # Symptom scoring
        if "likelihood_modifiers" in condition:
            modifiers = condition["likelihood_modifiers"]
            
            if "typical_symptoms" in modifiers:
                for symptom in modifiers["typical_symptoms"]:
                    if symptom in symptom_text:
                        score += 0.25
            
            if "high_risk" in modifiers:
                for risk in modifiers["high_risk"]:
                    if any(rf.lower() in risk.lower() for rf in patient_risk_factors):
                        score += 0.15
        
        condition_scores[condition_key] = min(score, 0.95)  # Cap at 95%
    
    # Sort by likelihood and create differential list
    sorted_conditions = sorted(condition_scores.items(), key=lambda x: x[1], reverse=True)
    
    for condition_key, likelihood in sorted_conditions[:4]:  # Top 4
        condition = CHEST_PAIN_KNOWLEDGE["conditions"][condition_key]
        assessment["differentials"].append({
            "condition": condition["name"],
            "likelihood": int(likelihood * 100),
            "description": condition["typical_presentation"],
            "rationale": f"Risk factors and symptom pattern consistent with {condition['name'].lower()}",
            "urgency": condition["urgency"]
        })
    
    return assessment