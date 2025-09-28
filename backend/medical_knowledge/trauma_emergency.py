"""
Trauma Patient and Emergency Medicine Knowledge Base
Comprehensive protocols for trauma assessment, ACLS, PALS, and emergency procedures
Based on current emergency medicine and trauma guidelines
"""

TRAUMA_EMERGENCY_KNOWLEDGE = {
    "trauma_primary_assessment": {
        "initial_questions": [
            "When I walk into the room what do I see?",
            "Is there any more information from EMS about the scene or mechanism?",
            "ABCDE assessment and stabilization"
        ],
        
        "abcde_priorities": {
            "airway": {
                "assessment": ["Airway patency", "C-spine protection"],
                "interventions": ["Jaw thrust", "Oropharyngeal airway", "Intubation if indicated"]
            },
            "breathing": {
                "assessment": ["Breath sounds", "Chest wall movement", "Oxygen saturation"],
                "interventions": ["Supplemental oxygen", "Bag-mask ventilation", "Tube thoracostomy if indicated"]
            },
            "circulation": {
                "assessment": ["Pulse", "Blood pressure", "Capillary refill", "External bleeding"],
                "interventions": ["2 large-bore IVs", "Fluid resuscitation", "Blood control"]
            },
            "disability": {
                "assessment": ["GCS", "Pupillary response", "Motor/sensory exam"],
                "interventions": ["Spinal immobilization", "Neurologic monitoring"]
            },
            "exposure": {
                "assessment": ["Complete visual inspection", "Temperature control"],
                "interventions": ["Remove clothing", "Warming measures", "Log roll examination"]
            }
        }
    },
    
    "big_decisions": {
        "intubation": {
            "indications": [
                "GCS <8",
                "Combative patient requiring procedures", 
                "Airway protection needed",
                "Injury with likelihood of airway compromise (burns, neck/facial trauma)"
            ],
            "technique": "Rapid Sequence Intubation (RSI)",
            "medications": {
                "induction": "Etomidate (standard for trauma)",
                "paralytic": "Succinylcholine or Rocuronium",
                "adjuncts": "Consider lidocaine and fentanyl for head injury"
            },
            "backup": "Surgical airway if RSI fails"
        },
        
        "tube_thoracostomy": {
            "indications": [
                "Decreased breath sounds on initial evaluation",
                "Asymmetrical chest movement (flail segment)",
                "Tension pneumothorax"
            ],
            "urgent": True
        },
        
        "fast_exam": {
            "purpose": "Detect free fluid/bleeding",
            "views": ["Pericardial", "Right upper quadrant", "Left upper quadrant", "Pelvis"],
            "next_steps": "Guide need for surgical intervention"
        },
        
        "resuscitation": {
            "crystalloid": "1-2L for tachycardic or hypotensive patients",
            "blood_products": "Type and cross-match 2 units",
            "permissive_hypotension": "Consider in penetrating trauma without head injury"
        }
    },
    
    "trauma_labs_imaging": {
        "basic_labs": [
            "CBC", "Chemistry panel", "Coagulation studies",
            "Blood alcohol level", "Type and cross-match"
        ],
        "initial_imaging": [
            "C-spine (cross-table if high suspicion)",
            "Chest X-ray", "Pelvis X-ray"
        ],
        "advanced_imaging": "CT based on mechanism and clinical findings"
    },
    
    # ACLS Protocols
    "acls_protocols": {
        "high_quality_cpr": {
            "sequence": "CAB - Compressions, Airway, Breathing",
            "compression_rate": "100-120/min",
            "compression_depth": "At least 2 inches (5 cm), not >2.4 inches (6 cm)",
            "chest_recoil": "Allow full recoil after each compression",
            "minimize_pauses": "Target compression fraction >60%",
            "ratio": "30:2 until advanced airway placed",
            "advanced_airway": "Continuous compressions at 100-120/min with 10 breaths/min"
        },
        
        "cardiac_arrest": {
            "shockable_rhythms": {
                "vf_pvt": {
                    "treatment": [
                        "1 shock (200J biphasic, 360J monophasic)",
                        "Resume CPR immediately for 2 minutes",
                        "Epinephrine 1mg IV/IO after 2nd shock, then q3-5min",
                        "Amiodarone 300mg IV/IO for refractory VF/VT"
                    ]
                }
            },
            "non_shockable_rhythms": {
                "asystole_pea": {
                    "treatment": [
                        "CPR for 2 minutes",
                        "Epinephrine 1mg IV/IO ASAP, then q3-5min",
                        "Search for reversible causes (H's and T's)"
                    ]
                }
            },
            "reversible_causes": [
                "Hypovolemia", "Hypoxia", "Hydrogen ion (acidosis)",
                "Hypo/Hyperkalemia", "Hypothermia", "Tension pneumothorax",
                "Tamponade (cardiac)", "Toxins", "Thrombosis (pulmonary/coronary)"
            ]
        },
        
        "bradycardia": {
            "stable": "Observation and monitoring",
            "unstable_signs": ["Hypotension", "Altered mental status", "Chest pain", "CHF"],
            "treatment": [
                "Atropine 1mg IV, repeat q3-5min to max 3mg",
                "Transcutaneous pacing",
                "Epinephrine 2-10 mcg/min or Dopamine 5-20 mcg/kg/min"
            ]
        },
        
        "tachycardia": {
            "unstable": {
                "signs": ["Hypotension", "Altered mental status", "Chest pain", "CHF"],
                "treatment": "Synchronized cardioversion"
            },
            "stable_narrow": {
                "regular": "Vagal maneuvers → Adenosine 6mg, then 12mg",
                "irregular": "Rate control with diltiazem or beta-blockers"
            },
            "stable_wide": {
                "regular": "Amiodarone 150mg IV over 10min",
                "irregular": "Consider amiodarone, avoid AV-node blockers if WPW"
            }
        }
    },
    
    # Pediatric Protocols (PALS)
    "pediatric_protocols": {
        "vital_signs": {
            "hypotension_thresholds": {
                "newborn": "<60 mmHg",
                "infant": "<70 mmHg",
                "age_1_10": "<70 + (2 × age) mmHg",
                "age_over_10": "<90 mmHg"
            },
            "heart_rate_ranges": {
                "newborn_3mo": "85-205 bpm",
                "3mo_2yr": "100-190 bpm", 
                "2_10yr": "60-140 bpm",
                "over_10yr": "60-100 bpm"
            },
            "respiratory_rates": {
                "infant": "30-60/min",
                "toddler": "22-37/min",
                "preschool": "20-28/min",
                "school_age": "18-25/min",
                "adolescent": "12-20/min"
            }
        },
        
        "intubation": {
            "ett_size_cuffed": "(age/4) + 3.5 mm ID",
            "ett_size_uncuffed": "(age/4) + 4 mm ID", 
            "depth": "3 × internal diameter (cm)",
            "laryngoscope": "Miller 0 (preterm), 1 (term), 1-2 (infant/toddler)"
        },
        
        "fluids": {
            "bolus": "10-20 mL/kg isotonic crystalloid with frequent reassessment",
            "maintenance_4_2_1": "4 mL/kg/h first 10kg + 2 mL/kg/h next 10kg + 1 mL/kg/h >20kg",
            "isotonic_solutions": "Use 0.9% NS or balanced solutions ≥28 days old"
        }
    },
    
    # Common Emergency Procedures
    "emergency_procedures": {
        "cricothyrotomy": {
            "indications": ["Cannot intubate, cannot ventilate", "Anticipated failure with life-threatening hypoxemia"],
            "contraindications": ["Age <12 years (relative)", "Tracheal transection"],
            "technique": "Scalpel-bougie-tube method preferred",
            "complications": ["Bleeding", "Misplacement", "Subglottic stenosis"]
        },
        
        "needle_thoracostomy": {
            "indications": ["Tension pneumothorax when chest tube not immediately available"],
            "preferred_site": "4th/5th intercostal space, anterior to mid-axillary line",
            "equipment": "≥8 cm 14-gauge angiocatheter",
            "note": "Convert to tube thoracostomy promptly"
        },
        
        "tube_thoracostomy": {
            "indications": ["Pneumothorax", "Hemothorax", "Empyema"],
            "location": "4th-5th ICS anterior-mid-axillary line",
            "size": "20-28F (pneumothorax), 28-40F (hemothorax/empyema)",
            "technique": "Incise over rib below, blunt dissect over rib above"
        },
        
        "pericardiocentesis": {
            "indications": ["Tamponade with hemodynamic instability"],
            "technique": "Ultrasound-guided, parasternal or subxiphoid approach",
            "complications": ["Pneumothorax", "Myocardial laceration", "Arrhythmias"]
        },
        
        "central_venous_access": {
            "indications": ["Failed peripheral access", "Vasoactive infusions", "CVP monitoring"],
            "preferred": "Ultrasound-guided internal jugular",
            "technique": "Full sterile barriers, chlorhexidine prep",
            "complications": ["Pneumothorax", "Arterial injury", "CLABSI"]
        }
    },
    
    "trauma_patterns": {
        "head_trauma": {
            "intubation_criteria": "GCS ≤8, combative, airway protection needed",
            "medications": "Consider lidocaine and fentanyl pre-RSI",
            "management": "Elevate head of bed 30°, maintain CPP >60 mmHg"
        },
        
        "chest_trauma": {
            "tension_pneumothorax": "Immediate needle decompression, then tube thoracostomy",
            "flail_chest": "Pain control, pulmonary hygiene, consider intubation",
            "massive_hemothorax": "Large bore chest tube, blood replacement"
        },
        
        "abdominal_trauma": {
            "fast_positive": "Consider surgery if unstable",
            "blunt_mechanism": "CT if stable, surgery if unstable with positive FAST",
            "penetrating": "Surgery for peritonitis, evisceration, or instability"
        }
    }
}

