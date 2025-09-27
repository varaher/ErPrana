"""
Poisoning and Toxidromes Clinical Knowledge Base
Based on emergency toxicology protocols for rapid identification and treatment
Covers common toxidromes and their specific antidotes/treatments
"""

POISONING_TOXIDROMES_KNOWLEDGE = {
    "immediate_stabilization": [
        "Assess ABCs (Airway, Breathing, Circulation)",
        "Initiate CPR/ACLS/ATLS as needed",
        "Protect and secure airway if compromised",
        "Check vital signs: HR, BP, RR, temperature, pulse oximetry",
        "Check finger stick glucose",
        "Consider 'coma cocktail' if altered mental status: glucose, naloxone, thiamine",
        "Place on cardiac monitor and continuous monitoring"
    ],
    
    "key_history_elements": [
        "General medical condition and baseline status",
        "Current medications and allergies", 
        "Circumstances surrounding overdose/poisoning",
        "What toxin(s) patient may have access to",
        "Dose, route, and time of exposure",
        "Signs and symptoms experienced and their onset",
        "Any treatments already attempted"
    ],
    
    # Core toxidromes with complete clinical presentation
    "toxidromes": {
        "sympathomimetic": {
            "name": "Sympathomimetic Toxidrome",
            "vital_signs": {
                "blood_pressure": "elevated",
                "heart_rate": "elevated", 
                "respiratory_rate": "elevated",
                "temperature": "elevated"
            },
            "physical_exam": {
                "mental_status": "agitated",
                "pupils": "dilated",
                "abdomen": "increased bowel sounds",
                "skin": "wet/diaphoretic"
            },
            "examples": [
                "Cocaine", "Amphetamines", "Methamphetamine", "MDMA",
                "Theophylline", "Epinephrine", "Norepinephrine", 
                "Levothyroxine", "Albuterol", "Ephedra", "Caffeine",
                "Guarana", "Yohimbine", "Adderall", "Atomoxetine",
                "Methylphenidate", "Phentermine", "Terbutaline"
            ],
            "treatment": [
                "Benzodiazepines for agitation and seizures",
                "Cooling measures for hyperthermia", 
                "Beta-blockers (avoid in cocaine - use benzos instead)",
                "IV fluids for dehydration",
                "Cardiac monitoring"
            ],
            "urgency": "EMERGENCY"
        },
        
        "anticholinergic": {
            "name": "Anticholinergic Toxidrome",
            "mnemonic": "Hot as hades, dry as bone, red as beet, mad as hatter, blind as bat",
            "vital_signs": {
                "blood_pressure": "elevated",
                "heart_rate": "elevated",
                "respiratory_rate": "elevated", 
                "temperature": "elevated"
            },
            "physical_exam": {
                "mental_status": "agitated/delirious",
                "pupils": "dilated",
                "abdomen": "decreased bowel sounds",
                "skin": "dry/flushed"
            },
            "examples": [
                "Antihistamines (Benadryl, Hydroxyzine)",
                "Antipsychotics (Haloperidol, Olanzapine)",
                "Tricyclic antidepressants",
                "Atropine", "Scopolamine", "Hyoscyamine",
                "Benztropine", "Glycopyrrolate", "Glutethimide",
                "Some SSRIs in overdose"
            ],
            "treatment": [
                "Physostigmine (if pure anticholinergic and no contraindications)",
                "Benzodiazepines for agitation",
                "Cooling measures for hyperthermia",
                "Avoid physostigmine if TCA overdose (risk of seizures/arrhythmias)"
            ],
            "urgency": "EMERGENCY"
        },
        
        "cholinergic_muscarinic": {
            "name": "Cholinergic Muscarinic Toxidrome",
            "mnemonic": "SLUDGE - Salivation, Lacrimation, Urination, Defecation, GI upset, Emesis",
            "vital_signs": {
                "blood_pressure": "normal/variable",
                "heart_rate": "normal/bradycardia",
                "respiratory_rate": "normal",
                "temperature": "normal"
            },
            "physical_exam": {
                "mental_status": "agitated/confused",
                "pupils": "normal/miosis",
                "abdomen": "increased bowel sounds",
                "skin": "wet/diaphoretic"
            },
            "examples": [
                "Organophosphates (pesticides)",
                "Carbamates", 
                "Physostigmine", "Pyridostigmine", "Neostigmine"
            ],
            "treatment": [
                "Atropine (large doses may be needed)",
                "Pralidoxime (2-PAM) for organophosphates",
                "Decontamination (remove clothing, wash skin)",
                "Supportive care for respiratory depression"
            ],
            "urgency": "EMERGENCY"
        },
        
        "cholinergic_nicotinic": {
            "name": "Cholinergic Nicotinic Toxidrome", 
            "vital_signs": {
                "blood_pressure": "normal/variable",
                "heart_rate": "elevated",
                "respiratory_rate": "elevated",
                "temperature": "normal"
            },
            "physical_exam": {
                "mental_status": "agitated",
                "pupils": "normal",
                "abdomen": "increased bowel sounds", 
                "skin": "normal"
            },
            "examples": [
                "Organophosphates",
                "Nicotine"
            ],
            "treatment": [
                "Supportive care",
                "Atropine for muscarinic effects",
                "Pralidoxime for organophosphates"
            ],
            "urgency": "EMERGENCY"
        },
        
        "opioid": {
            "name": "Opioid Toxidrome",
            "vital_signs": {
                "blood_pressure": "decreased",
                "heart_rate": "decreased", 
                "respiratory_rate": "decreased",
                "temperature": "decreased"
            },
            "physical_exam": {
                "mental_status": "depressed/comatose",
                "pupils": "pinpoint (miosis)",
                "abdomen": "decreased bowel sounds",
                "skin": "normal"
            },
            "examples": [
                "Heroin", "Morphine", "Codeine", "Oxycodone",
                "Hydromorphone", "Hydrocodone", "Fentanyl",
                "Methadone", "Propoxyphene", "Tramadol"
            ],
            "treatment": [
                "Naloxone (Narcan) - multiple doses may be needed",
                "Airway management/ventilatory support",
                "IV access and monitoring",
                "Consider continuous naloxone drip for long-acting opioids"
            ],
            "urgency": "EMERGENCY"
        },
        
        "sedative_hypnotic": {
            "name": "Sedative Hypnotic Toxidrome",
            "vital_signs": {
                "blood_pressure": "decreased",
                "heart_rate": "decreased",
                "respiratory_rate": "decreased", 
                "temperature": "decreased"
            },
            "physical_exam": {
                "mental_status": "depressed/comatose",
                "pupils": "dilated/normal",
                "abdomen": "normal bowel sounds",
                "skin": "normal"
            },
            "examples": [
                "Benzodiazepines (Lorazepam, Diazepam, Alprazolam)",
                "Barbiturates (Phenobarbital, Pentobarbital)",
                "Ethanol", "Carisoprodol", "Chloral hydrate",
                "Buspirone", "Propofol", "Zolpidem", "Zaleplon",
                "Ethchlorvynol", "Meprobamate", "Glutethimide",
                "Bromides", "Kava kava"
            ],
            "treatment": [
                "Flumazenil for benzodiazepine overdose (use cautiously)",
                "Supportive care and airway management",
                "IV fluids and warming measures",
                "Avoid flumazenil if chronic benzodiazepine use (risk of seizures)"
            ],
            "urgency": "EMERGENCY"
        }
    },
    
    # Withdrawal syndromes
    "withdrawal_syndromes": {
        "opioid_withdrawal": {
            "name": "Opioid Withdrawal",
            "vital_signs": {
                "blood_pressure": "elevated",
                "heart_rate": "elevated",
                "respiratory_rate": "normal/elevated",
                "temperature": "elevated"
            },
            "physical_exam": {
                "mental_status": "anxious/agitated",
                "pupils": "dilated",
                "abdomen": "increased bowel sounds/diarrhea",
                "skin": "wet/diaphoretic"
            },
            "symptoms": [
                "Muscle aches", "Nausea/vomiting", "Diarrhea",
                "Runny nose", "Lacrimation", "Insomnia",
                "Drug craving", "Restlessness"
            ],
            "treatment": [
                "Methadone or buprenorphine substitution",
                "Clonidine for autonomic symptoms",
                "Supportive care with fluids and electrolytes",
                "Comfort medications (ibuprofen, loperamide)"
            ],
            "urgency": "URGENT"
        },
        
        "sedative_hypnotic_withdrawal": {
            "name": "Sedative Hypnotic Withdrawal",
            "vital_signs": {
                "blood_pressure": "elevated",
                "heart_rate": "elevated",
                "respiratory_rate": "elevated",
                "temperature": "elevated"
            },
            "physical_exam": {
                "mental_status": "agitated/confused",
                "pupils": "normal",
                "abdomen": "normal bowel sounds",
                "skin": "wet/diaphoretic"
            },
            "symptoms": [
                "Tremor", "Seizures", "Hallucinations",
                "Delirium tremens (in severe alcohol withdrawal)",
                "Anxiety", "Insomnia", "Nausea"
            ],
            "treatment": [
                "Benzodiazepines (first-line for alcohol/sedative withdrawal)",
                "Thiamine for alcohol withdrawal",
                "Magnesium and folate supplementation", 
                "Seizure precautions and monitoring"
            ],
            "urgency": "EMERGENCY"
        }
    },
    
    # Specific antidotes and treatments
    "antidotes": {
        "naloxone": {
            "indications": ["Opioid overdose"],
            "dose": "0.4-2mg IV/IM/IN, repeat q2-3min",
            "notes": "May need continuous drip for long-acting opioids"
        },
        "flumazenil": {
            "indications": ["Benzodiazepine overdose"],
            "dose": "0.2mg IV, then 0.3mg, then 0.5mg q1min",
            "contraindications": ["Chronic benzodiazepine use", "TCA co-ingestion"],
            "notes": "Risk of precipitating seizures"
        },
        "physostigmine": {
            "indications": ["Pure anticholinergic poisoning"],
            "dose": "1-2mg IV slow push",
            "contraindications": ["TCA overdose", "cardiac conduction abnormalities"],
            "notes": "Crosses blood-brain barrier"
        },
        "atropine": {
            "indications": ["Cholinergic poisoning (organophosphates)"],
            "dose": "1-2mg IV, double dose q5min until atropinization",
            "notes": "Large amounts may be required"
        },
        "pralidoxime": {
            "indications": ["Organophosphate poisoning"],
            "dose": "1-2g IV over 30min, then continuous infusion",
            "notes": "Most effective within 24-48 hours of exposure"
        }
    },
    
    "emergency_criteria": [
        "Respiratory depression or failure",
        "Hemodynamic instability", 
        "Altered mental status/coma",
        "Seizures",
        "Hyperthermia >104°F (40°C)",
        "Cardiac arrhythmias",
        "Severe agitation or violence"
    ]
}

