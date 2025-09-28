"""
Clinical History-Taking Framework
Based on Emergency Medicine Resident Teaching Manual
Provides structured, system-wise approach to history taking with natural dialogue flow
"""

CLINICAL_HISTORY_FRAMEWORK = {
    "general_principles": {
        "cone_technique": {
            "open": "Start with open-ended questions to let patient tell their story",
            "focused": "Ask specific follow-up questions to clarify details",
            "red_flags": "Screen for emergency/critical symptoms"
        },
        "pqrst_for_symptoms": {
            "P": "Provocation/Palliation - What makes it better/worse?",
            "Q": "Quality/Character - How would you describe it?",
            "R": "Radiation/Region - Where is it? Does it spread?",
            "S": "Severity/Scale - Rate 1-10, how severe?",
            "T": "Timing/Temporal - When did it start? How long?"
        },
        "ice_framework": {
            "Ideas": "What do you think might be causing this?",
            "Concerns": "What worries you most about this?",
            "Expectations": "What would you like us to do today?"
        },
        "emergency_mindset": "Fast, focused, relevant questioning for ED setting"
    },
    
    "cardiovascular_system": {
        "presentations": ["chest pain", "palpitations", "syncope", "leg swelling"],
        "structured_questions": {
            "onset": "Did it start suddenly or gradually?",
            "nature": "Is it pressure-like, stabbing, or burning?", 
            "radiation": "Does it spread to your jaw, arm, or back?",
            "associated_symptoms": "Any shortness of breath, sweating, or nausea?",
            "risk_factors": "Do you have high blood pressure, diabetes, or smoke?",
            "exertion": "Did it happen with activity or at rest?"
        },
        "red_flags": [
            "chest pain at rest",
            "syncope without warning", 
            "diaphoresis with chest pain",
            "radiation to jaw/arm",
            "sudden onset severe pain"
        ],
        "natural_followups": [
            "Can you point to exactly where the pain is?",
            "Does it feel like pressure or more sharp and stabbing?",
            "Did you feel sweaty or lightheaded when it started?",
            "Has this ever happened before?"
        ],
        "teaching_pearl": "Always ask time of onset + associated diaphoresis → classic ACS differentiator"
    },
    
    "respiratory_system": {
        "presentations": ["cough", "shortness of breath", "hemoptysis", "wheezing", "chest pain with breathing"],
        "structured_questions": {
            "onset": "Did the breathing problem start suddenly?",
            "nature_cough": "Is it a dry cough or are you bringing anything up?",
            "breathlessness": "Do you get short of breath lying down?",
            "sputum": "What color is what you're coughing up?",
            "triggers": "Does anything make it worse - cold air, exercise?",
            "orthopnea": "Do you need extra pillows to sleep?"
        },
        "red_flags": [
            "stridor", 
            "hemoptysis >200 mL",
            "acute hypoxia",
            "chest pain + SOB",
            "unable to speak in full sentences"
        ],
        "natural_followups": [
            "Do you feel more breathless when lying flat?",
            "Any swelling in your legs or feet?", 
            "Have you coughed up any blood?",
            "Does the breathing get worse with activity?"
        ],
        "teaching_pearl": "Always clarify orthopnea/PND → differentiates cardiac from primary respiratory cause"
    },
    
    "gastrointestinal_system": {
        "presentations": ["abdominal pain", "vomiting", "hematemesis", "diarrhea", "melena", "jaundice"],
        "structured_questions": {
            "pain_location": "Can you show me exactly where the pain is?",
            "pain_character": "Is it constant or does it come and go in waves?",
            "relation_to_meals": "Does eating make it better or worse?",
            "vomiting": "Have you vomited? Any blood in it?",
            "bowel_movements": "Any changes in your bowel movements?",
            "travel": "Any recent travel or eating out?"
        },
        "red_flags": [
            "hematemesis",
            "melena", 
            "peritonitis signs",
            "massive GI bleed",
            "severe dehydration"
        ],
        "natural_followups": [
            "Does the pain go through to your back?",
            "Any blood in your vomit or stools?",
            "Does the pain get worse when I press here?",
            "When did you last eat normally?"
        ],
        "teaching_pearl": "Always assess relation of pain to meals (gallstones, ulcer, pancreatitis)"
    },
    
    "neurology_system": {
        "presentations": ["headache", "weakness", "numbness", "seizure", "altered mental status", "dizziness"],
        "structured_questions": {
            "headache_onset": "Did the headache come on suddenly like a thunderclap?",
            "worst_ever": "Is this the worst headache you've ever had?",
            "weakness_pattern": "Is the weakness on one side or both sides?",
            "speech_changes": "Any trouble speaking or finding words?",
            "vision_changes": "Any changes in your vision?",
            "seizure_details": "Did anyone see you shaking or lose consciousness?"
        },
        "red_flags": [
            "thunderclap headache",
            "new seizure in adult",
            "acute focal deficit",
            "sudden speech changes",
            "facial droop"
        ],
        "natural_followups": [
            "Did anyone notice your face drooping?",
            "Can you smile for me? Raise both arms?",
            "Has anyone mentioned your speech sounds different?",
            "When exactly did the weakness start?"
        ],
        "teaching_pearl": "Time of onset is critical in stroke — document precisely"
    },
    
    "genitourinary_system": {
        "presentations": ["dysuria", "frequency", "urgency", "hematuria", "flank pain", "retention"],
        "structured_questions": {
            "dysuria": "Is it burning when you urinate or pain in your bladder?",
            "frequency": "How often are you going to the bathroom?",
            "hematuria": "Have you noticed blood in your urine?",
            "flank_pain": "Any pain in your back or sides?",
            "retention": "Are you able to pass urine normally?",
            "fever": "Any fever or chills?"
        },
        "red_flags": [
            "anuria",
            "gross hematuria with clots", 
            "septic UTI",
            "testicular torsion",
            "acute retention"
        ],
        "natural_followups": [
            "Any pain that goes to your groin?",
            "Have you had kidney stones before?",
            "Is there blood or just dark urine?",
            "Any nausea or vomiting with the pain?"
        ],
        "teaching_pearl": "Testicular pain in young males = torsion until proven otherwise"
    },
    
    "musculoskeletal_system": {
        "presentations": ["joint pain", "swelling", "back pain", "trauma", "red hot swollen joint"],
        "structured_questions": {
            "trauma_mechanism": "How did you hurt it? What happened?",
            "weight_bearing": "Can you walk on it normally?",
            "joint_involvement": "Is it one joint or several joints?",
            "back_pain_radiation": "Does the back pain go down your leg?",
            "neurologic_symptoms": "Any numbness or tingling?",
            "fever_with_joint": "Any fever with the joint pain?"
        },
        "red_flags": [
            "inability to walk",
            "septic arthritis suspicion",
            "cauda equina signs",
            "open fracture",
            "neurovascular compromise"
        ],
        "natural_followups": [
            "Is the joint swollen or red?",
            "Can you bend and straighten it normally?",
            "Any numbness in your fingers or toes?",
            "Did you hear a pop when it happened?"
        ],
        "teaching_pearl": "Always rule out septic arthritis in a swollen painful joint"
    },
    
    "endocrine_metabolic": {
        "presentations": ["polyuria", "polydipsia", "weight loss", "fatigue", "thyroid symptoms"],
        "structured_questions": {
            "polyuria": "How often are you urinating? Including at night?",
            "polydipsia": "Are you drinking much more water than usual?",
            "weight_changes": "Any recent weight loss or gain?",
            "fatigue": "How long have you been feeling tired?",
            "temperature_tolerance": "Do you feel too hot or too cold?",
            "diabetic_symptoms": "Any nausea, vomiting, or stomach pain?"
        },
        "red_flags": [
            "DKA symptoms",
            "severe dehydration", 
            "thyroid storm signs",
            "myxedema coma",
            "hyperosmolar state"
        ],
        "natural_followups": [
            "Are you diabetic? Taking any medications?",
            "Any fruity smell on your breath?",
            "Feeling nauseous or vomiting?",
            "Any belly pain with the other symptoms?"
        ],
        "teaching_pearl": "Any diabetic with vomiting + abdominal pain = suspect DKA"
    },
    
    "pediatric_approach": {
        "presentations": ["fever", "cough", "vomiting", "diarrhea", "seizures", "poor feeding"],
        "structured_questions": {
            "general_activity": "Is your child acting normal or different?",
            "feeding": "Eating and drinking normally?",
            "fever_pattern": "How high has the fever been?",
            "vaccination_status": "Are immunizations up to date?",
            "sick_contacts": "Anyone at home or school been sick?",
            "developmental": "Any new symptoms or behaviors?"
        },
        "red_flags": [
            "neonate with fever",
            "apnea episodes",
            "poor feeding",
            "lethargy",
            "inconsolable crying"
        ],
        "natural_followups": [
            "Has the baby been as active as usual?",
            "Any rashes or skin changes?",
            "Breathing normally or working harder?",
            "When did you first notice something was wrong?"
        ],
        "teaching_pearl": "Always ask parents: 'Is your child acting normal?' — reliable red flag"
    },
    
    "obstetric_gynecologic": {
        "presentations": ["vaginal bleeding", "pelvic pain", "amenorrhea", "discharge"],
        "structured_questions": {
            "lmp": "When was your last menstrual period?",
            "sexual_activity": "Are you sexually active?",
            "contraception": "Do you use any birth control?",
            "pregnancy_test": "Have you done a pregnancy test?",
            "bleeding_pattern": "How heavy is the bleeding compared to normal?",
            "pain_onset": "Did the pain come on suddenly?"
        },
        "red_flags": [
            "ruptured ectopic",
            "massive hemorrhage",
            "septic abortion",
            "ovarian torsion",
            "preeclampsia"
        ],
        "natural_followups": [
            "Any chance you could be pregnant?",
            "Is the pain on one side or all over?",
            "Any dizziness or feeling faint?",
            "Has this happened before?"
        ],
        "teaching_pearl": "Abdominal pain + positive pregnancy = ectopic until proven otherwise"
    }
}

