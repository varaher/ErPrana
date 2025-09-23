"""
Altered Mental Status (Confused Patients) Clinical Knowledge Base
Based on emergency medicine protocols for systematic AMS evaluation
Uses AEIOU TIPS mnemonic for comprehensive differential diagnosis
"""

ALTERED_MENTAL_STATUS_KNOWLEDGE = {
    "immediate_actions": [
        "Assess ABCs and initiate resuscitation if needed",
        "Protect and secure airway if compromised", 
        "Check oxygenation and adequacy of ventilation",
        "Check blood pressure, pulse, fluid support as needed",
        "Place on cardiac and pulse oxygen monitors",
        "Check finger stick glucose immediately",
        "Consider 'coma cocktail': glucose, naloxone, thiamine",
        "Evaluate pupillary response"
    ],
    
    "key_history_sources": [
        "Patient (if able)",
        "Medical alert tags",
        "EMS and bystander reports", 
        "Family or caregivers",
        "Medication lists in wallet",
        "Previous medical records",
        "Prior ED visits"
    ],
    
    "essential_workup": {
        "immediate": [
            "Vital signs including accurate temperature",
            "Oxygen saturation",
            "Rapid glucose determination",
            "Complete neurologic examination"
        ],
        "laboratory": [
            "Chemistry panel (electrolytes, renal, liver function)",
            "Complete blood count", 
            "Urinalysis",
            "Consider: blood cultures, toxicology screening, thyroid function"
        ],
        "imaging": [
            "Chest X-ray",
            "Electrocardiogram",
            "Head CT (if CNS etiology suspected or no other cause found)"
        ],
        "specialized": [
            "Lumbar puncture (if meningitis/encephalitis suspected)",
            "EEG (if nonconvulsive status epilepticus suspected)"
        ]
    },

    # AEIOU TIPS Mnemonic
    "differential_diagnosis": {
        "A_alcohol": {
            "name": "Alcohol/Drug Related",
            "subcategories": {
                "acute_intoxication": {
                    "description": "Acute alcohol or drug intoxication",
                    "keywords": ["drunk", "intoxicated", "alcohol", "drugs"],
                    "urgency": "URGENT"
                },
                "withdrawal": {
                    "description": "Alcohol or benzodiazepine withdrawal, delirium tremens",
                    "keywords": ["withdrawal", "stopped drinking", "tremor", "sweating"],
                    "signs": ["tachycardia", "hypertension", "tremor", "mydriasis"],
                    "treatment": ["benzodiazepines"],
                    "urgency": "EMERGENCY"
                },
                "wernicke_korsakoff": {
                    "description": "Thiamine (B1) deficiency in malnourished/alcoholic patients",
                    "keywords": ["malnourished", "chronic alcoholic"],
                    "signs": ["ataxia", "ophthalmoplegia", "confusion"],
                    "treatment": ["thiamine with glucose"],
                    "urgency": "EMERGENCY"
                }
            }
        },
        
        "E_electrolytes": {
            "name": "Electrolytes/Endocrine/Encephalopathy",
            "subcategories": {
                "hyponatremia": {
                    "description": "Low sodium, often from SIADH",
                    "keywords": ["low sodium"],
                    "risk_factors": ["malignancy", "lung cancer", "brain metastases"],
                    "treatment": ["hypertonic saline for severe cases"],
                    "urgency": "URGENT"
                },
                "hypernatremia": {
                    "description": "High sodium, inadequate thirst response",
                    "keywords": ["dehydration"],
                    "risk_factors": ["elderly", "debilitated", "diabetes insipidus"],
                    "urgency": "URGENT"
                },
                "hypercalcemia": {
                    "description": "Elevated calcium",
                    "causes": ["malignancy", "hyperparathyroidism", "renal failure"],
                    "symptoms": ["nausea", "vomiting", "abdominal pain", "polyuria"],
                    "treatment": ["IV fluids", "furosemide"],
                    "urgency": "URGENT"
                },
                "thyroid_disorders": {
                    "hypothyroid": {
                        "description": "Myxedema coma",
                        "signs": ["bradycardia", "hypotension", "lethargy"],
                        "urgency": "EMERGENCY"
                    },
                    "hyperthyroid": {
                        "description": "Thyroid storm", 
                        "signs": ["tachycardia", "fever", "agitation", "tremor"],
                        "treatment": ["beta-blocker"],
                        "urgency": "EMERGENCY"
                    }
                }
            }
        },
        
        "I_insulin": {
            "name": "Insulin/Glucose Disorders",
            "subcategories": {
                "hypoglycemia": {
                    "description": "Low blood sugar causing confusion, coma, seizures",
                    "presentation": ["confusion", "agitation", "focal neurologic deficit"],
                    "treatment": ["immediate glucose IV bolus"],
                    "urgency": "EMERGENCY"
                },
                "hyperglycemia": {
                    "description": "DKA or hyperosmolar nonketotic state", 
                    "presentation": ["polyuria", "polydipsia", "lethargy"],
                    "treatment": ["IV fluids", "insulin"],
                    "urgency": "EMERGENCY"
                }
            }
        },
        
        "O_oxygen": {
            "name": "Oxygen/Opiates/Overdose",
            "subcategories": {
                "hypoxemia": {
                    "description": "Low oxygen from respiratory causes",
                    "causes": ["pneumonia", "PE", "pneumothorax", "COPD", "CHF"],
                    "treatment": ["supplemental oxygen"],
                    "urgency": "EMERGENCY"
                },
                "hypercarbia": {
                    "description": "CO2 retention causing altered mental status",
                    "risk": ["COPD patients on high-flow oxygen"],
                    "treatment": ["ventilatory support"],
                    "urgency": "EMERGENCY"
                },
                "opiate_overdose": {
                    "description": "Opioid toxicity",
                    "signs": ["pinpoint pupils", "respiratory depression"],
                    "treatment": ["naloxone"],
                    "urgency": "EMERGENCY"
                }
            }
        },
        
        "U_uremia": {
            "name": "Uremia/Renal Disease", 
            "description": "Kidney failure causing uremic encephalopathy",
            "keywords": ["kidney disease", "dialysis", "missed dialysis"],
            "urgency": "URGENT"
        },
        
        "T_trauma_temperature_toxins": {
            "name": "Trauma/Temperature/Toxins",
            "subcategories": {
                "head_trauma": {
                    "description": "Intracranial injury, elevated ICP",
                    "signs": ["Cushing's triad: bradycardia, HTN, irregular breathing"],
                    "workup": ["stat head CT", "neurosurgical consultation"],
                    "urgency": "EMERGENCY"
                },
                "hyperthermia": {
                    "description": "Heat stroke",
                    "criteria": ["temperature >40°C", "confusion", "tachycardia"],
                    "treatment": ["immediate cooling", "evaporative cooling"],
                    "urgency": "EMERGENCY"
                },
                "hypothermia": {
                    "description": "Severe cold exposure",
                    "criteria": ["temperature <35°C", "apathy", "slurred speech"],
                    "treatment": ["rewarming", "warm IV fluids"],
                    "urgency": "EMERGENCY"
                },
                "carbon_monoxide": {
                    "description": "CO poisoning",
                    "symptoms": ["flu-like symptoms", "headache"],
                    "workup": ["carboxyhemoglobin level"],
                    "urgency": "EMERGENCY"
                },
                "anticholinergic_toxidrome": {
                    "description": "Anticholinergic poisoning",
                    "signs": ["mydriasis", "hyperthermia", "dry skin", "hyperemia"],
                    "urgency": "EMERGENCY"
                }
            }
        },
        
        "I_infection_intracranial": {
            "name": "Infection/Intracranial Process",
            "subcategories": {
                "meningitis": {
                    "description": "CNS infection requiring immediate antibiotics",
                    "workup": ["lumbar puncture", "blood cultures"],
                    "treatment": ["empiric antibiotics ASAP"],
                    "urgency": "EMERGENCY"
                },
                "encephalitis": {
                    "description": "Brain parenchyma infection",
                    "special_risk": ["HIV/immunocompromised: toxoplasmosis, cryptococcal"],
                    "urgency": "EMERGENCY"
                },
                "sepsis": {
                    "description": "Systemic infection, common in elderly",
                    "sources": ["pneumonia", "UTI", "intraabdominal", "skin"],
                    "treatment": ["early goal-directed therapy"],
                    "urgency": "EMERGENCY"
                },
                "stroke": {
                    "description": "Cerebrovascular accident",
                    "signs": ["focal neurologic deficits"],
                    "urgency": "EMERGENCY"
                },
                "subarachnoid_hemorrhage": {
                    "description": "SAH",
                    "presentation": ["severe headache", "nuchal rigidity"],
                    "workup": ["CT", "LP if CT negative"],
                    "urgency": "EMERGENCY"
                }
            }
        },
        
        "P_pharmacology_psychiatric": {
            "name": "Pharmacology/Poisoning/Psychiatric",
            "subcategories": {
                "polypharmacy": {
                    "description": "Multiple medications, especially in elderly",
                    "culprits": ["sedatives", "anticholinergics"],
                    "urgency": "URGENT"
                },
                "psychiatric_disorder": {
                    "description": "Psychiatric illness causing altered mental status",
                    "note": "Diagnosis of exclusion, exclude medical causes first",
                    "higher_risk": ["younger patients", "prior psychiatric history"],
                    "urgency": "LESS_URGENT"
                }
            }
        },
        
        "S_seizure_stroke_shock": {
            "name": "Seizure/Stroke/Subdural/Shock",
            "subcategories": {
                "postictal_state": {
                    "description": "Post-seizure confusion",
                    "timeline": ["should resolve within hours"],
                    "urgency": "URGENT"
                },
                "nonconvulsive_status": {
                    "description": "Status epilepticus without motor activity",
                    "presentation": ["confusion", "personality changes", "hallucinations"],
                    "workup": ["EEG required"],
                    "urgency": "EMERGENCY"
                },
                "shock": {
                    "description": "Hypoperfusion from any cause",
                    "causes": ["hemorrhage", "sepsis", "cardiac"],
                    "treatment": ["fluids", "pressors", "transfusion"],
                    "urgency": "EMERGENCY"
                }
            }
        }
    },
    
    "red_flags": [
        "Temperature >40°C or <35°C",
        "Cushing's triad (bradycardia + HTN + irregular breathing)",
        "Pinpoint pupils with respiratory depression", 
        "Focal neurologic deficits",
        "Signs of meningismus",
        "Hemodynamic instability",
        "Blood glucose <50 or >400 mg/dL"
    ],
    
    "sedation_protocol": {
        "indications": [
            "Patient may harm self or others",
            "Agitation impeding medical evaluation/treatment"
        ],
        "first_line": "Verbal de-escalation and reassurance",
        "medications": {
            "haloperidol": {
                "class": "antipsychotic",
                "risks": ["QT prolongation", "extrapyramidal effects", "lowers seizure threshold"]
            },
            "lorazepam": {
                "class": "benzodiazepine", 
                "risks": ["respiratory depression", "especially in elderly/debilitated"]
            }
        }
    }
}

