# services/fact_extractor.py
"""
Always extract facts from free text before asking anything
Prevents "describe your symptoms" loops
"""

import re
from typing import Dict, List, Optional, Set, Any

# Comprehensive symptom mapping
SYM_MAP = {
    # cardiopulmonary
    "shortness of breath": "shortness of breath",
    "sob": "shortness of breath",
    "breathless": "shortness of breath",
    "can't breathe": "shortness of breath",
    "chest pain": "chest pain",
    "chest tightness": "chest tightness",
    "chest heaviness": "chest pain",
    "palpitations": "palpitations",
    "pounding heartbeat": "palpitations",
    "racing heart": "palpitations",
    "sweating": "sweating",
    "diaphoresis": "sweating",
    
    # neuro
    "dizzy": "dizziness",
    "dizziness": "dizziness",
    "giddy": "dizziness",
    "vertigo": "dizziness",
    "lightheaded": "dizziness",
    "headache": "headache",
    "confusion": "confusion",
    "weakness": "weakness",
    
    # general / fever
    "fever": "fever",
    "pyrexia": "fever",
    "temperature": "fever",
    "chills": "chills",
    "hot": "fever",
    "feverish": "fever",
    
    # resp
    "cough": "cough",
    "phlegm": "productive cough",
    "sputum": "productive cough",
    
    # gi
    "abdominal pain": "abdominal pain",
    "stomach pain": "abdominal pain",
    "tummy pain": "abdominal pain",
    "belly pain": "abdominal pain",
    "rlq": "abdominal pain (rlq)",
    "right lower": "abdominal pain (rlq)",
    
    # cardiac specific
    "radiating": "radiation",
    "spreading": "radiation",
}

# Regex patterns
RADIATION_REGEX = re.compile(r'(to (my |the )?(left|right)?\s?(arm|jaw|back|shoulder|neck))', re.I)
SUDDEN_REGEX = re.compile(r'\b(sudden(ly)?|all of a sudden|came on out of nowhere|instantly?)\b', re.I)
GRADUAL_REGEX = re.compile(r'\b(gradual(ly)?|built up|came on slowly|progressive)\b', re.I)
TEMP_REGEX = re.compile(r'\b(10[0-9](\.\d+)?|9[8-9](\.\d+)?)\s?°?\s?[fF]\b', re.I)
SEVERITY_REGEX = re.compile(r'\b([1-9]|10)\s?[/]?\s?10\b|\b(severity|pain)\s?(\d{1,2})\b', re.I)
DURATION_REGEX = re.compile(r'\b(few minutes?|couple of minutes?|minutes?|hours?|days?|weeks?)\b', re.I)
INTERMITTENT_REGEX = re.compile(r'\b(intermittent|comes and goes|on and off|nightly)\b', re.I)
CONSTANT_REGEX = re.compile(r'\b(constant|all the time|persistent|continuous)\b', re.I)

def normalize_duration(text: str) -> Optional[int]:
    """Convert duration text to minutes"""
    t = text.lower()
    if "few minute" in t or "couple of minute" in t:
        return 5
    if "minute" in t and "minutes" not in t:
        return 1
    if "minutes" in t:
        return 10
    if "hour" in t and "hours" not in t:
        return 60
    if "hours" in t:
        return 120
    if "day" in t and "days" not in t:
        return 24 * 60
    if "days" in t:
        return 3 * 24 * 60
    if "week" in t and "weeks" not in t:
        return 7 * 24 * 60
    if "weeks" in t:
        return 14 * 24 * 60
    return None

class Facts:
    """Structured facts extracted from user input"""
    def __init__(self):
        self.symptoms: List[str] = []
        self.onset: Optional[str] = None
        self.duration_text: Optional[str] = None
        self.duration_minutes: Optional[int] = None
        self.radiation: List[str] = []
        self.severity: Optional[int] = None
        self.temperature_f: Optional[float] = None
        self.pattern: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "symptoms": self.symptoms,
            "onset": self.onset,
            "duration_text": self.duration_text,
            "duration_minutes": self.duration_minutes,
            "radiation": self.radiation,
            "severity": self.severity,
            "temperature_f": self.temperature_f,
            "pattern": self.pattern
        }
    
    def is_empty(self) -> bool:
        """Check if no facts were extracted"""
        return (
            not self.symptoms and
            not self.onset and
            not self.duration_text and
            not self.radiation and
            not self.severity and
            not self.temperature_f and
            not self.pattern
        )

