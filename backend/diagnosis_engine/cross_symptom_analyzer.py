from typing import Dict, List, Any, Optional
import json
from datetime import datetime

class CrossSymptomAnalyzer:
    """
    Analyzes symptoms across different complaint categories to provide 
    comprehensive provisional diagnoses with interconnected symptom patterns
    """
    
    def __init__(self):
        self.diagnostic_knowledge_base = self._load_diagnostic_knowledge()
    
    def _load_diagnostic_knowledge(self) -> Dict[str, Any]:
        """Load comprehensive diagnostic knowledge base"""
        return {
            "conditions": {
                "sepsis": {
                    "name": "Sepsis",
                    "icd10": "A41.9",
                    "priority": "EMERGENCY",
                    "required_symptoms": ["fever"],
                    "supporting_symptoms": ["confusion", "hypotension", "tachycardia", "altered_mental_status"],
                    "red_flags": ["confusion", "severe_hypotension", "organ_dysfunction"],
                    "score_weight": 95,
                    "description": "Life-threatening systemic inflammatory response to infection"
                },
                "meningitis": {
                    "name": "Bacterial Meningitis",
                    "icd10": "G00.9",
                    "priority": "EMERGENCY",
                    "required_symptoms": ["fever"],
                    "supporting_symptoms": ["severe_headache", "stiff_neck", "photophobia", "nausea", "vomiting"],
                    "red_flags": ["stiff_neck", "altered_mental_status", "petechial_rash"],
                    "score_weight": 90,
                    "description": "Bacterial infection of brain and spinal cord membranes"
                },
                "pneumonia": {
                    "name": "Pneumonia",
                    "icd10": "J18.9",
                    "priority": "URGENT",
                    "required_symptoms": ["fever"],
                    "supporting_symptoms": ["cough", "shortness_of_breath", "chest_pain", "sputum_production"],
                    "age_modifiers": {"older_65_plus": 1.3, "infant_lt_3m": 1.4},
                    "score_weight": 75,
                    "description": "Infection of the lungs causing inflammation of air sacs"
                },
                "uti_pyelonephritis": {
                    "name": "Urinary Tract Infection/Pyelonephritis",
                    "icd10": "N39.0",
                    "priority": "URGENT",
                    "required_symptoms": ["fever"],
                    "supporting_symptoms": ["burning_urination", "frequency", "urgency", "flank_pain", "suprapubic_pain"],
                    "gender_modifiers": {"female": 1.2},
                    "score_weight": 70,
                    "description": "Bacterial infection of urinary tract or kidneys"
                },
                "gastroenteritis": {
                    "name": "Gastroenteritis",
                    "icd10": "K59.1",
                    "priority": "ROUTINE",
                    "required_symptoms": ["fever"],
                    "supporting_symptoms": ["nausea", "vomiting", "diarrhea", "abdominal_pain", "cramping"],
                    "score_weight": 60,
                    "description": "Inflammation of stomach and intestines, usually infectious"
                },
                "influenza": {
                    "name": "Influenza",
                    "icd10": "J11.1",
                    "priority": "ROUTINE",
                    "required_symptoms": ["fever"],
                    "supporting_symptoms": ["myalgia", "headache", "fatigue", "cough", "sore_throat"],
                    "seasonal_modifiers": {"winter": 1.3, "fall": 1.2},
                    "score_weight": 55,
                    "description": "Viral infection affecting respiratory system with systemic symptoms"
                },
                "covid19": {
                    "name": "COVID-19",
                    "icd10": "U07.1",
                    "priority": "URGENT",
                    "required_symptoms": ["fever"],
                    "supporting_symptoms": ["cough", "shortness_of_breath", "loss_of_taste", "loss_of_smell", "fatigue"],
                    "red_flags": ["severe_shortness_of_breath", "chest_pain", "confusion"],
                    "score_weight": 65,
                    "description": "COVID-19 viral infection with respiratory and systemic manifestations"
                },
                "appendicitis": {
                    "name": "Acute Appendicitis",
                    "icd10": "K35.9",
                    "priority": "EMERGENCY",
                    "required_symptoms": ["abdominal_pain"],
                    "supporting_symptoms": ["fever", "nausea", "vomiting", "right_lower_quadrant_pain"],
                    "red_flags": ["rebound_tenderness", "guarding", "mcburneys_point"],
                    "score_weight": 85,
                    "description": "Inflammation of the appendix requiring surgical intervention"
                },
                "ectopic_pregnancy": {
                    "name": "Ectopic Pregnancy",
                    "icd10": "O00.9",
                    "priority": "EMERGENCY",
                    "required_symptoms": ["abdominal_pain"],
                    "supporting_symptoms": ["vaginal_bleeding", "amenorrhea", "shoulder_pain"],
                    "gender_restrictions": ["female"],
                    "red_flags": ["hemodynamic_instability", "severe_abdominal_pain"],
                    "score_weight": 90,
                    "description": "Pregnancy implanted outside uterus, potentially life-threatening"
                },
                "myocardial_infarction": {
                    "name": "Acute Myocardial Infarction",
                    "icd10": "I21.9",
                    "priority": "EMERGENCY",
                    "required_symptoms": ["chest_pain"],
                    "supporting_symptoms": ["shortness_of_breath", "diaphoresis", "nausea", "left_arm_pain"],
                    "red_flags": ["severe_chest_pain", "hemodynamic_instability"],
                    "age_modifiers": {"older_65_plus": 1.4, "adult_18_64": 1.0},
                    "gender_modifiers": {"male": 1.2},
                    "score_weight": 95,
                    "description": "Heart attack due to blocked coronary artery"
                },
                "pulmonary_embolism": {
                    "name": "Pulmonary Embolism",
                    "icd10": "I26.9",
                    "priority": "EMERGENCY",
                    "required_symptoms": ["shortness_of_breath"],
                    "supporting_symptoms": ["chest_pain", "cough", "hemoptysis", "leg_swelling"],
                    "red_flags": ["severe_shortness_of_breath", "hypoxia", "hemodynamic_instability"],
                    "score_weight": 85,
                    "description": "Blood clot in lung arteries, potentially fatal"
                }
            },
            
            "symptom_mappings": {
                # Map various user expressions to standardized symptoms
                "fever": ["fever", "high temperature", "temp", "hot", "chills", "feverish"],
                "chest_pain": ["chest pain", "chest discomfort", "chest tightness", "chest pressure"],
                "shortness_of_breath": ["shortness of breath", "breathless", "difficulty breathing", "can't breathe"],
                "abdominal_pain": ["abdominal pain", "stomach pain", "belly pain", "tummy pain"],
                "nausea": ["nausea", "nauseous", "sick to stomach", "queasy"],
                "vomiting": ["vomiting", "throwing up", "puking", "being sick"],
                "diarrhea": ["diarrhea", "loose stools", "watery stools", "runs"],
                "cough": ["cough", "coughing", "hacking"],
                "headache": ["headache", "head pain", "migraine"],
                "confusion": ["confusion", "confused", "disoriented", "altered mental status"],
                "stiff_neck": ["stiff neck", "neck stiffness", "neck rigidity"]
            },
            
            "risk_factors": {
                "age_high_risk": {
                    "conditions": ["sepsis", "pneumonia", "meningitis"],
                    "groups": ["older_65_plus", "infant_lt_3m"],
                    "multiplier": 1.3
                },
                "immunocompromised": {
                    "conditions": ["sepsis", "pneumonia", "opportunistic_infections"],
                    "factors": ["cancer_chemo", "hiv", "transplant", "steroids"],
                    "multiplier": 1.5
                },
                "pregnancy": {
                    "conditions": ["ectopic_pregnancy", "preeclampsia", "uti"],
                    "multiplier": 1.2
                }
            }
        }
    
    def standardize_symptoms(self, raw_symptoms: List[str]) -> List[str]:
        """Convert raw symptom descriptions to standardized terms"""
        standardized = []
        
        for raw_symptom in raw_symptoms:
            raw_lower = raw_symptom.lower()
            
            for standard_symptom, variations in self.diagnostic_knowledge_base["symptom_mappings"].items():
                if any(variation in raw_lower for variation in variations):
                    if standard_symptom not in standardized:
                        standardized.append(standard_symptom)
        
        return standardized
    
    def calculate_diagnostic_score(self, condition_key: str, patient_symptoms: List[str], 
                                 patient_demographics: Dict[str, Any]) -> float:
        """Calculate diagnostic probability score for a condition"""
        condition = self.diagnostic_knowledge_base["conditions"][condition_key]
        
        base_score = 0
        
        # Check required symptoms
        required_met = all(req in patient_symptoms for req in condition["required_symptoms"])
        if not required_met:
            return 0  # Cannot have this condition without required symptoms
        
        base_score = condition["score_weight"]
        
        # Add points for supporting symptoms
        supporting_count = sum(1 for symptom in condition.get("supporting_symptoms", []) 
                             if symptom in patient_symptoms)
        
        if supporting_count > 0:
            # Each supporting symptom adds percentage based on total possible
            total_supporting = len(condition.get("supporting_symptoms", []))
            support_bonus = (supporting_count / total_supporting) * 30  # Max 30% bonus
            base_score += support_bonus
        
        # Check red flags (high priority indicators)
        red_flag_count = sum(1 for flag in condition.get("red_flags", []) 
                           if flag in patient_symptoms)
        
        if red_flag_count > 0:
            base_score += red_flag_count * 15  # Each red flag adds 15%
        
        # Apply demographic modifiers
        age_group = patient_demographics.get("age_group")
        if age_group and "age_modifiers" in condition:
            multiplier = condition["age_modifiers"].get(age_group, 1.0)
            base_score *= multiplier
        
        gender = patient_demographics.get("gender")
        if gender and "gender_modifiers" in condition:
            multiplier = condition["gender_modifiers"].get(gender, 1.0)
            base_score *= multiplier
        
        # Check gender restrictions
        if "gender_restrictions" in condition:
            if gender not in condition["gender_restrictions"]:
                return 0  # Condition impossible for this gender
        
        # Apply risk factor modifiers
        for risk_key, risk_data in self.diagnostic_knowledge_base["risk_factors"].items():
            if condition_key in risk_data["conditions"]:
                if any(factor in patient_demographics.get("comorbidities", []) 
                       for factor in risk_data.get("factors", [])):
                    base_score *= risk_data["multiplier"]
                
                if age_group in risk_data.get("groups", []):
                    base_score *= risk_data["multiplier"]
        
        # Cap at 99% (never 100% certain without diagnostics)
        return min(base_score, 99)
    
    def generate_comprehensive_diagnoses(self, all_symptoms: Dict[str, Any], 
                                       demographics: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate comprehensive differential diagnoses considering all symptoms"""
        
        # Extract and standardize symptoms from all complaint categories
        collected_symptoms = []
        
        # From fever interview
        if "fever" in all_symptoms:
            fever_data = all_symptoms["fever"]
            if fever_data.get("confirm_fever"):
                collected_symptoms.append("fever")
            
            # Add respiratory symptoms
            resp_symptoms = fever_data.get("resp_symptoms", [])
            if isinstance(resp_symptoms, list):
                for symptom in resp_symptoms:
                    if symptom != "none":
                        collected_symptoms.append(symptom.replace("_", " "))
            
            # Add GI symptoms
            gi_symptoms = fever_data.get("gi_symptoms", [])
            if isinstance(gi_symptoms, list):
                for symptom in gi_symptoms:
                    if symptom != "none":
                        collected_symptoms.append(symptom.replace("_", " "))
            
            # Add neurological symptoms
            neuro_symptoms = fever_data.get("neuro_symptoms", [])
            if isinstance(neuro_symptoms, list):
                for symptom in neuro_symptoms:
                    if symptom != "none":
                        collected_symptoms.append(symptom.replace("_", " "))
            
            # Add other symptoms
            if fever_data.get("rash") == "yes":
                collected_symptoms.append("rash")
            
            urinary_symptoms = fever_data.get("urinary_symptoms", [])
            if isinstance(urinary_symptoms, list):
                for symptom in urinary_symptoms:
                    if symptom != "none":
                        collected_symptoms.append(symptom.replace("_", " "))
        
        # From other complaint interviews (to be added as more scripts are implemented)
        # if "abdominal_pain" in all_symptoms: ...
        # if "chest_pain" in all_symptoms: ...
        
        # Standardize symptoms
        standardized_symptoms = self.standardize_symptoms(collected_symptoms)
        
        # Calculate diagnostic scores for all conditions
        diagnostic_results = []
        
        for condition_key, condition_data in self.diagnostic_knowledge_base["conditions"].items():
            score = self.calculate_diagnostic_score(condition_key, standardized_symptoms, demographics)
            
            if score > 0:  # Only include conditions with non-zero probability
                diagnostic_results.append({
                    "name": condition_data["name"],
                    "probability": round(score, 1),
                    "priority": condition_data["priority"],
                    "icd10": condition_data["icd10"],
                    "description": condition_data["description"],
                    "reasoning": self._generate_reasoning(condition_data, standardized_symptoms, demographics),
                    "next_steps": self._get_next_steps(condition_data["priority"], score)
                })
        
        # Sort by probability (descending) and return top 5
        diagnostic_results.sort(key=lambda x: x["probability"], reverse=True)
        return diagnostic_results[:5]
    
    def _generate_reasoning(self, condition: Dict[str, Any], symptoms: List[str], 
                          demographics: Dict[str, Any]) -> str:
        """Generate reasoning for why this diagnosis is considered"""
        reasons = []
        
        # Required symptoms
        met_required = [req for req in condition["required_symptoms"] if req in symptoms]
        if met_required:
            reasons.append(f"Meets required criteria: {', '.join(met_required)}")
        
        # Supporting symptoms
        met_supporting = [sup for sup in condition.get("supporting_symptoms", []) if sup in symptoms]
        if met_supporting:
            reasons.append(f"Supporting symptoms present: {', '.join(met_supporting[:3])}")
        
        # Red flags
        met_red_flags = [flag for flag in condition.get("red_flags", []) if flag in symptoms]
        if met_red_flags:
            reasons.append(f"⚠️ Red flags present: {', '.join(met_red_flags)}")
        
        # Demographics
        age_group = demographics.get("age_group")
        if age_group and "age_modifiers" in condition:
            if condition["age_modifiers"].get(age_group, 1.0) > 1.0:
                reasons.append(f"Higher risk due to age group")
        
        return "; ".join(reasons) if reasons else "Based on symptom pattern"
    
    def _get_next_steps(self, priority: str, score: float) -> str:
        """Get appropriate next steps based on priority and score"""
        if priority == "EMERGENCY":
            return "🚨 Seek immediate emergency care - call 911 or go to ER now"
        elif priority == "URGENT":
            if score >= 70:
                return "⚠️ Seek urgent medical evaluation within 2-4 hours"
            else:
                return "📞 Contact healthcare provider today for evaluation"
        else:
            return "📋 Monitor symptoms and consider routine medical evaluation if worsening"
    
    def get_interconnected_analysis(self, interview_data: Dict[str, Dict[str, Any]], 
                                  demographics: Dict[str, Any]) -> Dict[str, Any]:
        """Perform comprehensive analysis across all completed interviews"""
        
        # Generate comprehensive diagnoses
        diagnoses = self.generate_comprehensive_diagnoses(interview_data, demographics)
        
        # Determine overall triage level
        highest_priority = "ROUTINE"
        highest_score = 0
        
        for diagnosis in diagnoses:
            if diagnosis["priority"] == "EMERGENCY" and diagnosis["probability"] >= 50:
                highest_priority = "EMERGENCY"
                highest_score = max(highest_score, diagnosis["probability"])
            elif diagnosis["priority"] == "URGENT" and diagnosis["probability"] >= 60:
                if highest_priority != "EMERGENCY":
                    highest_priority = "URGENT"
                highest_score = max(highest_score, diagnosis["probability"])
        
        # Generate summary
        summary = self._generate_comprehensive_summary(interview_data, diagnoses, highest_priority)
        
        return {
            "comprehensive_diagnoses": diagnoses,
            "overall_triage": highest_priority,
            "confidence_score": highest_score,
            "clinical_summary": summary,
            "interconnected_findings": self._find_symptom_connections(interview_data)
        }
    
    def _generate_comprehensive_summary(self, interview_data: Dict[str, Any], 
                                      diagnoses: List[Dict[str, Any]], 
                                      triage: str) -> str:
        """Generate comprehensive clinical summary"""
        summary_parts = []
        
        # Main complaint and duration
        if "fever" in interview_data:
            fever_data = interview_data["fever"]
            duration = fever_data.get("duration_days", "unknown")
            temp = fever_data.get("max_temp_f", "unknown")
            summary_parts.append(f"Patient with fever for {duration} days, max temperature {temp}°F")
        
        # Associated symptoms summary
        all_symptoms = []
        for complaint, data in interview_data.items():
            for key, value in data.items():
                if "symptoms" in key and isinstance(value, list) and value != ["none"]:
                    all_symptoms.extend(value)
        
        if all_symptoms:
            summary_parts.append(f"Associated symptoms: {', '.join(set(all_symptoms))}")
        
        # Top diagnoses
        if diagnoses:
            top_diagnosis = diagnoses[0]
            summary_parts.append(f"Most likely: {top_diagnosis['name']} ({top_diagnosis['probability']}%)")
        
        summary_parts.append(f"Overall triage: {triage}")
        
        return ". ".join(summary_parts)
    
    def _find_symptom_connections(self, interview_data: Dict[str, Any]) -> List[str]:
        """Find connections between symptoms across different complaint categories"""
        connections = []
        
        # This would analyze patterns like:
        # - Fever + respiratory symptoms → respiratory infection
        # - Fever + urinary symptoms → UTI
        # - Abdominal pain + fever → intra-abdominal infection
        
        if "fever" in interview_data:
            fever_data = interview_data["fever"]
            
            # Respiratory connection
            resp_symptoms = fever_data.get("resp_symptoms", [])
            if resp_symptoms and "none" not in resp_symptoms:
                connections.append("Fever with respiratory symptoms suggests respiratory tract infection")
            
            # Urinary connection
            urinary_symptoms = fever_data.get("urinary_symptoms", [])
            if urinary_symptoms and "none" not in urinary_symptoms:
                connections.append("Fever with urinary symptoms indicates possible UTI/pyelonephritis")
            
            # Neurological connection
            neuro_symptoms = fever_data.get("neuro_symptoms", [])
            if neuro_symptoms and "none" not in neuro_symptoms:
                connections.append("Fever with neurological symptoms raises concern for CNS infection")
        
        return connections