def analyze_poisoning_symptoms(symptoms: dict, patient_factors: dict) -> dict:
    """
    Analyze symptoms for toxidrome identification using systematic approach
    """
    
    assessment = {
        "toxidromes": [],
        "urgency": "EMERGENCY",  # All poisoning is emergency until proven otherwise
        "immediate_actions": POISONING_TOXIDROMES_KNOWLEDGE["immediate_stabilization"],
        "antidotes": [],
        "differential_diagnosis": []
    }
    
    symptom_text = symptoms.get("description", "").lower()
    
    # Check for specific toxin mentions
    toxin_scores = {}
    
    # Sympathomimetic toxidrome
    symp_keywords = ["agitated", "restless", "sweating", "hot", "dilated pupils", "fast heart"]
    symp_drugs = ["cocaine", "amphetamine", "meth", "adderall", "caffeine", "energy drink"]
    
    symp_score = 0
    if any(keyword in symptom_text for keyword in symp_keywords):
        symp_score += 0.3
    if any(drug in symptom_text for drug in symp_drugs):
        symp_score += 0.6
        
    if symp_score > 0.2:
        toxin_scores["sympathomimetic"] = symp_score
    
    # Anticholinergic toxidrome  
    anti_keywords = ["dry", "hot", "red", "confused", "dilated pupils", "no sweating"]
    anti_drugs = ["benadryl", "antihistamine", "tricyclic", "atropine"]
    
    anti_score = 0
    if any(keyword in symptom_text for keyword in anti_keywords):
        anti_score += 0.3
    if any(drug in symptom_text for drug in anti_drugs):
        anti_score += 0.6
        
    if anti_score > 0.2:
        toxin_scores["anticholinergic"] = anti_score
    
    # Opioid toxidrome
    opioid_keywords = ["sleepy", "slow breathing", "pinpoint pupils", "nodding off"]
    opioid_drugs = ["heroin", "oxycodone", "fentanyl", "morphine", "codeine", "pills"]
    
    opioid_score = 0
    if any(keyword in symptom_text for keyword in opioid_keywords):
        opioid_score += 0.4
    if any(drug in symptom_text for drug in opioid_drugs):
        opioid_score += 0.6
        
    if opioid_score > 0.2:
        toxin_scores["opioid"] = opioid_score
    
    # Cholinergic toxidrome
    cholin_keywords = ["salivation", "sweating", "small pupils", "diarrhea", "muscle twitching"]
    cholin_drugs = ["organophosphate", "pesticide", "nerve agent"]
    
    cholin_score = 0
    if any(keyword in symptom_text for keyword in cholin_keywords):
        cholin_score += 0.4
    if any(drug in symptom_text for drug in cholin_drugs):
        cholin_score += 0.7
        
    if cholin_score > 0.2:
        toxin_scores["cholinergic_muscarinic"] = cholin_score
    
    # Sedative hypnotic toxidrome
    sedative_keywords = ["sleepy", "slow", "depressed", "confused", "alcohol", "drunk"]
    sedative_drugs = ["alcohol", "benzodiazepine", "xanax", "valium", "barbiturate"]
    
    sedative_score = 0
    if any(keyword in symptom_text for keyword in sedative_keywords):
        sedative_score += 0.3
    if any(drug in symptom_text for drug in sedative_drugs):
        sedative_score += 0.6
        
    if sedative_score > 0.2:
        toxin_scores["sedative_hypnotic"] = sedative_score
    
    # Generate toxidrome assessment
    if toxin_scores:
        sorted_toxidromes = sorted(toxin_scores.items(), key=lambda x: x[1], reverse=True)
        
        for toxidrome_key, likelihood in sorted_toxidromes[:3]:
            toxidrome_data = POISONING_TOXIDROMES_KNOWLEDGE["toxidromes"].get(toxidrome_key, {})
            
            assessment["differential_diagnosis"].append({
                "condition": toxidrome_data.get("name", toxidrome_key.replace("_", " ").title()),
                "likelihood": int(likelihood * 100),
                "description": f"Clinical presentation consistent with {toxidrome_key} toxidrome",
                "rationale": f"Symptoms and/or drug exposure history suggests {toxidrome_key} poisoning",
                "urgency": "EMERGENCY"
            })
            
            # Add relevant antidotes
            if toxidrome_key == "opioid":
                assessment["antidotes"].append("Naloxone (Narcan)")
            elif toxidrome_key == "anticholinergic":
                assessment["antidotes"].append("Physostigmine (if pure anticholinergic)")
            elif toxidrome_key == "cholinergic_muscarinic":
                assessment["antidotes"].extend(["Atropine", "Pralidoxime (for organophosphates)"])
    else:
        # If no clear toxidrome identified
        assessment["differential_diagnosis"] = [{
            "condition": "Undifferentiated Poisoning/Overdose",
            "likelihood": 80,
            "description": "Poisoning suspected but specific toxidrome not clearly identified",
            "rationale": "Requires systematic evaluation and supportive care",
            "urgency": "EMERGENCY"
        }]
    
    return assessment