def extract_facts(input_raw: str) -> Facts:
    """
    Extract structured facts from free-form user input
    This prevents the "describe your symptoms" loop
    """
    input_lower = input_raw.lower()
    facts = Facts()
    
    # 1. Extract symptoms
    detected_symptoms: Set[str] = set()
    for key, symptom in SYM_MAP.items():
        if key in input_lower:
            detected_symptoms.add(symptom)
    facts.symptoms = list(detected_symptoms)
    
    # 2. Extract onset
    if SUDDEN_REGEX.search(input_raw):
        facts.onset = "sudden"
    elif GRADUAL_REGEX.search(input_raw):
        facts.onset = "gradual"
    
    # 3. Extract radiation
    rad_matches = RADIATION_REGEX.findall(input_raw)
    if rad_matches:
        facts.radiation = [m[0].replace("to ", "").strip() for m in rad_matches]
    
    # 4. Extract temperature
    temp_match = TEMP_REGEX.search(input_raw)
    if temp_match:
        try:
            n = float(temp_match.group(1))
            if 95 <= n <= 110:
                facts.temperature_f = n
        except (ValueError, IndexError):
            pass
    
    # 5. Extract severity
    sev_match = SEVERITY_REGEX.search(input_raw)
    if sev_match:
        try:
            s = sev_match.group(1) or sev_match.group(3)
            n = int(s)
            if 1 <= n <= 10:
                facts.severity = n
        except (ValueError, IndexError, AttributeError):
            pass
    
    # 6. Extract duration
    dur_match = DURATION_REGEX.search(input_raw)
    if dur_match:
        facts.duration_text = dur_match.group(0)
        mins = normalize_duration(dur_match.group(0))
        if mins:
            facts.duration_minutes = mins
    
    # 7. Extract pattern
    if INTERMITTENT_REGEX.search(input_raw):
        facts.pattern = "intermittent"
    elif CONSTANT_REGEX.search(input_raw):
        facts.pattern = "constant"
    
    return facts

def merge_facts(existing: Dict[str, Any], new_facts: Facts) -> Dict[str, Any]:
    """Merge new facts into existing session slots"""
    merged = existing.copy()
    
    # Merge symptoms (union)
    if new_facts.symptoms:
        existing_symptoms = set(merged.get("symptoms", []))
        existing_symptoms.update(new_facts.symptoms)
        merged["symptoms"] = list(existing_symptoms)
    
    # Update other fields if not already set
    if new_facts.onset and not merged.get("onset"):
        merged["onset"] = new_facts.onset
    
    if new_facts.duration_text and not merged.get("duration_text"):
        merged["duration_text"] = new_facts.duration_text
        if new_facts.duration_minutes:
            merged["duration_minutes"] = new_facts.duration_minutes
    
    if new_facts.radiation and not merged.get("radiation"):
        merged["radiation"] = new_facts.radiation
    
    if new_facts.severity and not merged.get("severity"):
        merged["severity"] = new_facts.severity
    
    if new_facts.temperature_f and not merged.get("temperature_f"):
        merged["temperature_f"] = new_facts.temperature_f
    
    if new_facts.pattern and not merged.get("pattern"):
        merged["pattern"] = new_facts.pattern
    
    return merged

def summarize_facts(slots: Dict[str, Any]) -> str:
    """Generate a human-readable summary of extracted facts"""
    parts = []
    
    if slots.get("symptoms"):
        parts.append(f"Symptoms: {', '.join(slots['symptoms'])}")
    
    if slots.get("onset"):
        parts.append(f"Onset: {slots['onset']}")
    
    if slots.get("duration_text"):
        parts.append(f"Duration: {slots['duration_text']}")
    
    if slots.get("temperature_f"):
        parts.append(f"Temp: {slots['temperature_f']}°F")
    
    if slots.get("severity"):
        parts.append(f"Severity: {slots['severity']}/10")
    
    if slots.get("pattern"):
        parts.append(f"Pattern: {slots['pattern']}")
    
    if slots.get("radiation"):
        parts.append(f"Radiating: {', '.join(slots['radiation'])}")
    
    if not parts:
        return "I haven't captured any specific details yet."
    
    return "Here's what I understood → " + " · ".join(parts)
