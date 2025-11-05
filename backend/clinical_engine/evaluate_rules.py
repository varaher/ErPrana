# /app/backend/clinical_engine/evaluate_rules.py
"""
CSV-based clinical rules evaluator
Scores and ranks conditions based on trigger symptoms and modifiers
"""

from __future__ import annotations
import csv
import os
from dataclasses import dataclass
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional

def norm(s: str) -> str:
    """Normalize text for matching"""
    return ' '.join(s.lower().strip().split())

def tokenize_plus_field(s: str) -> List[str]:
    """Split 'Chest pain + SOB + Sweating' → ['chest pain', 'sob', 'sweating']"""
    if not s:
        return []
    return [norm(x) for x in s.split('+') if x.strip()]

@dataclass
class Rule:
    rule_id: str
    triggers: List[str]           # normalized trigger symptoms
    modifiers: List[str]          # normalized modifiers (optional hints)
    condition: str
    urgency: str

class RuleSet:
    def __init__(self, csv_path: Optional[str | Path] = None):
        self.rules: List[Rule] = []
        if csv_path is None:
            csv_path = os.path.join(
                os.path.dirname(__file__),
                "clinical_rules.csv"
            )
        self._load(csv_path)
    
    def _load(self, csv_path: str | Path):
        """Load rules from CSV file"""
        if not os.path.exists(csv_path):
            print(f"⚠️  CSV not found: {csv_path}")
            return
        
        with open(csv_path, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Handle different possible column names
                rule_id = row.get('Rule_ID') or row.get('rule_id') or row.get('id', '')
                triggers_raw = row.get('Trigger_Symptoms') or row.get('triggers') or ''
                modifiers_raw = row.get('Modifiers') or row.get('modifiers') or ''
                condition = row.get('Likely_Condition') or row.get('condition') or ''
                urgency = row.get('Urgency_Level') or row.get('urgency') or 'Yellow'
                
                triggers = tokenize_plus_field(triggers_raw)
                modifiers = tokenize_plus_field(modifiers_raw)
                
                if triggers:  # Only add if has triggers
                    self.rules.append(
                        Rule(
                            rule_id=rule_id.strip(),
                            triggers=triggers,
                            modifiers=modifiers,
                            condition=condition.strip(),
                            urgency=urgency.strip()
                        )
                    )
        
        print(f"📋 Loaded {len(self.rules)} clinical rules from CSV")
    
    def evaluate(self, extracted: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Evaluate rules against extracted features
        
        extracted should contain:
          - symptoms: List[str] (chief + associated)
          - onset, radiation, duration, pattern, etc.
        
        Returns top matches sorted by score desc
        """
        # Build symptom set
        symptoms = set()
        if extracted.get('chief_complaint'):
            symptoms.add(norm(extracted['chief_complaint']))
        if extracted.get('symptoms'):
            for s in extracted['symptoms']:
                symptoms.add(norm(s))
        if extracted.get('associated_symptoms'):
            if isinstance(extracted['associated_symptoms'], str):
                for s in extracted['associated_symptoms'].split(','):
                    symptoms.add(norm(s.strip()))
            elif isinstance(extracted['associated_symptoms'], list):
                for s in extracted['associated_symptoms']:
                    symptoms.add(norm(s))
        
        # Build modifiers set
        present_mods = set()
        for k, v in extracted.items():
            if k in ['symptoms', 'chief_complaint', 'associated_symptoms', 'raw_text']:
                continue
            
            if v is True:
                present_mods.add(norm(k))
            elif isinstance(v, str):
                present_mods.add(norm(v))
            elif isinstance(v, list):
                for item in v:
                    if isinstance(item, str):
                        present_mods.add(norm(item))
        
        # Score each rule
        results: List[Tuple[Rule, float, Dict[str, Any]]] = []
        
        for rule in self.rules:
            if not rule.triggers:
                continue
            
            # Trigger coverage: fraction of triggers present
            trig_hits = sum(1 for t in rule.triggers if t in symptoms)
            if trig_hits == 0:
                continue  # No trigger overlap → skip
            
            trig_score = trig_hits / len(rule.triggers)
            
            # Modifier bonus: small bump for each modifier present
            mod_hits = sum(1 for m in rule.modifiers if m in present_mods)
            mod_bonus = 0.05 * mod_hits
            
            # Severity bonus for high severity
            severity = extracted.get('severity')
            if severity:
                try:
                    sev_val = int(severity) if isinstance(severity, (int, str)) else severity
                    sev_bonus = 0.05 if sev_val >= 7 else 0.0
                except:
                    sev_bonus = 0.0
            else:
                sev_bonus = 0.0
            
            score = trig_score + mod_bonus + sev_bonus
            results.append((rule, score, {"trig_hits": trig_hits, "mod_hits": mod_hits}))
        
        # Sort by score descending
        results.sort(key=lambda x: x[1], reverse=True)
        
        # Return top 5
        return [
            {
                "rule_id": r.rule_id,
                "likely_condition": r.condition,
                "urgency": r.urgency,
                "score": round(score, 3),
                "explain": details
            }
            for (r, score, details) in results[:5]
        ]

# Global instance
try:
    RULES = RuleSet()
except Exception as e:
    print(f"⚠️  Failed to load rules: {e}")
    RULES = None
