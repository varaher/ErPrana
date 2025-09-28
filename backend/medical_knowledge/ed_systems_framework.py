"""
Emergency Department Medical Systems Framework
Based on structured clinical history-taking with 9 major systems
"""

ED_SYSTEMS_FRAMEWORK = {
    "cardiovascular": {
        "presentations": ["chest pain", "palpitations", "syncope", "leg swelling", "heart pain"],
        "structured_questions": [
            "onset_pattern",  # sudden vs gradual?
            "nature",         # pressure, stabbing, burning?
            "radiation",      # jaw, arm, back?
            "associated_symptoms",  # SOB, diaphoresis, nausea?
            "risk_factors"    # HTN, DM, smoking, family history?
        ],
        "red_flags": [
            "chest pain at rest",
            "syncope without warning", 
            "hypotension",
            "diaphoresis with chest pain",
            "radiation to jaw or left arm"
        ],
        "key_questions": {
            "onset_pattern": "Did this start suddenly or gradually? Was it after exertion?",
            "nature": "Can you describe the pain - is it pressure, stabbing, or burning?",
            "radiation": "Does it spread anywhere, like to your arm, jaw, or back?",
            "associated_symptoms": "Any shortness of breath, sweating, or nausea?",
            "risk_factors": "Do you have high blood pressure, diabetes, or heart disease in the family?"
        },
        "teaching_pearl": "Always ask time of onset + associated diaphoresis → classic ACS differentiator"
    },
    
    "respiratory": {
        "presentations": ["cough", "shortness of breath", "hemoptysis", "wheezing", "stridor", "breathing problems"],
        "structured_questions": [
            "onset_pattern",  # sudden vs gradual?
            "cough_nature",   # dry, productive, sputum color/quantity?
            "breathlessness_pattern",  # exertional, orthopnea, PND?
            "triggers",       # exertion, cold, dust, allergens?
        ],
        "red_flags": [
            "stridor",
            "hemoptysis >200 mL",
            "acute hypoxia",
            "chest pain + SOB"
        ],
        "key_questions": {
            "onset_pattern": "When did this start? Did it come on suddenly?",
            "cough_nature": "Is it a dry cough or are you bringing up anything?",
            "breathlessness_pattern": "Do you feel breathless when lying flat?",
            "triggers": "Does anything make it worse - exertion, cold air, dust?"
        },
        "teaching_pearl": "Always clarify orthopnea/PND → differentiates cardiac from primary respiratory cause"
    },
    
    "gastrointestinal": {
        "presentations": ["abdominal pain", "stomach pain", "vomiting", "nausea", "diarrhea", "constipation", "jaundice"],
        "structured_questions": [
            "pain_location",  # site, radiation, relation to meals?
            "vomiting_nature", # blood, bile, coffee-ground?
            "bowel_pattern",  # frequency, blood, travel history?
            "associated_symptoms"  # jaundice, fever, weight loss?
        ],
        "red_flags": [
            "hematemesis",
            "peritonitis signs",
            "massive GI bleed",
            "shock"
        ],
        "key_questions": {
            "pain_location": "Where exactly is the pain? Does it spread anywhere?",
            "vomiting_nature": "Any blood in the vomit? What color is it?",
            "bowel_pattern": "Any changes in bowel movements? Blood in stool?",
            "associated_symptoms": "Any relation to eating? Fever? Weight loss?"
        },
        "teaching_pearl": "Always assess relation of pain to meals (gallstones, ulcer, pancreatitis)"
    },
    
    "neurological": {
        "presentations": ["headache", "weakness", "numbness", "seizure", "dizziness", "confusion"],
        "structured_questions": [
            "headache_pattern", # sudden vs gradual, worst-ever?
            "weakness_pattern", # acute vs progressive, symmetry?
            "seizure_details",  # aura, tonic-clonic, postictal?
            "associated_symptoms" # vision, speech, coordination?
        ],
        "red_flags": [
            "thunderclap headache",
            "new seizure in adult",
            "acute focal deficit",
            "worst headache ever"
        ],
        "key_questions": {
            "headache_pattern": "Is this the worst headache you've ever had? When did it start?",
            "weakness_pattern": "When did the weakness start? Which side of the body?",
            "seizure_details": "Did you have any warning before the seizure?",
            "associated_symptoms": "Any slurred speech, vision changes, or face drooping?"
        },
        "teaching_pearl": "Time of onset is critical in stroke — document precisely"
    },
    
    "genitourinary": {
        "presentations": ["dysuria", "frequency", "urgency", "hematuria", "flank pain", "retention", "testicular pain"],
        "structured_questions": [
            "urinary_symptoms", # burning vs pain, fever, frequency?
            "hematuria_pattern", # painless vs painful, clots?
            "retention_history", # acute vs chronic, catheter history?
            "associated_pain"    # flank, suprapubic, testicular?
        ],
        "red_flags": [
            "anuria",
            "gross hematuria with clots",
            "septic UTI",
            "testicular torsion"
        ],
        "key_questions": {
            "urinary_symptoms": "Any burning when you urinate? How often are you going?",
            "hematuria_pattern": "Any blood in the urine? Is there pain with it?",
            "retention_history": "Can you pass urine normally? Any prostate problems?",
            "associated_pain": "Any pain in your back, lower belly, or testicles?"
        },
        "teaching_pearl": "Testicular pain in young males = torsion until proven otherwise"
    },
    
    "musculoskeletal": {
        "presentations": ["joint pain", "back pain", "limb pain", "swelling", "trauma", "muscle pain"],
        "structured_questions": [
            "pain_pattern",    # acute vs chronic, mono vs polyarticular?
            "trauma_history",  # mechanism, ability to bear weight?
            "back_pain_specifics", # radiation, bladder/bowel involvement?
            "joint_inflammation"   # swelling, redness, fever?
        ],
        "red_flags": [
            "inability to walk",
            "septic arthritis suspicion",
            "cauda equina signs"
        ],
        "key_questions": {
            "pain_pattern": "How many joints are affected? When did it start?",
            "trauma_history": "Any injury? Can you bear weight on it?",
            "back_pain_specifics": "Does the pain go down your leg? Any numbness?",
            "joint_inflammation": "Is the joint swollen, red, or warm? Any fever?"
        },
        "teaching_pearl": "Always rule out septic arthritis in a swollen painful joint"
    },
    
    "endocrine": {
        "presentations": ["polyuria", "polydipsia", "weight loss", "weight gain", "fatigue", "thyroid problems"],
        "structured_questions": [
            "polyuria_pattern", # onset, nocturia, dehydration?
            "weight_changes",   # appetite, fever, GI symptoms?
            "fatigue_pattern",  # duration, heat/cold intolerance?
            "diabetic_symptoms" # thirst, urination, vision changes?
        ],
        "red_flags": [
            "DKA symptoms",
            "thyroid storm",
            "hypoglycemia",
            "severe dehydration"
        ],
        "key_questions": {
            "polyuria_pattern": "How often are you urinating? Getting up at night?",
            "weight_changes": "Any recent weight loss or gain? How's your appetite?",
            "fatigue_pattern": "How long have you felt tired? Any heat or cold intolerance?",
            "diabetic_symptoms": "Are you very thirsty? Any nausea or vomiting?"
        },
        "teaching_pearl": "Any diabetic with vomiting + abdominal pain = suspect DKA"
    }
}

