# /app/backend/services/extractors.py
"""
Strict extraction functions for temperature, severity, and other clinical data
Avoids ambiguous number parsing
"""

import re
from typing import Optional, Dict, Any

# Temperature requires EXPLICIT unit (F, C, deg)
TEMP_RE = re.compile(r'(?P<val>\d{2,3}(?:\.\d)?)\s*(?:°?\s*(?P<unit>[fFcC])|\bdeg(?:ree)?s?\s*(?P<unit2>[fFcC])?)', re.I)

def extract_temperature(text: str) -> Optional[Dict[str, Any]]:
    """
    Extract temperature ONLY if explicit unit is provided (F, C, degree, deg)
    Returns {"value_f": float, "value_c": float, "raw": str} or None
    """
    m = TEMP_RE.search(text)
    if not m:
        return None
    
    val = float(m.group("val"))
    unit = (m.group("unit") or m.group("unit2") or "").lower()
    
    # Determine if Celsius or Fahrenheit
    if 'c' in unit:
        value_c = val
        value_f = val * 9/5 + 32.0
    else:
        # Default to Fahrenheit or if 'f' in unit
        value_f = val
        value_c = (val - 32) * 5/9
    
    # Sanity check
    if not (92 <= value_f <= 110):
        return None
    
    return {
        "value_f": round(value_f, 1),
        "value_c": round(value_c, 1),
        "raw": f"{value_f}°F ({value_c}°C)"
    }

def extract_severity(text: str, context_expects_severity: bool = False) -> Optional[int]:
    """
    Extract severity rating (1-10 scale)
    Only extracts if:
    - Pattern like "7/10" or "7 out of 10" is found
    - context_expects_severity=True and bare number 1-10 is found
    """
    # Pattern: "7/10" or "7 out of 10"
    explicit = re.search(r'(\d{1,2})\s*(?:/|out of)\s*10', text, re.I)
    if explicit:
        val = int(explicit.group(1))
        if 1 <= val <= 10:
            return val
    
    # Contextual: If we JUST asked for severity, bare number is OK
    if context_expects_severity:
        # Look for standalone digit 1-10
        bare = re.search(r'\b([1-9]|10)\b', text)
        if bare:
            val = int(bare.group(1))
            if 1 <= val <= 10:
                return val
    
    # Text-based severity
    text_lower = text.lower()
    if 'mild' in text_lower:
        return 3
    if 'moderate' in text_lower:
        return 6
    if 'severe' in text_lower or 'worst' in text_lower:
        return 9
    
    return None

def extract_yes_no(text: str) -> Optional[bool]:
    """
    Extract yes/no answer
    Returns True for yes, False for no, None if unclear
    """
    text_lower = text.lower().strip()
    
    yes_words = ['yes', 'y', 'yeah', 'yup', 'sure', 'ok', 'okay', 'correct', 'right', 'affirmative']
    no_words = ['no', 'n', 'nope', 'nah', 'not', 'negative']
    
    if any(w == text_lower or text_lower.startswith(w + ' ') for w in yes_words):
        return True
    if any(w == text_lower or text_lower.startswith(w + ' ') for w in no_words):
        return False
    
    return None

def extract_duration(text: str) -> Optional[str]:
    """
    Extract duration (e.g., "2 days", "3 weeks")
    """
    patterns = [
        (r'(\d+)\s*(day|days)', 'days'),
        (r'(\d+)\s*(week|weeks)', 'weeks'),
        (r'(\d+)\s*(month|months)', 'months'),
        (r'(\d+)\s*(hour|hours|hrs?)', 'hours'),
    ]
    
    for pat, unit in patterns:
        m = re.search(pat, text, re.I)
        if m:
            val = int(m.group(1))
            return f"{val} {unit}"
    
    # Relative time
    if 'yesterday' in text.lower():
        return '1 day'
    if 'today' in text.lower() or 'this morning' in text.lower():
        return 'hours'
    
    return None

def extract_onset(text: str) -> Optional[str]:
    """
    Extract onset (sudden vs gradual)
    """
    text_lower = text.lower()
    
    if any(word in text_lower for word in ['sudden', 'suddenly', 'all of a sudden', 'instant']):
        return 'sudden'
    if any(word in text_lower for word in ['gradual', 'gradually', 'slow', 'slowly']):
        return 'gradual'
    
    return None

def extract_pattern(text: str) -> Optional[str]:
    """
    Extract symptom pattern (constant vs intermittent)
    """
    text_lower = text.lower()
    
    # Intermittent patterns
    if any(phrase in text_lower for phrase in ['comes and goes', 'come and go', 'on and off', 'intermittent']):
        return 'intermittent'
    
    # Constant patterns
    if any(word in text_lower for word in ['constant', 'continuous', 'ongoing', 'all the time', 'persistent']):
        return 'constant'
    
    return None

def extract_radiation(text: str) -> Optional[str]:
    """
    Extract pain radiation
    """
    text_lower = text.lower()
    
    locations = []
    if 'arm' in text_lower or 'shoulder' in text_lower:
        if 'left' in text_lower:
            locations.append('left arm')
        elif 'right' in text_lower:
            locations.append('right arm')
        else:
            locations.append('arm')
    
    if 'jaw' in text_lower:
        locations.append('jaw')
    
    if 'neck' in text_lower or 'back' in text_lower:
        locations.append('neck/back')
    
    if locations:
        return 'yes, to ' + ', '.join(locations)
    
    if any(word in text_lower for word in ['no', 'not', "doesn't", 'does not']):
        return 'no'
    
    return None
