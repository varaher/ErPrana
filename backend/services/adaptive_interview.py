# /app/backend/services/adaptive_interview.py
"""
Adaptive Interview Engine
-------------------------
Adds slot auto-extraction, jump-ahead logic, and decision completion for ARYA.
"""

import re
from datetime import datetime, timedelta
from typing import Dict, Any, Tuple, List, Optional

# ------------------------------------------------------------
#  SLOT EXTRACTION HELPERS
# ------------------------------------------------------------

DURATION_PATTERNS = [
    (r"(\d+)\s*(day|days)", "days"),
    (r"(\d+)\s*(week|weeks)", "weeks"),
    (r"(\d+)\s*(hour|hours|hrs?)", "hours"),
    (r"(\d+)\s*(month|months)", "months"),
]
TEMPERATURE_PATTERNS = [
    (r"(\d+\.?\d*)\s*°?\s*[fF]", "F"),
    (r"(\d+\.?\d*)\s*°?\s*[cC]", "C"),
    (r"(\d{2,3})\s*(?!year)", "F"),  # Assume Fahrenheit for bare numbers 95-110
]
SEVERITY_PATTERNS = [
    (r"(\d+)\s*/\s*10", None),
    (r"mild", "mild"),
    (r"moderate", "moderate"),
    (r"severe", "severe"),
    (r"worst", "severe"),
]
PATTERN_WORDS = {
    "constant": "constant",
    "intermittent": "intermittent",
    "comes and goes": "intermittent",
    "come and go": "intermittent",
    "on and off": "intermittent",
    "continuous": "constant",
    "ongoing": "constant",
}
RISK_FACTORS = ["smoke", "smoker", "smoking", "diabetes", "diabetic", "hypertension", 
                "high blood pressure", "bp", "heart disease", "asthma", "copd"]

ASSOC_WORDS = [
    "cough", "cold", "sore throat", "nausea", "vomit", "chills", "body ache",
    "sweat", "sweating", "dyspnea", "shortness of breath", "diarrhea", "rash", "pain",
    "headache", "dizzy", "confusion", "weakness", "fatigue", "sputum", "phlegm"
]

# ------------------------------------------------------------
#  SLOT EXTRACTORS
# ------------------------------------------------------------

def extract_duration(text: str) -> str:
    """Extract duration from text (e.g., '2 days', '1 week')"""
    for pat, unit in DURATION_PATTERNS:
        if m := re.search(pat, text):
            val = int(m.group(1))
            return f"{val} {unit}"
    if "yesterday" in text:
        return "1 day"
    if "today" in text or "this morning" in text:
        return "hours"
    return ""

def extract_temp(text: str) -> Tuple[float, str]:
    """Extract temperature from text"""
    # Don't extract if it's clearly severity (e.g., standalone number 1-10)
    if re.match(r'^\s*\d{1}\s*$', text):  # Single digit alone = likely severity
        return 0.0, ""
    
    for pat, unit in TEMPERATURE_PATTERNS:
        if m := re.search(pat, text):
            val = float(m.group(1))
            # Smart unit detection
            if not unit and 95 <= val <= 110:
                unit = "F"
            elif not unit and 35 <= val <= 42:
                unit = "C"
            elif not unit and val <= 10:
                # Likely severity, not temperature
                return 0.0, ""
            return val, unit
    return 0.0, ""

def extract_severity(text: str) -> str:
    """Extract severity level from text"""
    for pat, label in SEVERITY_PATTERNS:
        if m := re.search(pat, text):
            if label:
                return label
            val = m.group(1) if m.groups() else m.group(0)
            return val
    return ""

def extract_pattern(text: str) -> str:
    """Extract fever/symptom pattern"""
    for k, v in PATTERN_WORDS.items():
        if k in text:
            return v
    return ""

def extract_assoc(text: str) -> List[str]:
    """Extract associated symptoms"""
    return [w for w in ASSOC_WORDS if w in text]

def extract_risk_factors(text: str) -> List[str]:
    """Extract risk factors"""
    return [r for r in RISK_FACTORS if r in text]

def extract_onset(text: str) -> str:
    """Extract onset (sudden vs gradual)"""
    if any(word in text for word in ["sudden", "suddenly", "all of a sudden", "instant"]):
        return "sudden"
    elif any(word in text for word in ["gradual", "gradually", "slow", "slowly"]):
        return "gradual"
    return ""

