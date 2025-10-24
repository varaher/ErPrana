# services/adaptive_interview.py
# Adaptive Interview System - Captures free-form symptoms during structured interviews

from typing import Dict, List, Optional, Any
import re

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
        if len(symptoms) > 2:
            return f"I understand you're experiencing {', '.join(symptoms[:3])} along with {current_complaint}. Let me focus on the {current_complaint} first. Can you describe its severity?"
        elif len(symptoms) > 0:
            return f"I noted you also mentioned {symptoms[0]}. I'll keep that in mind. "
        
        return ""

# Global instance
adaptive_interview = AdaptiveInterviewManager()