GREETING_PATTERNS = [
    "hi", "hello", "hey", "good morning", "good afternoon", "good evening",
    "how are you", "what's up", "greetings", "hola", "bonjour"
]

NON_MEDICAL_PATTERNS = [
    "thank you", "thanks", "okay", "ok", "yes", "no", "sure",
    "i see", "understood", "got it", "alright", "fine"
]

def identify_medical_system(user_message):
    """Identify which medical system(s) the user's message relates to"""
    message_lower = user_message.lower()
    
    # Check if it's a greeting or non-medical response
    for pattern in GREETING_PATTERNS:
        if pattern in message_lower:
            return "greeting"
    
    for pattern in NON_MEDICAL_PATTERNS:
        if message_lower.strip() == pattern:
            return "acknowledgment"
    
    matching_systems = []
    
    for system, data in ED_SYSTEMS_FRAMEWORK.items():
        for presentation in data["presentations"]:
            if presentation in message_lower:
                matching_systems.append(system)
    
    return matching_systems if matching_systems else ["general"]

def get_structured_questions(system, conversation_state):
    """Get next structured question based on medical system and conversation state"""
    if system not in ED_SYSTEMS_FRAMEWORK:
        return None
    
    system_data = ED_SYSTEMS_FRAMEWORK[system]
    asked_questions = conversation_state.get("asked_questions", [])
    
    # Find next question to ask
    for question_type in system_data["structured_questions"]:
        if question_type not in asked_questions:
            return {
                "question": system_data["key_questions"][question_type],
                "type": question_type,
                "system": system
            }
    
    return None

def check_red_flags(user_message, system):
    """Check for red flag symptoms that need immediate attention"""
    if system not in ED_SYSTEMS_FRAMEWORK:
        return []
    
    message_lower = user_message.lower()
    red_flags_found = []
    
    for red_flag in ED_SYSTEMS_FRAMEWORK[system]["red_flags"]:
        if red_flag.lower() in message_lower:
            red_flags_found.append(red_flag)
    
    return red_flags_found

def get_teaching_pearl(system):
    """Get the teaching pearl for the medical system"""
    if system in ED_SYSTEMS_FRAMEWORK:
        return ED_SYSTEMS_FRAMEWORK[system]["teaching_pearl"]
    return None