def get_system_specific_questions(chief_complaint: str, symptoms: list) -> dict:
    """
    Determine which body system is involved and return appropriate follow-up questions
    """
    
    complaint_lower = chief_complaint.lower()
    symptom_text = " ".join(symptoms).lower()
    
    # Cardiovascular keywords
    cv_keywords = ["chest pain", "chest pressure", "heart", "palpitation", "syncope", "faint", "dizzy"]
    
    # Respiratory keywords  
    resp_keywords = ["breath", "cough", "wheeze", "lung", "pneumonia", "asthma", "sputum"]
    
    # GI keywords
    gi_keywords = ["stomach", "abdomen", "belly", "nausea", "vomit", "diarrhea", "constipation"]
    
    # Neuro keywords
    neuro_keywords = ["headache", "weakness", "numb", "seizure", "stroke", "confusion", "dizzy"]
    
    # GU keywords
    gu_keywords = ["urine", "bladder", "kidney", "testicle", "groin", "flank"]
    
    # MSK keywords
    msk_keywords = ["joint", "bone", "muscle", "back", "neck", "fracture", "sprain"]
    
    # Determine primary system
    if any(keyword in complaint_lower or keyword in symptom_text for keyword in cv_keywords):
        return {
            "system": "cardiovascular",
            "questions": CLINICAL_HISTORY_FRAMEWORK["cardiovascular_system"]["natural_followups"],
            "red_flags": CLINICAL_HISTORY_FRAMEWORK["cardiovascular_system"]["red_flags"],
            "pearl": CLINICAL_HISTORY_FRAMEWORK["cardiovascular_system"]["teaching_pearl"]
        }
    
    elif any(keyword in complaint_lower or keyword in symptom_text for keyword in resp_keywords):
        return {
            "system": "respiratory", 
            "questions": CLINICAL_HISTORY_FRAMEWORK["respiratory_system"]["natural_followups"],
            "red_flags": CLINICAL_HISTORY_FRAMEWORK["respiratory_system"]["red_flags"],
            "pearl": CLINICAL_HISTORY_FRAMEWORK["respiratory_system"]["teaching_pearl"]
        }
        
    elif any(keyword in complaint_lower or keyword in symptom_text for keyword in gi_keywords):
        return {
            "system": "gastrointestinal",
            "questions": CLINICAL_HISTORY_FRAMEWORK["gastrointestinal_system"]["natural_followups"],
            "red_flags": CLINICAL_HISTORY_FRAMEWORK["gastrointestinal_system"]["red_flags"], 
            "pearl": CLINICAL_HISTORY_FRAMEWORK["gastrointestinal_system"]["teaching_pearl"]
        }
        
    elif any(keyword in complaint_lower or keyword in symptom_text for keyword in neuro_keywords):
        return {
            "system": "neurology",
            "questions": CLINICAL_HISTORY_FRAMEWORK["neurology_system"]["natural_followups"],
            "red_flags": CLINICAL_HISTORY_FRAMEWORK["neurology_system"]["red_flags"],
            "pearl": CLINICAL_HISTORY_FRAMEWORK["neurology_system"]["teaching_pearl"] 
        }
        
    elif any(keyword in complaint_lower or keyword in symptom_text for keyword in gu_keywords):
        return {
            "system": "genitourinary",
            "questions": CLINICAL_HISTORY_FRAMEWORK["genitourinary_system"]["natural_followups"],
            "red_flags": CLINICAL_HISTORY_FRAMEWORK["genitourinary_system"]["red_flags"],
            "pearl": CLINICAL_HISTORY_FRAMEWORK["genitourinary_system"]["teaching_pearl"]
        }
        
    elif any(keyword in complaint_lower or keyword in symptom_text for keyword in msk_keywords):
        return {
            "system": "musculoskeletal", 
            "questions": CLINICAL_HISTORY_FRAMEWORK["musculoskeletal_system"]["natural_followups"],
            "red_flags": CLINICAL_HISTORY_FRAMEWORK["musculoskeletal_system"]["red_flags"],
            "pearl": CLINICAL_HISTORY_FRAMEWORK["musculoskeletal_system"]["teaching_pearl"]
        }
    
    # Default to general approach
    return {
        "system": "general",
        "questions": [
            "Can you tell me more about when this started?",
            "What makes it better or worse?", 
            "Have you had this before?",
            "Any other symptoms I should know about?"
        ],
        "red_flags": ["severe pain", "sudden onset", "associated symptoms"],
        "pearl": "Use open-ended questions first, then focus based on responses"
    }

