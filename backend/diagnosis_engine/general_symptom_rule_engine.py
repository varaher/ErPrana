from typing import Dict, List, Tuple, Any, Optional
import json
import os
from pathlib import Path

class GeneralSymptomRuleEngine:
    """
    Enhanced symptom rule engine that processes general symptoms against clinical rules
    for rapid triage and provisional diagnosis generation
    """
    
    def __init__(self):
        self.emergency_rules = []
        self.toxicology_rules = []
        self.general_rules = []
        self.load_all_rules()
    
    def load_all_rules(self):
        """Load all rule sets from JSON files"""
        rules_dir = Path("/app/backend/clinical_rules")
        
        # Load emergency rules
        try:
            with open(rules_dir / "emergency_rules.json", 'r') as f:
                emergency_data = json.load(f)
                self.emergency_rules = emergency_data.get('rules', [])
                print(f"✅ Loaded {len(self.emergency_rules)} emergency rules")
        except Exception as e:
            print(f"❌ Error loading emergency rules: {e}")
        
        # Load toxicology rules
        try:
            with open(rules_dir / "toxicology_rules.json", 'r') as f:
                toxicology_data = json.load(f)
                self.toxicology_rules = toxicology_data.get('rules', [])
                print(f"✅ Loaded {len(self.toxicology_rules)} toxicology rules")
        except Exception as e:
            print(f"❌ Error loading toxicology rules: {e}")
        
        # Load general clinical rules
        try:
            with open(rules_dir / "general_clinical_rules.json", 'r') as f:
                general_data = json.load(f)
                self.general_rules = general_data.get('rules', [])
                print(f"✅ Loaded {len(self.general_rules)} general clinical rules")
        except Exception as e:
            print(f"❌ Error loading general clinical rules: {e}")
    
    def standardize_symptoms(self, user_symptoms: List[str]) -> List[str]:
        """Convert user symptom descriptions to standardized terms"""
        # Symptom mapping dictionary for normalization
        symptom_mappings = {
            # Cardiovascular
            "chest pain": "chest_pain",
            "chest discomfort": "chest_pain", 
            "chest tightness": "chest_pain",
            "shortness of breath": "shortness_of_breath",
            "breathless": "shortness_of_breath",
            "difficulty breathing": "shortness_of_breath",
            "palpitations": "palpitations",
            "heart racing": "palpitations",
            "sweating": "sweating",
            "diaphoresis": "sweating",
            
            # Neurological
            "headache": "headache",
            "head pain": "severe_headache",
            "severe headache": "severe_headache",
            "worst headache": "severe_headache",
            "confusion": "confusion",
            "altered mental status": "altered_consciousness",
            "dizziness": "dizziness",
            "weakness": "weakness",
            "neck stiffness": "neck_stiffness",
            "stiff neck": "neck_stiffness",
            "light sensitivity": "photophobia",
            "photophobia": "photophobia",
            
            # Gastrointestinal
            "nausea": "nausea",
            "vomiting": "vomiting",
            "abdominal pain": "abdominal_pain",
            "severe abdominal pain": "severe_abdominal_pain",
            "stomach pain": "abdominal_pain",
            "right upper quadrant pain": "right_upper_quadrant_pain",
            
            # Respiratory
            "cough": "cough",
            "wheezing": "wheezing",
            "respiratory depression": "respiratory_depression",
            "trouble breathing": "shortness_of_breath",
            
            # Constitutional
            "fever": "fever",
            "chills": "fever",
            "fatigue": "weakness",
            "malaise": "weakness",
            
            # Musculoskeletal  
            "back pain": "back_pain",
            "leg weakness": "leg_weakness",
            "muscle rigidity": "muscle_rigidity",
            
            # Toxicology specific
            "pinpoint pupils": "pinpoint_pupils",
            "excessive salivation": "excessive_salivation",
            "dry skin": "dry_skin",
            "flushed face": "flushed_face",
            "hyperthermia": "hyperthermia",
            "delirium": "delirium",
            "cyanosis": "cyanosis"
        }
        
        standardized = []
        for symptom in user_symptoms:
            symptom_lower = symptom.lower().strip()
            
            # Direct mapping
            if symptom_lower in symptom_mappings:
                standardized.append(symptom_mappings[symptom_lower])
            # Partial matching
            else:
                for key, value in symptom_mappings.items():
                    if key in symptom_lower or symptom_lower in key:
                        if value not in standardized:
                            standardized.append(value)
                        break
                else:
                    # Keep original if no mapping found
                    standardized.append(symptom_lower.replace(' ', '_'))
        
        return list(set(standardized))  # Remove duplicates
    
    def match_symptoms(self, user_symptoms: List[str], rules: List[Dict], 
                      min_matches: int = 2, user_context: Dict = None) -> List[Tuple[str, str, int, Dict]]:
        """
        Enhanced symptom matching with scoring and context consideration
        
        Args:
            user_symptoms: List of user-reported symptoms
            rules: List of clinical rules to match against
            min_matches: Minimum symptom matches required
            user_context: Additional context (age, gender, etc.)
        
        Returns:
            List of tuples: (rule_id, diagnosis, score, full_rule)
        """
        matches = []
        standardized_symptoms = self.standardize_symptoms(user_symptoms)
        
        print(f"🔍 Standardized symptoms: {standardized_symptoms}")
        
        for rule in rules:
            # Calculate base score from required symptoms
            required_symptoms = rule.get("symptoms", [])
            base_score = sum(1 for symptom in required_symptoms if symptom in standardized_symptoms)
            
            # Add bonus for optional symptoms
            optional_symptoms = rule.get("optional_symptoms", [])
            optional_score = sum(0.5 for symptom in optional_symptoms if symptom in standardized_symptoms)
            
            # Total score
            total_score = base_score + optional_score
            
            # Check minimum matches (focus on required symptoms)
            if base_score >= min_matches:
                # Apply context modifiers
                context_bonus = self.apply_context_modifiers(rule, user_context)
                final_score = total_score + context_bonus
                
                # Weight by clinical confidence
                confidence_weight = rule.get("confidence_weight", 50) / 100.0
                weighted_score = final_score * confidence_weight
                
                matches.append((
                    rule["rule_id"],
                    rule["provisional_diagnosis"], 
                    weighted_score,
                    rule
                ))
                
                print(f"✅ Rule {rule['rule_id']}: {rule['provisional_diagnosis']} - Score: {weighted_score:.1f}")
        
        # Sort by weighted score (highest first) and urgency
        matches.sort(key=lambda x: (
            1 if x[3].get("urgency") == "emergency" else 0,  # Emergency first
            x[2]  # Then by score
        ), reverse=True)
        
        return matches
    
    def apply_context_modifiers(self, rule: Dict, user_context: Dict) -> float:
        """Apply context-based scoring modifiers"""
        if not user_context:
            return 0
        
        bonus = 0
        modifiers = rule.get("modifiers", {})
        
        # Age-based modifiers
        age_risk = modifiers.get("age_risk")
        user_age = user_context.get("age", 0)
        
        if age_risk == ">40" and user_age > 40:
            bonus += 0.5
        elif age_risk == ">50" and user_age > 50:
            bonus += 0.5
        elif age_risk == ">65" and user_age > 65:
            bonus += 0.7
        
        # Gender-based modifiers
        gender_risk = modifiers.get("gender")
        if gender_risk and user_context.get("gender") == gender_risk:
            bonus += 0.3
        
        # Onset modifiers  
        onset = modifiers.get("onset")
        user_onset = user_context.get("onset", "").lower()
        if onset == "sudden" and "sudden" in user_onset:
            bonus += 0.8
        elif onset == "rapid" and any(term in user_onset for term in ["rapid", "quick", "fast"]):
            bonus += 0.5
        
        return bonus
    
    def evaluate_emergency_patterns(self, user_symptoms: List[str], 
                                   user_context: Dict = None) -> List[Dict[str, Any]]:
        """Evaluate symptoms against emergency rule patterns"""
        matches = self.match_symptoms(user_symptoms, self.emergency_rules, min_matches=2, user_context=user_context)
        
        results = []
        for rule_id, diagnosis, score, rule in matches:
            if score >= 1.5:  # Threshold for emergency consideration
                results.append({
                    "rule_id": rule_id,
                    "diagnosis": diagnosis,
                    "confidence_score": round(score, 1),
                    "urgency": rule["urgency"],
                    "recommendation": rule["recommendation"],
                    "clinical_notes": rule.get("clinical_notes", ""),
                    "icd10": rule.get("icd10", ""),
                    "matched_symptoms": [s for s in rule["symptoms"] if s in self.standardize_symptoms(user_symptoms)]
                })
        
        return results
    
    def evaluate_toxicology_patterns(self, user_symptoms: List[str], 
                                   user_context: Dict = None) -> List[Dict[str, Any]]:
        """Evaluate symptoms against toxicology/poisoning patterns"""
        matches = self.match_symptoms(user_symptoms, self.toxicology_rules, min_matches=2, user_context=user_context)
        
        results = []
        for rule_id, diagnosis, score, rule in matches:
            if score >= 1.2:  # Lower threshold for poisoning (often subtle early signs)
                # Check for context clues that boost confidence
                context_clues = rule.get("context_clues", [])
                context_match = any(
                    clue_keyword in user_context.get("history", "").lower() 
                    for clue_keyword in context_clues
                ) if user_context and user_context.get("history") else False
                
                if context_match:
                    score += 1.0  # Significant boost for context clues
                
                results.append({
                    "rule_id": rule_id,
                    "diagnosis": diagnosis,
                    "confidence_score": round(score, 1),
                    "urgency": rule["urgency"], 
                    "recommendation": rule["recommendation"],
                    "clinical_notes": rule.get("clinical_notes", ""),
                    "context_clues": context_clues,
                    "matched_symptoms": [s for s in rule["symptoms"] if s in self.standardize_symptoms(user_symptoms)]
                })
        
        return results
    
    def comprehensive_symptom_analysis(self, user_symptoms: List[str], 
                                     user_context: Dict = None) -> Dict[str, Any]:
        """
        Perform comprehensive analysis using all rule sets
        
        Returns prioritized results with emergency patterns first
        """
        results = {
            "emergency_patterns": [],
            "toxicology_patterns": [],
            "overall_urgency": "routine",
            "recommendations": [],
            "summary": ""
        }
        
        print(f"🔍 Analyzing symptoms: {user_symptoms}")
        
        # Evaluate emergency patterns first (highest priority)
        emergency_results = self.evaluate_emergency_patterns(user_symptoms, user_context)
        results["emergency_patterns"] = emergency_results
        
        # Evaluate toxicology patterns
        toxicology_results = self.evaluate_toxicology_patterns(user_symptoms, user_context)
        results["toxicology_patterns"] = toxicology_results
        
        # Determine overall urgency
        all_results = emergency_results + toxicology_results
        if any(r["urgency"] == "emergency" for r in all_results):
            results["overall_urgency"] = "emergency"
            results["recommendations"] = [r["recommendation"] for r in all_results if r["urgency"] == "emergency"]
        elif any(r["urgency"] == "high" for r in all_results):
            results["overall_urgency"] = "high" 
            results["recommendations"] = [r["recommendation"] for r in all_results if r["urgency"] in ["emergency", "high"]]
        elif toxicology_results:
            results["overall_urgency"] = "high"  # Poisoning always high priority
            results["recommendations"] = [r["recommendation"] for r in toxicology_results]
        
        # Generate summary
        if emergency_results:
            top_emergency = emergency_results[0]
            results["summary"] = f"⚠️ Emergency pattern detected: {top_emergency['diagnosis']} (confidence: {top_emergency['confidence_score']})"
        elif toxicology_results:
            top_toxicology = toxicology_results[0]
            results["summary"] = f"🧪 Possible poisoning: {top_toxicology['diagnosis']} (confidence: {top_toxicology['confidence_score']})"
        else:
            results["summary"] = "No emergency patterns detected. Consider routine evaluation."
        
        return results

# Global instance for import
general_symptom_engine = GeneralSymptomRuleEngine()