def extract_radiation(text: str) -> str:
    """Extract pain radiation"""
    if any(word in text for word in ["arm", "jaw", "neck", "back", "shoulder"]):
        locations = []
        if "arm" in text:
            locations.append("arm")
        if "jaw" in text:
            locations.append("jaw")
        if "neck" in text or "back" in text:
            locations.append("neck/back")
        return f"yes, to {', '.join(locations)}"
    elif any(word in text for word in ["no", "not", "doesn't", "does not"]):
        return "no"
    return ""

# ------------------------------------------------------------
#  COMBINED EXTRACTION PIPE
# ------------------------------------------------------------

def extract_slots_from_text(text: str, context_slot: str = None) -> Dict[str, Any]:
    """
    Main extraction function - parses user text and extracts all possible slots
    context_slot: If provided, prioritize extracting this specific slot
    """
    text_lower = text.lower()
    
    # If asking for specific slot and text is simple, use it directly
    if context_slot and text_lower.strip() and len(text_lower.split()) <= 3:
        # Simple response to specific question
        if context_slot == "severity" and re.match(r'^\d{1,2}$', text_lower.strip()):
            return {"severity": text_lower.strip(), "raw_text": text_lower}
        elif context_slot == "duration" and extract_duration(text_lower):
            return {"duration": extract_duration(text_lower), "raw_text": text_lower}
        elif context_slot == "pattern" and extract_pattern(text_lower):
            return {"pattern": extract_pattern(text_lower), "raw_text": text_lower}
    
    duration = extract_duration(text_lower)
    temp, unit = extract_temp(text_lower)
    pattern = extract_pattern(text_lower)
    severity = extract_severity(text_lower)
    assoc = extract_assoc(text_lower)
    risks = extract_risk_factors(text_lower)
    onset = extract_onset(text_lower)
    radiation = extract_radiation(text_lower)
    
    extracted = {
        "duration": duration,
        "temperature": f"{temp} {unit}".strip() if temp else "",
        "pattern": pattern,
        "severity": severity,
        "associated_symptoms": ", ".join(assoc) if assoc else "",
        "risk_factors": ", ".join(risks) if risks else "",
        "onset": onset,
        "radiation": radiation,
        "raw_text": text_lower
    }
    
    # Remove empty values
    return {k: v for k, v in extracted.items() if v}

# ------------------------------------------------------------
#  SLOT MERGING & JUMP-AHEAD
# ------------------------------------------------------------

def merge_slots(collected_slots: Dict[str, Any], extracted: Dict[str, Any]) -> Dict[str, Any]:
    """
    Merge new extracted slot values into existing collected slots
    Only adds if slot is empty or value is more detailed
    """
    for k, v in extracted.items():
        if k == "raw_text":
            continue
        
        # If slot is empty, add the extracted value
        if k not in collected_slots or not collected_slots[k]:
            collected_slots[k] = v
        # If slot exists but extracted value is more detailed, enhance it
        elif k == "associated_symptoms" and collected_slots[k]:
            # Merge associated symptoms
            existing = set(collected_slots[k].split(", "))
            new_symptoms = set(v.split(", "))
            combined = existing.union(new_symptoms)
            collected_slots[k] = ", ".join(combined)
    
    return collected_slots

def auto_fill_pending_slots(pending_slots: List[str], collected_slots: Dict[str, Any]) -> List[str]:
    """
    Remove slots from pending list if they're already filled
    """
    return [slot for slot in pending_slots if slot not in collected_slots or not collected_slots[slot]]

# ------------------------------------------------------------
#  DECISION LOGIC
# ------------------------------------------------------------

def decision_ready(chief_complaint: str, collected_slots: Dict[str, Any]) -> bool:
    """
    Decide if we have enough info to finalize triage for this complaint
    Returns True if ≥70% of critical slots are filled
    """
    # Define minimum required slots for each complaint type
    required_map = {
        "fever": ["duration", "temperature", "pattern", "associated_symptoms"],
        "chest pain": ["onset", "severity", "radiation", "associated_symptoms"],
        "chest tightness": ["onset", "severity", "associated_symptoms"],
        "headache": ["onset", "severity", "pattern", "associated_symptoms"],
        "severe abdominal pain": ["onset", "severity", "associated_symptoms"],
        "shortness of breath": ["onset", "severity", "rest_or_exertion", "associated_symptoms"],
        "dizziness": ["onset", "pattern", "associated_symptoms"],
        "syncope": ["circumstances", "recovery"],
        "seizures": ["first_seizure", "duration", "type"],
    }
    
    required = required_map.get(chief_complaint, ["duration", "severity", "associated_symptoms"])
    filled = [k for k in required if collected_slots.get(k)]
    ratio = len(filled) / len(required) if required else 0
    
    print(f"🔍 Decision check for {chief_complaint}: {len(filled)}/{len(required)} slots filled ({ratio*100:.0f}%)")
    
    return ratio >= 0.7  # 70% filled is "good enough"

