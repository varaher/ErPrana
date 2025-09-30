"""
Advanced Emergency Department Medical Knowledge System
Comprehensive medical knowledge base with adaptive learning capabilities
"""

from typing import Dict, List, Any, Optional, Tuple
import re
import json
from datetime import datetime, timezone

class EDMedicalKnowledge:
    """Emergency Department Medical Knowledge System with Learning Capabilities"""
    
    def __init__(self):
        self.knowledge_base = self._initialize_knowledge_base()
        self.triage_system = self._initialize_triage_system()
        self.learning_patterns = {}  # Store successful response patterns
        
    def _initialize_knowledge_base(self) -> Dict[str, Any]:
        """Initialize comprehensive ED medical knowledge"""
        return {
            "fever": {
                "follow_up_questions": [
                    "What's your maximum temperature and when did it start?",
                    "Any localizing symptoms: cough, SOB, dysuria, flank pain, abdominal pain, rash, headache, neck stiffness?",
                    "Recent travel, animal exposure, sick contacts, unusual food/water?",
                    "Any immunocompromising conditions, recent procedures, or new medications?"
                ],
                "red_flags": [
                    "hypotension", "altered mental status", "lactate elevation", "new oxygen requirement",
                    "respiratory distress", "petechiae", "purpura", "neck stiffness with AMS",
                    "severe focal pain with crepitus", "neutropenia", "pregnancy with abdominal pain"
                ],
                "provisional_diagnoses": {
                    "fever + cough/SOB": ["Community-acquired pneumonia", "Influenza", "COVID-19", "Pulmonary embolism", "CHF", "ARDS"],
                    "fever + dysuria/flank_pain": ["Pyelonephritis", "Obstructive uropathy with stone"],
                    "fever + RUQ_pain/jaundice": ["Cholecystitis", "Cholangitis"],
                    "fever + headache/neck_stiffness": ["Meningitis", "Encephalitis"],
                    "fever + new_murmur/joint_pain": ["Endocarditis"],
                    "fever + abdominal_pain/diarrhea": ["Gastroenteritis", "Colitis", "Appendicitis", "Typhoid"]
                },
                "investigations": {
                    "bedside": ["Vitals trend", "POC glucose", "PoCUS lungs/IVC/gallbladder/kidneys", "rash and meningeal exam"],
                    "labs": ["CBC with diff", "CMP", "lactate", "blood cultures x2", "UA & culture", "pregnancy test"],
                    "imaging": ["CXR if respiratory symptoms", "RUQ US if RUQ pain/jaundice", "CT A/P if severe abdominal pain"]
                },
                "triage": {
                    "RED": ["Septic shock features", "meningitis suspicion", "febrile neutropenia", "purpura fulminans"],
                    "ORANGE": ["Possible sepsis without shock", "high fever with focal severe pain", "immunocompromised fever"],
                    "YELLOW": ["Moderate fever with stable vitals and localizing symptoms"],
                    "GREEN": ["Low-grade viral syndrome", "stable with reliable follow-up"]
                }
            },
            
            "chest_pain": {
                "follow_up_questions": [
                    "Onset: sudden vs gradual? Character: pressure/tearing/pleuritic?",
                    "Radiation to jaw, arm, or back? Triggers or exertion-related?",
                    "Duration and what relieves it: rest, leaning forward, antacids?",
                    "Associated symptoms: SOB, diaphoresis, syncope, hemoptysis?",
                    "Risk factors: CAD history, HTN, pregnancy, cocaine use?"
                ],
                "red_flags": [
                    "hemodynamic instability", "syncope", "new neurologic deficit", 
                    "severe ripping pain", "hypoxia", "ST-elevation", "Wellen's pattern",
                    "widened mediastinum", "tamponade signs"
                ],
                "provisional_diagnoses": {
                    "cardiac": ["Acute coronary syndrome", "Myocardial infarction", "Pericarditis", "Myopericarditis", "Cardiac tamponade"],
                    "vascular": ["Aortic dissection", "Pulmonary embolism"],
                    "pulmonary": ["Pneumothorax", "Tension pneumothorax"],
                    "other": ["Esophageal rupture", "GERD", "Musculoskeletal"]
                },
                "investigations": {
                    "immediate": ["ECG repeat q15-30min", "serial troponin", "CXR", "POCUS cardiac/aortic/lung"],
                    "conditional": ["D-dimer if low-intermediate PE probability", "CTA chest for PE/dissection", "Echo if tamponade"],
                    "risk_tools": ["HEART score for disposition", "Wells + PERC for PE pathway"]
                },
                "triage": {
                    "RED": ["STEMI", "shock", "persistent severe hypoxia", "tamponade", "unstable dissection"],
                    "ORANGE": ["NSTEMI/ongoing ischemia", "high-probability PE stable", "stable dissection"],
                    "YELLOW": ["Low-intermediate risk needing serial monitoring"],
                    "GREEN": ["Reproducible chest wall pain", "normal ECG", "low risk after screening"]
                }
            },
            
            "shortness_of_breath": {
                "follow_up_questions": [
                    "Onset and tempo? Positional: orthopnea, PND?",
                    "Wheeze or stridor? Cough, sputum production, fever?",
                    "Pleuritic pain or hemoptysis? Leg swelling?",
                    "Recent immobilization, surgery, or travel?",
                    "Inhalational or toxin exposure?"
                ],
                "red_flags": [
                    "accessory muscle use", "SpO2 <90% on room air", "altered mental status",
                    "silent chest", "impending fatigue", "hypotension"
                ],
                "provisional_diagnoses": [
                    "Asthma/COPD exacerbation", "Pneumonia", "Pulmonary embolism", 
                    "Acute cardiogenic pulmonary edema", "Pneumothorax/tension", 
                    "ARDS", "Upper airway obstruction"
                ],
                "investigations": {
                    "bedside": ["SpO2", "ABG/VBG if severe", "POCUS BLUE-pattern", "ECG"],
                    "labs": ["CBC", "BMP", "troponin/BNP if CHF", "D-dimer per probability", "cultures if septic"],
                    "imaging": ["CXR", "CT pulmonary angiography if PE", "US thorax", "Echo for LV failure"]
                },
                "triage": {
                    "RED": ["Tension pneumothorax", "status asthmaticus", "severe hypoxemia", "impending arrest"],
                    "ORANGE": ["Moderate respiratory distress", "pneumonia with hypoxia", "suspected PE/CHF stable"],
                    "YELLOW": ["Mild-moderate SOB needing treatment"],
                    "GREEN": ["Mild SOB with clear benign cause and normal vitals"]
                }
            },
            
            "abdominal_pain": {
                "follow_up_questions": [
                    "Location: RUQ/RLQ/epigastric/suprapubic/diffuse?",
                    "Onset: colicky vs constant, sudden 'tearing'?",
                    "Radiation to back, shoulder, or groin?",
                    "Vomiting, diarrhea, constipation? Last BM/flatus?",
                    "GI bleed: melena, hematochezia, hematemesis?",
                    "Urinary symptoms? LMP/pregnancy? Prior surgeries?"
                ],
                "red_flags": [
                    "shock", "peritonitis/rigidity", "GI hemorrhage with instability",
                    "severe sudden pain (AAA/mesenteric ischemia)", "pregnancy with pain/bleeding"
                ],
                "provisional_diagnoses": {
                    "RLQ": ["Appendicitis (use Alvarado score)"],
                    "RUQ": ["Cholecystitis", "Cholangitis"],
                    "epigastric_to_back": ["Pancreatitis (lipase; BISAP/Ranson)", "Perforated ulcer"],
                    "diffuse_colicky": ["Small bowel obstruction"],
                    "upper_gi_bleed": ["PUD", "Varices", "Mallory-Weiss tear"],
                    "systemic": ["AAA in older/smoker with back/abdominal pain"]
                },
                "investigations": {
                    "bedside": ["FAST if unstable", "RUQ US", "Aortic US for AAA", "Pelvic US & β-hCG"],
                    "labs": ["CBC", "CMP", "lipase", "lactate", "type & screen if bleeding", "UA", "β-hCG"],
                    "imaging": ["CXR for free air", "CT A/P with contrast", "Endoscopy for UGIB"]
                },
                "triage": {
                    "RED": ["Hemodynamic instability", "peritonitis", "AAA suspicion", "massive GI bleed"],
                    "ORANGE": ["Moderate dehydration", "suspected appendicitis/cholecystitis stable", "upper GI bleed stable"],
                    "YELLOW": ["Localized pain needing imaging/observation"],
                    "GREEN": ["Benign abdominal pain with reassuring exam"]
                }
            },
            
            "headache": {
                "follow_up_questions": [
                    "Thunderclap onset? Worst headache ever? Onset-to-peak seconds?",
                    "Triggers: exertion, sexual activity? Neck stiffness, fever?",
                    "Focal deficits, visual changes? Jaw claudication?",
                    "Carbon monoxide exposure? Pregnancy/postpartum?",
                    "Anticoagulants or recent trauma?"
                ],
                "red_flags": [
                    "thunderclap", "neurologic deficit/AMS", "papilledema", 
                    "fever with meningeal signs", "pregnancy/puerperium", 
                    "cancer/HIV", "anticoagulation/trauma"
                ],
                "provisional_diagnoses": [
                    "Subarachnoid hemorrhage", "Intracerebral hemorrhage", 
                    "Meningitis/encephalitis", "Cerebral venous thrombosis",
                    "Temporal arteritis", "Acute angle-closure glaucoma",
                    "Primary headaches (migraine, tension, cluster)"
                ],
                "investigations": {
                    "immediate": ["POC glucose", "Neuro exam + NIHSS if deficits"],
                    "imaging": ["Non-contrast head CT ± CTA head/neck", "LP if SAH suspected with negative CT"],
                    "labs": ["CBC", "BMP", "Blood cultures if meningitis suspected"]
                },
                "triage": {
                    "RED": ["Suspected SAH/meningitis/ICH", "focal deficits with sudden onset"],
                    "ORANGE": ["Severe intractable pain with systemic symptoms", "new neuro findings stable"],
                    "YELLOW": ["Typical migraine/tension requiring ED therapy"],
                    "GREEN": ["Known benign pattern", "improved with simple therapy", "normal exam"]
                }
            }
        }
    
    def _initialize_triage_system(self) -> Dict[str, Any]:
        """Initialize color-coded triage system"""
        return {
            "RED": {
                "description": "Life-threat, resuscitation NOW",
                "time_target": "Immediate",
                "universal_actions": [
                    "Monitor", "IV/IO access", "O₂ as needed", "POC glucose",
                    "12-lead ECG if cardiopulmonary/AMS", "PoCUS when helpful",
                    "Pregnancy test in childbearing potential", "Analgesia/antipyretic as appropriate"
                ]
            },
            "ORANGE": {
                "description": "Very Urgent: High risk; start treatment ≤10 min",
                "time_target": "≤10 minutes",
                "universal_actions": ["Same as RED with monitoring"]
            },
            "YELLOW": {
                "description": "Urgent: Significant illness; start ≤60 min",
                "time_target": "≤60 minutes",
                "universal_actions": ["Standard monitoring and assessment"]
            },
            "GREEN": {
                "description": "Standard: Minor/stable; start ≤240 min",
                "time_target": "≤240 minutes",
                "universal_actions": ["Routine monitoring"]
            }
        }
    
    def analyze_symptoms(self, user_input: str, user_context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Analyze symptoms using comprehensive medical knowledge"""
        user_input_lower = user_input.lower()
        
        # Identify primary symptom category
        symptom_category = self._identify_symptom_category(user_input_lower)
        
        if not symptom_category:
            return self._general_medical_response(user_input, user_context)
        
        # Get relevant knowledge for the symptom
        knowledge = self.knowledge_base.get(symptom_category, {})
        
        # Assess triage level based on red flags
        triage_level = self._assess_triage_level(user_input_lower, knowledge)
        
        # Generate follow-up questions
        follow_up_questions = self._select_follow_up_questions(user_input_lower, knowledge)
        
        # Get provisional diagnoses
        provisional_diagnoses = self._get_provisional_diagnoses(user_input_lower, knowledge)
        
        # Recommend investigations
        investigations = self._recommend_investigations(knowledge, triage_level)
        
        # Generate comprehensive response
        return {
            "primary_symptom": symptom_category,
            "triage_level": triage_level,
            "triage_description": self.triage_system[triage_level]["description"],
            "time_target": self.triage_system[triage_level]["time_target"],
            "follow_up_questions": follow_up_questions,
            "provisional_diagnoses": provisional_diagnoses,
            "recommended_investigations": investigations,
            "universal_actions": self.triage_system[triage_level]["universal_actions"],
            "emergency_detected": triage_level in ["RED", "ORANGE"],
            "requires_immediate_care": triage_level == "RED"
        }
    
    def _identify_symptom_category(self, user_input: str) -> str:
        """Identify the primary symptom category"""
        symptom_patterns = {
            "fever": ["fever", "temperature", "hot", "chills", "rigors", "night sweats"],
            "chest_pain": ["chest pain", "chest hurt", "heart pain", "chest pressure", "chest tightness"],
            "shortness_of_breath": ["shortness of breath", "short of breath", "difficulty breathing", "can't breathe", "breathing problems", "dyspnea"],
            "abdominal_pain": ["stomach pain", "abdominal pain", "belly pain", "stomach ache", "abdominal cramps"],
            "headache": ["headache", "head pain", "migraine", "head hurts", "skull pain"]
        }
        
        for category, patterns in symptom_patterns.items():
            if any(pattern in user_input for pattern in patterns):
                return category
        
        return None
    
    def _assess_triage_level(self, user_input: str, knowledge: Dict[str, Any]) -> str:
        """Assess triage level based on red flags and severity indicators"""
        red_flags = knowledge.get("red_flags", [])
        
        # Check for RED flag keywords
        for flag in red_flags:
            if flag.lower() in user_input:
                return "RED"
        
        # Check for severity indicators
        severe_indicators = ["severe", "worst ever", "crushing", "sudden", "can't breathe", "unbearable"]
        moderate_indicators = ["moderate", "significant", "concerning", "worsening"]
        
        if any(indicator in user_input for indicator in severe_indicators):
            return "ORANGE"
        elif any(indicator in user_input for indicator in moderate_indicators):
            return "YELLOW"
        
        return "GREEN"
    
    def _select_follow_up_questions(self, user_input: str, knowledge: Dict[str, Any]) -> List[str]:
        """Select appropriate follow-up questions based on symptom"""
        questions = knowledge.get("follow_up_questions", [])
        
        # Return first 2-3 most relevant questions
        return questions[:3]
    
    def _get_provisional_diagnoses(self, user_input: str, knowledge: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get provisional diagnoses based on symptom patterns"""
        diagnoses_data = knowledge.get("provisional_diagnoses", {})
        
        if isinstance(diagnoses_data, dict):
            # Find matching pattern
            for pattern, diagnoses in diagnoses_data.items():
                if self._matches_pattern(user_input, pattern):
                    return [{"diagnosis": dx, "likelihood": "Consider based on presentation"} for dx in diagnoses[:3]]
            
            # Default to first category if no specific match
            first_category = list(diagnoses_data.values())[0] if diagnoses_data else []
            return [{"diagnosis": dx, "likelihood": "Consider based on presentation"} for dx in first_category[:3]]
        
        elif isinstance(diagnoses_data, list):
            return [{"diagnosis": dx, "likelihood": "Consider based on presentation"} for dx in diagnoses_data[:3]]
        
        return []
    
    def _matches_pattern(self, user_input: str, pattern: str) -> bool:
        """Check if user input matches a diagnostic pattern"""
        pattern_keywords = pattern.replace("_", " ").split("/")
        
        for keyword_group in pattern_keywords:
            keywords = keyword_group.strip().split()
            if all(keyword in user_input for keyword in keywords):
                return True
        
        return False
    
    def _recommend_investigations(self, knowledge: Dict[str, Any], triage_level: str) -> Dict[str, List[str]]:
        """Recommend investigations based on symptom and triage level"""
        investigations = knowledge.get("investigations", {})
        
        if triage_level in ["RED", "ORANGE"]:
            # Include all investigations for high-acuity patients
            return investigations
        elif triage_level == "YELLOW":
            # Focus on essential investigations
            return {
                "bedside": investigations.get("bedside", [])[:2],
                "labs": investigations.get("labs", [])[:3],
                "imaging": investigations.get("imaging", [])[:1]
            }
        else:  # GREEN
            # Minimal investigations
            return {
                "bedside": investigations.get("bedside", [])[:1],
                "labs": ["Basic metabolic panel as indicated"],
                "imaging": ["As clinically indicated"]
            }
    
    def _general_medical_response(self, user_input: str, user_context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate general medical response for unspecified symptoms"""
        return {
            "primary_symptom": "general_medical_query",
            "triage_level": "YELLOW",
            "triage_description": "General medical assessment needed",
            "time_target": "≤60 minutes",
            "follow_up_questions": [
                "Can you describe your main symptoms?",
                "When did these symptoms start?",
                "What makes them better or worse?"
            ],
            "provisional_diagnoses": [
                {"diagnosis": "Requires further assessment", "likelihood": "Based on additional history"}
            ],
            "recommended_investigations": {
                "bedside": ["Vital signs", "Focused physical examination"],
                "labs": ["As clinically indicated"],
                "imaging": ["As clinically indicated"]
            },
            "universal_actions": ["Standard medical assessment"],
            "emergency_detected": False,
            "requires_immediate_care": False
        }
    
    def store_successful_pattern(self, user_input: str, response: Dict[str, Any], satisfaction_score: int):
        """Store successful response patterns for learning"""
        if satisfaction_score >= 4:  # Store patterns with high satisfaction
            pattern_key = self._generate_pattern_key(user_input)
            
            if pattern_key not in self.learning_patterns:
                self.learning_patterns[pattern_key] = {
                    "successful_responses": [],
                    "satisfaction_scores": [],
                    "usage_count": 0
                }
            
            self.learning_patterns[pattern_key]["successful_responses"].append(response)
            self.learning_patterns[pattern_key]["satisfaction_scores"].append(satisfaction_score)
            self.learning_patterns[pattern_key]["usage_count"] += 1
    
    def _generate_pattern_key(self, user_input: str) -> str:
        """Generate a pattern key for learning storage"""
        # Extract key medical terms and create a normalized pattern
        medical_terms = []
        symptom_keywords = ["pain", "fever", "headache", "nausea", "dizzy", "shortness", "breathing", "chest", "stomach", "back"]
        
        user_lower = user_input.lower()
        for term in symptom_keywords:
            if term in user_lower:
                medical_terms.append(term)
        
        return "_".join(sorted(medical_terms)) if medical_terms else "general_query"
    
    def get_learning_insights(self) -> Dict[str, Any]:
        """Get insights from the learning system"""
        total_patterns = len(self.learning_patterns)
        most_common_patterns = sorted(
            self.learning_patterns.items(),
            key=lambda x: x[1]["usage_count"],
            reverse=True
        )[:5]
        
        avg_satisfaction = 0
        total_responses = 0
        for pattern_data in self.learning_patterns.values():
            scores = pattern_data["satisfaction_scores"]
            total_responses += len(scores)
            avg_satisfaction += sum(scores)
        
        avg_satisfaction = avg_satisfaction / total_responses if total_responses > 0 else 0
        
        return {
            "total_learned_patterns": total_patterns,
            "total_responses_evaluated": total_responses,
            "average_satisfaction": round(avg_satisfaction, 2),
            "most_common_patterns": [
                {"pattern": pattern, "usage_count": data["usage_count"]}
                for pattern, data in most_common_patterns
            ]
        }