# /app/backend/services/extractors.py
"""
Strict slot extractors - no ambiguous number parsing
"""

import re
from typing import Optional, Dict, Any

# Temperature ONLY with explicit units
TEMP_RE = re.compile(
    r'(?P<val>\d{2,3})\s*(?:°\s*)?(?P<unit>[fFcC]|fahrenheit|celsius)\b'
)

# Severity: explicit 1-10 or descriptive words
SEVERITY_RE = re.compile(r'\b(10|[1-9])\b')
SEVERITY_WORDS = {
    'mild': 3,
    'moderate': 5,
    'severe': 8,
    'worst': 10,
    'unbearable': 10,
    'excruciating': 10
}

# Duration patterns
DURATION_RE = [
    (re.compile(r'(\d+)\s*(?:day|days)'), 'days'),
    (re.compile(r'(\d+)\s*(?:week|weeks)'), 'weeks'),
    (re.compile(r'(\d+)\s*(?:hour|hours|hrs?)'), 'hours'),
    (re.compile(r'(\d+)\s*(?:month|months)'), 'months'),
]

def extract_temperature(text: str) -> Optional[Dict[str, Any]]:
    """
    Extract temperature ONLY if a unit is present.
    Returns {'value_f': float, 'raw': '101 F'} or None
    Bare numbers are NEVER temperatures.
    """
    m = TEMP_RE.search(text)
    if not m:
        return None

    val = float(m.group('val'))
    unit = m.group('unit').lower()
    
    if unit in ('c', 'celsius'):
        # Convert to Fahrenheit
        val_f = (val * 9 / 5) + 32.0
        raw = f"{val}°C"
    else:
        val_f = val
        raw = f"{val}°F"
    
    return {"value_f": round(val_f, 1), "raw": raw}

def extract_severity(text: str, context_expects_severity: bool = False) -> Optional[int]:
    """
    Extract severity score (1-10 scale).
    Only extracts bare numbers if context_expects_severity=True
    """
    text_lower = text.lower()
    
    # Check for descriptive words first
    for word, score in SEVERITY_WORDS.items():
        if word in text_lower:
            return score
    
    # Check for explicit scale notation
    if '/10' in text or 'out of 10' in text_lower:
        m = re.search(r'(\d+)\s*/\s*10', text)
        if m:
            return int(m.group(1))
    
    # Only check for bare numbers if we're expecting severity
    if context_expects_severity:
        m = SEVERITY_RE.search(text)
        if m:
            return int(m.group(1))
    
    return None

def extract_duration(text: str) -> Optional[str]:
    """Extract duration with unit"""
    text_lower = text.lower()
    
    # Special cases
    if 'yesterday' in text_lower:
        return '1 day'
    if 'today' in text_lower or 'this morning' in text_lower:
        return 'hours'
    
    # Pattern matching
    for pattern, unit in DURATION_RE:
        m = pattern.search(text_lower)
        if m:
            val = m.group(1)
            return f"{val} {unit}"
    
    return None

def extract_onset(text: str) -> Optional[str]:
    """Extract onset (sudden vs gradual)"""
    text_lower = text.lower()
    
    if any(word in text_lower for word in ['sudden', 'suddenly', 'all of a sudden', 'instant']):
        return 'sudden'
    elif any(word in text_lower for word in ['gradual', 'gradually', 'slow', 'slowly', 'progressive']):
        return 'gradual'
    
    return None

def extract_pattern(text: str) -> Optional[str]:
    """Extract symptom pattern"""
    text_lower = text.lower()
    
    if any(phrase in text_lower for phrase in ['comes and goes', 'come and go', 'on and off', 'intermittent']):
        return 'intermittent'
    elif any(word in text_lower for word in ['constant', 'continuous', 'ongoing', 'persistent']):
        return 'constant'
    
    return None

def extract_radiation(text: str) -> Optional[str]:
    """Extract pain radiation locations"""
    text_lower = text.lower()
    
    locations = []
    if 'arm' in text_lower:
        if 'left arm' in text_lower:
            locations.append('left arm')
        elif 'right arm' in text_lower:
            locations.append('right arm')
        else:
            locations.append('arm')
    
    if 'jaw' in text_lower:
        locations.append('jaw')
    if 'neck' in text_lower:
        locations.append('neck')
    if 'back' in text_lower:
        locations.append('back')
    if 'shoulder' in text_lower:
        locations.append('shoulder')
    
    if locations:
        return f"yes, to {', '.join(locations)}"
    
    if any(word in text_lower for word in ['no radiation', 'not radiating', "doesn't radiate"]):
        return 'no'
    
    return None

def extract_yes_no(text: str) -> Optional[bool]:
    """Extract yes/no from text"""
    text_lower = text.lower().strip()
    
    if text_lower in ['yes', 'y', 'yeah', 'yep', 'correct', 'true', 'affirmative']:
        return True
    if text_lower in ['no', 'n', 'nope', 'not', 'false', 'negative']:
        return False
    
    return None