# ------------------------------------------------------------
#  LEGACY COMPATIBILITY (keep existing AdaptiveInterviewManager)
# ------------------------------------------------------------

class AdaptiveInterviewManager:
    """
    Manages adaptive interviews that can:
    1. Accept free-form symptom descriptions
    2. Extract symptoms from unstructured text
    3. Combine multiple symptoms
    4. Avoid loops by tracking conversation context
    """
    
    def __init__(self):
        self.symptom_extractors = {
            'respiratory': ['cough', 'sputum', 'phlegm', 'wheez', 'breath'],
            'systemic': ['fever', 'chills', 'sweats', 'fatigue', 'weakness'],
            'pain': ['pain', 'ache', 'hurt', 'discomfort', 'pressure'],
            'cardiac': ['palpitation', 'racing heart', 'chest', 'irregular'],
            'neurological': ['headache', 'dizzy', 'confusion', 'vision'],
            'gastrointestinal': ['nausea', 'vomit', 'diarrhea', 'stomach']
        }
    
    def extract_additional_symptoms(self, user_input: str) -> List[str]:
        """
        Extract symptoms mentioned in free-form text
        """
        user_input_lower = user_input.lower()
        found_symptoms = []
        
        for category, keywords in self.symptom_extractors.items():
            for keyword in keywords:
                if keyword in user_input_lower:
                    found_symptoms.append(keyword)
        
        return found_symptoms
    
    def enhance_slot_value(self, slot: str, user_input: str, additional_context: List[str] = []) -> str:
        """
        Enhance slot value with additional context from free-form input
        """
        # If user mentions additional symptoms in their response, capture them
        additional_symptoms = self.extract_additional_symptoms(user_input)
        
        if additional_symptoms:
            base_value = user_input
            additional_info = ", ".join(set(additional_symptoms))
            return f"{base_value} (also mentioned: {additional_info})"
        
        return user_input
    
    def should_accept_freeform(self, slot: str, user_input: str) -> bool:
        """
        Determine if we should accept free-form input for a slot
        instead of strict structured response
        """
        # For "associated_symptoms" slot, always accept free-form
        if slot == "associated_symptoms":
            return True
        
        # If user provides detailed multi-symptom description, accept it
        symptom_count = len(self.extract_additional_symptoms(user_input))
        if symptom_count >= 2:
            return True
        
        return False
    
    def merge_symptoms_to_session(self, session: Dict[str, Any], new_symptoms: List[str]) -> Dict[str, Any]:
        """
        Merge new symptoms into existing session without restarting
        """
        collected_slots = session.get("collected_slots", {})
        
        # Add to associated_symptoms if exists
        if "associated_symptoms" in collected_slots:
            existing = collected_slots["associated_symptoms"]
            combined = f"{existing}, {', '.join(new_symptoms)}"
            collected_slots["associated_symptoms"] = combined
        else:
            collected_slots["associated_symptoms"] = ", ".join(new_symptoms)
        
        return session
    
    def detect_new_chief_complaint_in_conversation(self, user_input: str, current_complaint: str) -> Optional[str]:
        """
        Detect if user is introducing a NEW chief complaint mid-conversation
        Returns new complaint if detected, None otherwise
        """
        user_input_lower = user_input.lower()
        
        # High-priority symptoms that warrant new interview
        priority_complaints = {
            'chest pain': ['chest pain', 'chest hurt', 'cardiac pain'],
            'stroke symptoms': ['face droop', 'arm weak', 'slurred speech', 'can\'t move'],
            'severe bleeding': ['bleeding', 'blood loss', 'hemorrhage'],
            'unconsciousness': ['passed out', 'unconscious', 'unresponsive']
        }
        
        for complaint, triggers in priority_complaints.items():
            if complaint != current_complaint:
                for trigger in triggers:
                    if trigger in user_input_lower:
                        return complaint
        
        return None
    
    def generate_clarifying_question(self, symptoms: List[str], current_complaint: str) -> str:
        """
        Generate a clarifying question when multiple symptoms are mentioned
        """
        if len(symptoms) >= 2:
            return f"I noted you also mentioned {', '.join(symptoms)}. I'll include that in my assessment. "
        elif len(symptoms) == 1:
            return f"I noted you also mentioned {symptoms[0]}. "
        
        return ""

# Global instance
adaptive_interview = AdaptiveInterviewManager()
