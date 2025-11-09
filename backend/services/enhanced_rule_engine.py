# services/enhanced_rule_engine.py
"""
Run CSV rules on every turn - no more generic fallback
If an Emergency/High rule fires, stop asking and return triage
"""

from typing import Dict, List, Optional, Set, Any, Tuple
from dataclasses import dataclass
import os

@dataclass
class EvalResult:
    """Result of rule evaluation"""
    matched_rule_id: str
    likely_condition: str
    urgency: str
    matched_why: List[str]
    score: float

def build_token_bag(slots: Dict[str, Any]) -> Set[str]:
    """
    Build a bag of tokens from extracted facts
    This is what we match against rule triggers
    """
    bag: Set[str] = set()
    
    # Add symptoms
    if slots.get("symptoms"):
        for sym in slots["symptoms"]:
            bag.add(sym.lower())
    
    # Add onset modifier
    if slots.get("onset"):
        bag.add(f"{slots['onset']} onset")
    
    # Add pattern
    if slots.get("pattern"):
        bag.add(slots["pattern"])
    
    # Derived tokens
    if slots.get("temperature_f") and slots["temperature_f"] >= 100.4:
        bag.add("fever")
    
    if slots.get("radiation"):
        bag.add("radiation")
        for loc in slots["radiation"]:
            if "arm" in loc.lower():
                bag.add("arm radiation")
            if "left" in loc.lower():
                bag.add("left arm radiation")
    
    # Severity-based tokens
    if slots.get("severity"):
        sev = slots["severity"]
        if sev >= 7:
            bag.add("severe")
        elif sev >= 4:
            bag.add("moderate")
    
    # Shorthand additions
    if "sweating" in bag:
        bag.add("diaphoresis")
    
    if "shortness of breath" in bag:
        bag.add("sob")
        bag.add("dyspnea")
    
    return bag

def evaluate_rules_from_facts(slots: Dict[str, Any], rules_data: List[Dict]) -> Optional[EvalResult]:
    """
    Evaluate clinical rules against extracted facts
    Returns highest urgency match or None
    """
    bag = build_token_bag(slots)
    
    if not bag:
        return None
    
    urgency_rank = {
        "Emergency": 5,
        "High": 4,
        "Urgent": 3,
        "Moderate": 2,
        "Mild": 1
    }
    
    best_match: Optional[Tuple[Dict, List[str], float]] = None
    
    for rule in rules_data:
        triggers = [t.strip().lower() for t in rule.get("triggers", "").split("+") if t.strip()]
        modifiers = [m.strip().lower() for m in rule.get("modifiers", "").split("+") if m.strip()]
        
        if not triggers:
            continue
        
        # Check trigger coverage
        matched_why = []
        trigger_hits = 0
        
        for trigger in triggers:
            if trigger in bag:
                trigger_hits += 1
                matched_why.append(f"trigger:{trigger}")
        
        if trigger_hits == 0:
            continue  # No triggers matched
        
        # Calculate trigger score
        trigger_score = trigger_hits / len(triggers)
        
        if trigger_score < 0.5:  # Need at least 50% of triggers
            continue
        
        # Check modifiers (bonus, not required)
        modifier_hits = 0
        for modifier in modifiers:
            if modifier in bag:
                modifier_hits += 1
                matched_why.append(f"modifier:{modifier}")
        
        # Calculate total score
        modifier_bonus = 0.1 * modifier_hits
        total_score = trigger_score + modifier_bonus
        
        # Select best match (highest urgency, then highest score)
        if not best_match:
            best_match = (rule, matched_why, total_score)
        else:
            current_rule, _, current_score = best_match
            current_urgency = urgency_rank.get(current_rule.get("urgency", "Moderate"), 2)
            new_urgency = urgency_rank.get(rule.get("urgency", "Moderate"), 2)
            
            if new_urgency > current_urgency or (new_urgency == current_urgency and total_score > current_score):
                best_match = (rule, matched_why, total_score)
    
    if not best_match:
        return None
    
    rule, why, score = best_match
    
    return EvalResult(
        matched_rule_id=rule.get("rule_id", ""),
        likely_condition=rule.get("condition", ""),
        urgency=rule.get("urgency", "Moderate"),
        matched_why=why,
        score=score
    )

def load_csv_rules(csv_path: str) -> List[Dict]:
    """Load rules from CSV file"""
    import csv
    
    if not os.path.exists(csv_path):
        print(f"⚠️ CSV rules file not found: {csv_path}")
        return []
    
    rules = []
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            rules.append({
                "rule_id": row.get("Rule_ID", ""),
                "triggers": row.get("Trigger_Symptoms", ""),
                "modifiers": row.get("Modifiers", ""),
                "condition": row.get("Likely_Condition", ""),
                "urgency": row.get("Urgency_Level", "Moderate")
            })
    
    print(f"📋 Loaded {len(rules)} CSV rules for turn-by-turn evaluation")
    return rules

# Load rules once at module level
CSV_PATH = os.path.join(os.path.dirname(__file__), "..", "clinical_engine", "clinical_rules.csv")
LOADED_RULES = load_csv_rules(CSV_PATH)

def get_triage_badge(urgency: str) -> str:
    """Map urgency to UI badge"""
    mapping = {
        "Emergency": "RED",
        "High": "ORANGE",
        "Urgent": "ORANGE",
        "Moderate": "YELLOW",
        "Mild": "GREEN"
    }
    return mapping.get(urgency, "YELLOW")

def get_next_steps(urgency: str) -> str:
    """Get action text for urgency level"""
    if urgency == "Emergency":
        return "📞 Please seek emergency medical care immediately (call 911 or local emergency number)."
    elif urgency == "High":
        return "🏥 Same-day, in-person medical evaluation is strongly recommended."
    elif urgency == "Urgent":
        return "🕘 Please book an urgent appointment soon to be assessed."
    elif urgency == "Moderate":
        return "📋 Schedule a routine appointment and monitor symptoms."
    else:
        return "✅ Self-care may be reasonable. Monitor and seek care if symptoms worsen."