def analyze_trauma_presentation(symptoms: dict, patient_factors: dict) -> dict:
    """
    Analyze trauma presentation using systematic trauma protocols
    """
    
    assessment = {
        "immediate_actions": TRAUMA_EMERGENCY_KNOWLEDGE["trauma_primary_assessment"]["initial_questions"],
        "abcde_assessment": TRAUMA_EMERGENCY_KNOWLEDGE["trauma_primary_assessment"]["abcde_priorities"],
        "big_decisions": [],
        "urgency": "EMERGENCY",  # All trauma is emergency
        "trauma_alerts": [],
        "diagnostic_workup": TRAUMA_EMERGENCY_KNOWLEDGE["trauma_labs_imaging"]
    }
    
    symptom_text = symptoms.get("description", "").lower()
    mechanism = patient_factors.get("mechanism", "").lower()
    
    # Mechanism-based risk stratification
    high_energy_mechanisms = [
        "motor vehicle crash", "mvc", "fall from height", "pedestrian struck",
        "motorcycle crash", "explosion", "gunshot", "stabbing"
    ]
    
    if any(mech in symptom_text or mech in mechanism for mech in high_energy_mechanisms):
        assessment["trauma_alerts"].append("High-energy mechanism - increased risk for multiple injuries")
        assessment["urgency"] = "EMERGENCY"
    
    # Symptom-based interventions
    airway_keywords = ["difficulty speaking", "stridor", "burns to face", "neck trauma"]
    if any(keyword in symptom_text for keyword in airway_keywords):
        assessment["big_decisions"].append({
            "intervention": "Airway Management",
            "indication": "Signs of airway compromise",
            "action": "Consider early intubation or surgical airway"
        })
    
    breathing_keywords = ["shortness of breath", "chest pain", "decreased breath sounds"]
    if any(keyword in symptom_text for keyword in breathing_keywords):
        assessment["big_decisions"].append({
            "intervention": "Chest Assessment", 
            "indication": "Respiratory compromise",
            "action": "Consider chest X-ray, FAST exam, possible tube thoracostomy"
        })
    
    circulation_keywords = ["bleeding", "hypotensive", "weak pulse", "pale"]
    if any(keyword in symptom_text for keyword in circulation_keywords):
        assessment["big_decisions"].append({
            "intervention": "Hemodynamic Resuscitation",
            "indication": "Signs of shock/blood loss", 
            "action": "Large bore IV access, fluid resuscitation, blood products"
        })
    
    neuro_keywords = ["unconscious", "confused", "head injury", "gcs"]
    if any(keyword in symptom_text for keyword in neuro_keywords):
        assessment["big_decisions"].append({
            "intervention": "Neurologic Assessment",
            "indication": "Altered mental status/head trauma",
            "action": "GCS assessment, pupillary exam, consider CT head"
        })
    
    # Generate trauma-specific differential
    assessment["differential_diagnosis"] = [
        {
            "condition": "Multi-system Trauma",
            "likelihood": 90,
            "description": "Multiple injury pattern requiring systematic evaluation",
            "rationale": "Trauma mechanism with systematic assessment needed",
            "urgency": "EMERGENCY"
        },
        {
            "condition": "Isolated Injury Pattern",
            "likelihood": 60,
            "description": "Single system injury based on mechanism and presentation", 
            "rationale": "Focused injury pattern suggested by history/exam",
            "urgency": "EMERGENCY"
        }
    ]
    
    return assessment