def generate_natural_followup(patient_response: str, conversation_history: list, chief_complaint: str) -> dict:
    """
    Generate natural, doctor-like follow-up questions based on patient response and clinical framework
    """
    
    # Get system-specific approach
    symptoms_mentioned = [msg['message'] for msg in conversation_history if msg['type'] == 'user']
    system_guidance = get_system_specific_questions(chief_complaint, symptoms_mentioned)
    
    response_lower = patient_response.lower()
    
    # Check for red flags in response
    red_flags_detected = []
    for flag in system_guidance["red_flags"]:
        if any(word in response_lower for word in flag.lower().split()):
            red_flags_detected.append(flag)
    
    # Generate appropriate follow-up based on content
    if "pain" in response_lower:
        if "severe" in response_lower or any(severity in response_lower for severity in ["10", "worst", "terrible"]):
            followup = "That sounds very concerning. Can you describe what the pain feels like - is it sharp, pressure-like, or burning?"
        else:
            followup = "I understand you're having pain. On a scale of 1 to 10, how would you rate it?"
    
    elif "started" in response_lower or "began" in response_lower:
        if "sudden" in response_lower:
            followup = "When you say sudden, did it come on within seconds or minutes? What were you doing when it started?"
        else:
            followup = "Thank you for that timing. What were you doing when it started? Any triggers you can think of?"
            
    elif "shortness of breath" in response_lower or "can't breathe" in response_lower:
        followup = "That must be frightening. Is it worse when you lie down or with activity? Any chest pain with it?"
        
    elif "nausea" in response_lower or "vomit" in response_lower:
        followup = "I'm sorry you're feeling nauseous. Any blood in the vomit? Does anything make it better or worse?"
        
    elif "dizzy" in response_lower or "lightheaded" in response_lower:
        followup = "When you feel dizzy, is it more like the room is spinning or do you feel like you might faint?"
        
    else:
        # Use system-specific questions
        available_questions = system_guidance["questions"]
        # Select most appropriate question based on what hasn't been asked
        followup = available_questions[0] if available_questions else "Can you tell me more about that?"
    
    return {
        "followup_question": followup,
        "system_identified": system_guidance["system"], 
        "red_flags_detected": red_flags_detected,
        "teaching_pearl": system_guidance["pearl"],
        "emergency_level": "HIGH" if red_flags_detected else "ROUTINE"
    }