def analyze_altered_mental_status(symptoms: dict, patient_factors: dict) -> dict:
    """
    Analyze altered mental status using AEIOU TIPS systematic approach
    """
    
    assessment = {
        "differentials": [],
        "urgency": "EMERGENCY",  # AMS is always concerning
        "immediate_actions": ALTERED_MENTAL_STATUS_KNOWLEDGE["immediate_actions"],
        "essential_workup": ALTERED_MENTAL_STATUS_KNOWLEDGE["essential_workup"],
        "red_flags_present": []
    }
    
    # Check for red flags first
    symptom_text = symptoms.get("description", "").lower()
    
    for red_flag in ALTERED_MENTAL_STATUS_KNOWLEDGE["red_flags"]:
        flag_keywords = red_flag.lower().split()
        if any(keyword in symptom_text for keyword in flag_keywords):
            assessment["red_flags_present"].append(red_flag)
    
    # Analyze using AEIOU TIPS categories
    condition_scores = {}
    
    # Alcohol/Drug related
    alcohol_keywords = ["alcohol", "drunk", "drinking", "withdrawal", "tremor", "stopped drinking"]
    if any(keyword in symptom_text for keyword in alcohol_keywords):
        condition_scores["alcohol_related"] = 0.7
        
    # Electrolyte/Endocrine
    electrolyte_keywords = ["dehydration", "thirst", "polyuria", "cold intolerance", "heat intolerance"]
    if any(keyword in symptom_text for keyword in electrolyte_keywords):
        condition_scores["electrolyte_endocrine"] = 0.6
        
    # Insulin/Glucose
    glucose_keywords = ["diabetic", "sugar", "glucose", "thirsty", "urination"]
    diabetes_history = "diabetes" in str(patient_factors.get("medical_history", "")).lower()
    if any(keyword in symptom_text for keyword in glucose_keywords) or diabetes_history:
        condition_scores["glucose_disorder"] = 0.8
        
    # Oxygen/Overdose
    respiratory_keywords = ["shortness of breath", "difficulty breathing", "blue", "pills", "overdose"]
    if any(keyword in symptom_text for keyword in respiratory_keywords):
        condition_scores["oxygen_overdose"] = 0.7
        
    # Uremia
    kidney_keywords = ["kidney", "dialysis", "uremia"]
    if any(keyword in symptom_text for keyword in kidney_keywords):
        condition_scores["uremia"] = 0.8
        
    # Trauma/Temperature/Toxins
    trauma_keywords = ["fall", "hit head", "accident", "hot", "cold", "poison"]
    if any(keyword in symptom_text for keyword in trauma_keywords):
        condition_scores["trauma_temp_toxin"] = 0.7
        
    # Infection/Intracranial
    infection_keywords = ["fever", "headache", "neck stiff", "infection", "sick"]
    if any(keyword in symptom_text for keyword in infection_keywords):
        condition_scores["infection_cns"] = 0.8
        
    # Pharmacology
    med_keywords = ["medication", "pills", "new medicine", "stopped medicine"]
    elderly = patient_factors.get("age", 0) > 65
    if any(keyword in symptom_text for keyword in med_keywords) or elderly:
        condition_scores["medication_related"] = 0.6
        
    # Seizure/Stroke/Shock
    neuro_keywords = ["seizure", "convulsion", "weakness", "speech", "face droop"]
    if any(keyword in symptom_text for keyword in neuro_keywords):
        condition_scores["neuro_vascular"] = 0.8
    
    # Generate top differentials
    if not condition_scores:
        # If no specific category identified, consider most common causes
        condition_scores = {
            "infection_sepsis": 0.6,
            "medication_polypharmacy": 0.5,
            "glucose_disorder": 0.5,
            "electrolyte_imbalance": 0.4
        }
    
    # Convert to clinical differentials
    differential_mapping = {
        "alcohol_related": {
            "condition": "Alcohol Withdrawal/Intoxication",
            "description": "Alcohol-related altered mental status requiring immediate evaluation",
            "rationale": "History and symptoms consistent with alcohol use disorder"
        },
        "glucose_disorder": {
            "condition": "Hypoglycemia/Hyperglycemia", 
            "description": "Blood sugar abnormality causing altered mental status",
            "rationale": "Diabetes history or symptoms suggesting glucose dysfunction"
        },
        "infection_cns": {
            "condition": "CNS Infection/Sepsis",
            "description": "Bacterial or viral infection affecting brain function", 
            "rationale": "Fever, infectious symptoms, or sepsis risk factors"
        },
        "medication_related": {
            "condition": "Medication Toxicity/Polypharmacy",
            "description": "Drug-induced altered mental status",
            "rationale": "Multiple medications or recent changes, especially in elderly"
        }
    }
    
    sorted_conditions = sorted(condition_scores.items(), key=lambda x: x[1], reverse=True)
    
    for condition_key, likelihood in sorted_conditions[:4]:
        if condition_key in differential_mapping:
            diff = differential_mapping[condition_key]
            assessment["differentials"].append({
                "condition": diff["condition"],
                "likelihood": int(likelihood * 100),
                "description": diff["description"],
                "rationale": diff["rationale"],
                "urgency": "EMERGENCY"
            })
    
    return assessment