def analyze_cardiac_arrest(symptoms: dict, patient_factors: dict) -> dict:
    """
    Analyze cardiac arrest using ACLS protocols
    """
    
    assessment = {
        "immediate_actions": [
            "Call for help and defibrillator immediately",
            "Start high-quality CPR (CAB approach)",
            "Minimize interruptions",
            "Attach defibrillator/monitor ASAP"
        ],
        "cpr_guidelines": TRAUMA_EMERGENCY_KNOWLEDGE["acls_protocols"]["high_quality_cpr"],
        "protocols": {},
        "medications": [],
        "urgency": "EMERGENCY"
    }
    
    symptom_text = symptoms.get("description", "").lower()
    rhythm = patient_factors.get("rhythm", "").lower()
    
    # Determine arrest type and protocol
    if any(keyword in rhythm for keyword in ["vf", "vt", "ventricular fibrillation", "ventricular tachycardia"]):
        assessment["protocols"] = TRAUMA_EMERGENCY_KNOWLEDGE["acls_protocols"]["cardiac_arrest"]["shockable_rhythms"]["vf_pvt"]
        assessment["medications"] = ["Epinephrine 1mg q3-5min", "Amiodarone 300mg for refractory VF/VT"]
    
    elif any(keyword in rhythm for keyword in ["asystole", "pea", "pulseless electrical activity"]):
        assessment["protocols"] = TRAUMA_EMERGENCY_KNOWLEDGE["acls_protocols"]["cardiac_arrest"]["non_shockable_rhythms"]["asystole_pea"]
        assessment["medications"] = ["Epinephrine 1mg ASAP, then q3-5min"]
    
    # Reversible causes to investigate
    assessment["reversible_causes"] = TRAUMA_EMERGENCY_KNOWLEDGE["acls_protocols"]["cardiac_arrest"]["reversible_causes"]
    
    return assessment