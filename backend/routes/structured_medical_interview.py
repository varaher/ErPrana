from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import os
import json
import uuid
import re
from datetime import datetime, timezone
from pathlib import Path

router = APIRouter()

class InterviewRequest(BaseModel):
    user_message: str
    session_id: str
    interview_state: Optional[Dict[str, Any]] = None
    user_id: str

class InterviewResponse(BaseModel):
    assistant_message: str
    updated_state: Dict[str, Any]
    next_slot: Optional[str] = None
    done: bool = False
    red_flags_triggered: List[str] = []
    provisional_diagnoses: Optional[List[Dict[str, Any]]] = None
    triage_level: Optional[str] = None

class StructuredMedicalInterviewer:
    """Handles structured medical interviews with slot filling and red flag detection"""
    
    def __init__(self):
        self.interview_configs = {}
        self.load_interview_configs()
    
    def load_interview_configs(self):
        """Load all interview configurations from the medical_interviews directory"""
        interviews_dir = Path("/app/backend/medical_interviews")
        
        # Load fever configuration
        try:
            with open(interviews_dir / "fever.json", 'r') as f:
                fever_config = json.load(f)
            with open(interviews_dir / "fever.policy.json", 'r') as f:
                fever_policy = json.load(f)
            
            self.interview_configs['fever'] = {
                'config': fever_config,
                'policy': fever_policy
            }
            print("✅ Loaded fever interview configuration")
        except Exception as e:
            print(f"❌ Error loading fever configuration: {e}")
        
        # Load chest pain configuration
        try:
            with open(interviews_dir / "chest_pain.json", 'r') as f:
                chest_pain_config = json.load(f)
            with open(interviews_dir / "chest_pain.policy.json", 'r') as f:
                chest_pain_policy = json.load(f)
            
            self.interview_configs['chest_pain'] = {
                'config': chest_pain_config,
                'policy': chest_pain_policy
            }
            print("✅ Loaded chest pain interview configuration")
        except Exception as e:
            print(f"❌ Error loading chest pain configuration: {e}")
        
        # Load shortness of breath configuration
        try:
            with open(interviews_dir / "shortness_of_breath.json", 'r') as f:
                sob_config = json.load(f)
            with open(interviews_dir / "shortness_of_breath.policy.json", 'r') as f:
                sob_policy = json.load(f)
            
            self.interview_configs['shortness_of_breath'] = {
                'config': sob_config,
                'policy': sob_policy
            }
            print("✅ Loaded shortness of breath interview configuration")
        except Exception as e:
            print(f"❌ Error loading shortness of breath configuration: {e}")
    
    def detect_primary_complaint(self, message: str) -> str:
        """Detect the primary complaint from user message"""
        message_lower = message.lower()
        
        # Shortness of breath detection patterns (check first - highest priority for respiratory emergencies)
        sob_patterns = [
            r'shortness of breath', r'short of breath', r'breathless', r'difficulty breathing',
            r'can\'t breathe', r'cannot breathe', r'breathing problems', r'dyspnea', r'sob',
            r'trouble breathing', r'hard to breathe', r'breathing difficulty'
        ]
        
        if any(re.search(pattern, message_lower) for pattern in sob_patterns):
            return 'shortness_of_breath'
        
        # Chest pain detection patterns
        chest_pain_patterns = [
            r'chest pain', r'chest discomfort', r'chest pressure', r'chest tightness',
            r'heart pain', r'cardiac pain', r'angina', r'heart attack', r'crushing chest'
        ]
        
        if any(re.search(pattern, message_lower) for pattern in chest_pain_patterns):
            return 'chest_pain'
        
        # Fever detection patterns
        fever_patterns = [
            r'fever', r'high temperature', r'temp', r'burning up', r'hot', 
            r'chills', r'feverish', r'pyrexia', r'\d+\s*(?:degree|°)?\s*(?:f|fahrenheit|c|celsius)'
        ]
        
        if any(re.search(pattern, message_lower) for pattern in fever_patterns):
            return 'fever'
        
        return 'general'  # Default to general if no specific complaint detected
    
    def first_unfilled_slot(self, slots_needed: List[str], filled_slots: Dict[str, Any]) -> Optional[str]:
        """Find the first unfilled required slot"""
        for slot_name in slots_needed:
            if slot_name not in filled_slots or filled_slots[slot_name] is None:
                return slot_name
        return None
    
    def extract_entities_from_text(self, text: str, complaint: str) -> Dict[str, Any]:
        """Extract medical entities from free text based on complaint type"""
        entities = {}
        text_lower = text.lower()
        
        if complaint == 'fever':
            # Extract temperature values - enhanced patterns
            temp_patterns = [
                r'(\d+(?:\.\d+)?)\s*(?:degree|degrees?|°)?\s*(?:f|fahrenheit|faranheit|fahr)\b',
                r'(\d+(?:\.\d+)?)\s*(?:degree|degrees?|°)?\s*(?:c|celsius|centigrade)\b',
                r'(\d+(?:\.\d+)?)\s*f\b',
                r'(\d+(?:\.\d+)?)\s*c\b',
                r'(\d+(?:\.\d+)?)\s+(?:degree|degrees)\s*(?:f|fahrenheit|faranheit)?\b',
                r'(\d+(?:\.\d+)?)\s+(?:degree|degrees)\s*(?:c|celsius)?\b',
                r'(?:temperature|temp).*?(\d+(?:\.\d+)?)',  # "temperature was 102"
                r'^(\d+(?:\.\d+)?)$'  # Just the number alone like "102"
            ]
            
            for pattern in temp_patterns:
                match = re.search(pattern, text_lower)
                if match:
                    temp_val = float(match.group(1))
                    # Convert celsius to fahrenheit if needed
                    if any(x in pattern for x in ['c\\b', 'celsius', 'centigrade']) and temp_val < 50:
                        temp_val = temp_val * 9/5 + 32
                    # Assume fahrenheit for normal fever range
                    elif temp_val >= 96 and temp_val <= 110:
                        entities['max_temp_f'] = temp_val
                        break
                    # For standalone numbers in fever range, assume fahrenheit
                    elif temp_val >= 99 and temp_val <= 106:
                        entities['max_temp_f'] = temp_val
                        break
                    else:
                        entities['max_temp_f'] = temp_val
                        break
            
            # Extract duration
            duration_patterns = [
                r'(\d+)\s*days?',
                r'(\d+)\s*weeks?',
                r'since\s*(\d+)\s*days?',
                r'for\s*(\d+)\s*days?'
            ]
            
            for pattern in duration_patterns:
                match = re.search(pattern, text_lower)
                if match:
                    days = int(match.group(1))
                    if 'week' in pattern:
                        days *= 7
                    entities['duration_days'] = days
                    break
            
            # Extract onset pattern
            if any(word in text_lower for word in ['sudden', 'suddenly', 'acute', 'quick', 'fast']):
                entities['onset'] = 'sudden'
            elif any(word in text_lower for word in ['gradual', 'gradually', 'slow', 'progressive']):
                entities['onset'] = 'gradual'
            
            # Extract measurement site
            measurement_sites = {
                'oral': ['oral', 'mouth', 'under tongue', 'tongue'],
                'axillary': ['axillary', 'armpit', 'under arm', 'underarm', 'arm'],
                'tympanic': ['tympanic', 'ear', 'in ear'],
                'rectal': ['rectal', 'rectum', 'bottom']
            }
            
            for site, keywords in measurement_sites.items():
                if any(keyword in text_lower for keyword in keywords):
                    entities['measurement_site'] = site
                    break
            
            # Extract symptoms - enhanced detection
            resp_symptoms = []
            if any(word in text_lower for word in ['cough', 'coughing', 'hacking']):
                if any(word in text_lower for word in ['dry', 'hacking', 'tickle']):
                    resp_symptoms.append('cough_dry')
                elif any(word in text_lower for word in ['phlegm', 'mucus', 'sputum', 'productive', 'wet']):
                    resp_symptoms.append('cough_phlegm')
                else:
                    resp_symptoms.append('cough_dry')  # Default to dry
            
            if any(word in text_lower for word in ['sore throat', 'throat pain', 'throat']):
                resp_symptoms.append('sore_throat')
            
            if any(word in text_lower for word in ['runny nose', 'nasal', 'stuffy']):
                resp_symptoms.append('runny_nose')
            
            if any(word in text_lower for word in ['shortness of breath', 'breathless', 'short of breath']):
                resp_symptoms.append('shortness_of_breath')
            
            if any(word in text_lower for word in ['chest pain', 'chest discomfort']):
                resp_symptoms.append('chest_pain')
            
            if resp_symptoms:
                entities['resp_symptoms'] = resp_symptoms
            
            # Extract GI symptoms
            gi_symptoms = []
            if any(word in text_lower for word in ['nausea', 'nauseous', 'sick to stomach', 'queasy']):
                gi_symptoms.append('nausea')
            
            if any(word in text_lower for word in ['vomiting', 'throwing up', 'puking', 'being sick']):
                gi_symptoms.append('vomiting')
            
            if any(word in text_lower for word in ['diarrhea', 'loose stools', 'watery stools', 'runs']):
                gi_symptoms.append('diarrhea')
            
            if any(word in text_lower for word in ['abdominal pain', 'stomach pain', 'belly pain']):
                gi_symptoms.append('abdominal_pain')
            
            if gi_symptoms:
                entities['gi_symptoms'] = gi_symptoms
            
            # Extract neurological symptoms
            neuro_symptoms = []
            if any(word in text_lower for word in ['severe headache', 'bad headache', 'terrible headache']):
                neuro_symptoms.append('severe_headache')
            
            if any(word in text_lower for word in ['stiff neck', 'neck stiffness', 'neck rigidity']):
                neuro_symptoms.append('stiff_neck')
            
            if any(word in text_lower for word in ['confusion', 'confused', 'disoriented']):
                neuro_symptoms.append('confusion')
            
            if neuro_symptoms:
                entities['neuro_symptoms'] = neuro_symptoms
        
        elif complaint == 'chest_pain':
            # Chest pain-specific entity extraction
            
            # Extract duration
            duration_patterns = [
                r'since\s+(\d+)\s+(hours?|days?|weeks?)',
                r'for\s+(\d+)\s+(hours?|days?|weeks?)',
                r'(\d+)\s+(hours?|days?|weeks?)\s+ago',
                r'since\s+(yesterday|today|this morning|last night)',
                r'for\s+the\s+last\s+(\d+)\s+(hours?|days?)'
            ]
            
            for pattern in duration_patterns:
                match = re.search(pattern, text_lower)
                if match:
                    entities['duration'] = match.group(0)
                    break
            
            # Extract onset
            if any(word in text_lower for word in ['sudden', 'suddenly', 'acute', 'came on quick']):
                entities['onset'] = 'sudden'
            elif any(word in text_lower for word in ['gradual', 'gradually', 'slow', 'progressive']):
                entities['onset'] = 'gradual'
            
            # Extract nature/character of pain
            if any(word in text_lower for word in ['pressure', 'pressing', 'tight', 'squeezing']):
                entities['nature'] = 'pressure'
            elif any(word in text_lower for word in ['stabbing', 'sharp', 'knife-like']):
                entities['nature'] = 'stabbing'
            elif any(word in text_lower for word in ['burning', 'acid']):
                entities['nature'] = 'burning'
            elif any(word in text_lower for word in ['tightness', 'tight']):
                entities['nature'] = 'tightness'
            
            # Extract location
            if any(word in text_lower for word in ['center', 'middle', 'sternum', 'center of chest']):
                entities['location'] = 'center of chest'
            elif any(word in text_lower for word in ['left chest', 'left side']):
                entities['location'] = 'left chest'
            elif any(word in text_lower for word in ['right chest', 'right side']):
                entities['location'] = 'right chest'
            elif any(word in text_lower for word in ['substernal', 'under breastbone']):
                entities['location'] = 'substernal'
            
            # Extract radiation
            if any(word in text_lower for word in ['jaw', 'to jaw', 'radiates to jaw']):
                entities['radiation'] = 'jaw'
            elif any(word in text_lower for word in ['left arm', 'down left arm']):
                entities['radiation'] = 'left_arm'
            elif any(word in text_lower for word in ['right arm', 'down right arm']):
                entities['radiation'] = 'right_arm'
            elif any(word in text_lower for word in ['back', 'to back', 'through to back']):
                entities['radiation'] = 'back'
            elif any(word in text_lower for word in ['no radiation', 'doesn\'t spread', 'localized']):
                entities['radiation'] = 'none'
            
            # Extract severity (1-10 scale)
            severity_patterns = [
                r'(\d+)\s*(?:out of|/)\s*10',
                r'severity\s*(\d+)',
                r'pain\s*(?:is\s*)?(\d+)',
                r'(\d+)\s*(?:on the scale|scale)'
            ]
            
            for pattern in severity_patterns:
                match = re.search(pattern, text_lower)
                if match:
                    severity = int(match.group(1))
                    if 1 <= severity <= 10:
                        entities['severity'] = severity
                        break
            
            # Extract associated symptoms
            associated_symptoms = []
            if any(word in text_lower for word in ['shortness of breath', 'breathless', 'short of breath', 'sob']):
                associated_symptoms.append('shortness_of_breath')
            if any(word in text_lower for word in ['sweating', 'diaphoresis', 'sweats']):
                associated_symptoms.append('sweating')
            if any(word in text_lower for word in ['nausea', 'nauseous', 'sick']):
                associated_symptoms.append('nausea')
            if any(word in text_lower for word in ['palpitations', 'heart racing', 'pounding heart']):
                associated_symptoms.append('palpitations')
            if any(word in text_lower for word in ['dizziness', 'dizzy', 'lightheaded', 'faint']):
                associated_symptoms.append('dizziness')
            if any(word in text_lower for word in ['none', 'no other symptoms']):
                associated_symptoms.append('none')
            
            if associated_symptoms:
                entities['associated'] = associated_symptoms
            
            # Extract triggers
            if any(word in text_lower for word in ['exertion', 'exercise', 'climbing stairs', 'walking']):
                entities['triggers'] = 'exertion'
            elif any(word in text_lower for word in ['at rest', 'resting', 'sitting']):
                entities['triggers'] = 'rest'
            elif any(word in text_lower for word in ['stress', 'anxiety', 'emotional']):
                entities['triggers'] = 'stress'
            
            # Extract risk factors
            risk_factors = []
            if any(word in text_lower for word in ['hypertension', 'high blood pressure', 'high bp']):
                risk_factors.append('hypertension')
            if any(word in text_lower for word in ['diabetes', 'diabetic', 'sugar']):
                risk_factors.append('diabetes')
            if any(word in text_lower for word in ['smoke', 'smoker', 'smoking']):
                risk_factors.append('smoking')
            if any(word in text_lower for word in ['family history', 'family heart', 'father heart attack']):
                risk_factors.append('family_history')
            if any(word in text_lower for word in ['high cholesterol', 'cholesterol', 'lipids']):
                risk_factors.append('high_cholesterol')
            if any(word in text_lower for word in ['none', 'no risk factors']):
                risk_factors.append('none')
            
            if risk_factors:
                entities['risk_factors'] = risk_factors
            
            # Extract age group
            age_patterns = [
                r'(\d{2})\s*(?:years old|year old|yo)',
                r'age\s*(\d{2})',
                r'i am\s*(\d{2})'
            ]
            
            for pattern in age_patterns:
                match = re.search(pattern, text_lower)
                if match:
                    age = int(match.group(1))
                    if age >= 65:
                        entities['age_group'] = 'older_65_plus'
                    elif age >= 41:
                        entities['age_group'] = 'adult_41_64'
                    elif age >= 18:
                        entities['age_group'] = 'adult_18_40'
                    break
            
            # Extract age group (simple heuristic)
            age_patterns = [
                r'(\d+)\s*(?:years?|yrs?)\s*old',
                r'age\s*(\d+)',
                r'(\d+)\s*yo'
            ]
            
            for pattern in age_patterns:
                match = re.search(pattern, text_lower)
                if match:
                    age = int(match.group(1))
                    if age < 1:
                        entities['age_group'] = 'infant_lt_3m'
                    elif age <= 5:
                        entities['age_group'] = 'child_3m_5y'
                    elif age <= 17:
                        entities['age_group'] = 'child_6y_17y'
                    elif age <= 64:
                        entities['age_group'] = 'adult_18_64'
                    else:
                        entities['age_group'] = 'older_65_plus'
                    break
        
        return entities
    
    def evaluate_red_flag_rules(self, rules: List[Dict], slots: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Evaluate red flag rules against current slots"""
        triggered_flags = []
        
        for rule in rules:
            try:
                if self._evaluate_rule_condition(rule['if'], slots):
                    triggered_flags.append({
                        'name': rule['name'],
                        'triage': rule['triage'],
                        'message': rule['message']
                    })
            except Exception as e:
                print(f"Error evaluating rule {rule['name']}: {e}")
        
        return triggered_flags
    
    def _evaluate_rule_condition(self, condition: str, slots: Dict[str, Any]) -> bool:
        """Safely evaluate a rule condition"""
        # Simple rule evaluation - replace with more sophisticated parser in production
        try:
            # Replace slot names with actual values
            eval_condition = condition
            
            for slot_name, value in slots.items():
                if isinstance(value, str):
                    eval_condition = eval_condition.replace(slot_name, f"'{value}'")
                elif isinstance(value, list):
                    eval_condition = eval_condition.replace(f"{slot_name} includes", f"'{value}' includes")
                    eval_condition = eval_condition.replace("includes", ".__contains__")
                else:
                    eval_condition = eval_condition.replace(slot_name, str(value))
            
            # Handle operators
            eval_condition = eval_condition.replace('&&', ' and ')
            eval_condition = eval_condition.replace('||', ' or ')
            eval_condition = eval_condition.replace('==', ' == ')
            eval_condition = eval_condition.replace('>=', ' >= ')
            eval_condition = eval_condition.replace('<=', ' <= ')
            
            # Simple evaluation (in production, use a proper expression parser)
            return eval(eval_condition)
            
        except:
            return False
    
    def determine_triage_level(self, flags: List[Dict[str, Any]]) -> str:
        """Determine overall triage level from triggered flags"""
        if any(f['triage'] == 'red' for f in flags):
            return 'red'
        elif any(f['triage'] == 'orange' for f in flags):
            return 'orange'
        elif any(f['triage'] == 'yellow' for f in flags):
            return 'yellow'
        else:
            return 'green'
    
    def generate_provisional_diagnoses(self, complaint: str, slots: Dict[str, Any], triage_level: str) -> List[Dict[str, Any]]:
        """Generate provisional diagnoses based on complaint and symptoms"""
        diagnoses = []
        
        if complaint == 'fever':
            # Fever-specific diagnosis logic
            resp_symptoms = slots.get('resp_symptoms', [])
            gi_symptoms = slots.get('gi_symptoms', [])
            neuro_symptoms = slots.get('neuro_symptoms', [])
            duration = slots.get('duration_days', 0)
            max_temp = slots.get('max_temp_f', 0)
            
            # High-risk diagnoses based on red flags
            if triage_level == 'red':
                if any(s in neuro_symptoms for s in ['stiff_neck', 'confusion']):
                    diagnoses.append({
                        'name': 'Meningitis/Encephalitis',
                        'probability': 85,
                        'reasoning': 'Fever with neurological signs (stiff neck/confusion)',
                        'urgency': 'EMERGENCY',
                        'icd10': 'G03.9'
                    })
                
                if max_temp >= 104:
                    diagnoses.append({
                        'name': 'Hyperthermia/Severe Infection',
                        'probability': 80,
                        'reasoning': 'Very high fever (≥104°F) indicates severe systemic illness',
                        'urgency': 'EMERGENCY',
                        'icd10': 'R50.9'
                    })
            
            # Common fever diagnoses
            if 'cough_dry' in resp_symptoms or 'cough_phlegm' in resp_symptoms:
                if 'shortness_of_breath' in resp_symptoms or 'chest_pain' in resp_symptoms:
                    diagnoses.append({
                        'name': 'Pneumonia',
                        'probability': 70,
                        'reasoning': 'Fever with cough and respiratory symptoms',
                        'urgency': 'URGENT',
                        'icd10': 'J18.9'
                    })
                else:
                    diagnoses.append({
                        'name': 'Upper Respiratory Tract Infection',
                        'probability': 60,
                        'reasoning': 'Fever with cough, likely viral or bacterial URTI',
                        'urgency': 'ROUTINE',
                        'icd10': 'J06.9'
                    })
            
            if any(s in gi_symptoms for s in ['nausea', 'vomiting', 'diarrhea']):
                diagnoses.append({
                    'name': 'Gastroenteritis',
                    'probability': 65,
                    'reasoning': 'Fever with gastrointestinal symptoms',
                    'urgency': 'ROUTINE',
                    'icd10': 'K59.1'
                })
            
            if 'burning' in slots.get('urinary_symptoms', []) or 'frequency' in slots.get('urinary_symptoms', []):
                diagnoses.append({
                    'name': 'Urinary Tract Infection',
                    'probability': 75,
                    'reasoning': 'Fever with urinary symptoms',
                    'urgency': 'URGENT',
                    'icd10': 'N39.0'
                })
            
            # Default viral syndrome if no specific pattern
            if not diagnoses:
                diagnoses.append({
                    'name': 'Viral Syndrome',
                    'probability': 50,
                    'reasoning': 'Fever without specific localizing symptoms',
                    'urgency': 'ROUTINE',
                    'icd10': 'R50.9'
                })
        
        # Sort by probability descending and return top 5
        diagnoses.sort(key=lambda x: x['probability'], reverse=True)
        return diagnoses[:5]
    
    def conduct_interview(self, request: InterviewRequest) -> InterviewResponse:
        """Conduct structured medical interview"""
        
        # Initialize or get existing interview state
        if not request.interview_state:
            complaint = self.detect_primary_complaint(request.user_message)
            interview_state = {
                'complaint': complaint,
                'stage': 'GREETING' if request.user_message.lower().strip() in ['hi', 'hello', 'hey'] else 'CHIEF_COMPLAINT_CONFIRM',
                'slots': {},
                'last_asked': None,
                'interview_complete': False
            }
        else:
            interview_state = request.interview_state
            complaint = interview_state['complaint']
        
        # Get interview configuration
        if complaint not in self.interview_configs:
            # Fallback to general conversation
            return InterviewResponse(
                assistant_message="I understand your concern. Can you describe your main symptom in more detail?",
                updated_state=interview_state,
                done=False
            )
        
        config = self.interview_configs[complaint]['config']
        policy = self.interview_configs[complaint]['policy']
        
        # Extract entities from user message and update slots
        new_entities = self.extract_entities_from_text(request.user_message, complaint)
        interview_state['slots'].update(new_entities)
        
        # Also check for simple answers to current question
        current_question = interview_state.get('last_asked')
        user_text_lower = request.user_message.lower().strip()
        
        # Handle simple temperature answers
        if current_question == 'max_temp_f' and 'max_temp_f' not in new_entities:
            # Try to extract just a number
            temp_match = re.search(r'(\d+(?:\.\d+)?)', user_text_lower)
            if temp_match:
                temp_val = float(temp_match.group(1))
                if 96 <= temp_val <= 110:  # Reasonable fever range
                    interview_state['slots']['max_temp_f'] = temp_val
        
        # Handle measurement site answers
        if current_question == 'measurement_site' and 'measurement_site' not in new_entities:
            if 'oral' in user_text_lower or 'mouth' in user_text_lower:
                interview_state['slots']['measurement_site'] = 'oral'
            elif 'axillary' in user_text_lower or 'armpit' in user_text_lower or 'arm' in user_text_lower:
                interview_state['slots']['measurement_site'] = 'axillary'
            elif 'tympanic' in user_text_lower or 'ear' in user_text_lower:
                interview_state['slots']['measurement_site'] = 'tympanic'
            elif 'rectal' in user_text_lower:
                interview_state['slots']['measurement_site'] = 'rectal'
        
        # Find current stage
        current_stage = None
        for stage in policy['states']:
            if stage['name'] == interview_state['stage']:
                current_stage = stage
                break
        
        if not current_stage:
            current_stage = policy['states'][0]  # Default to first stage
        
        # Process based on stage
        if current_stage['name'] == 'GREETING':
            interview_state['stage'] = 'CHIEF_COMPLAINT_CONFIRM'
            # Find CHIEF_COMPLAINT_CONFIRM stage to get the right question
            confirm_stage = next((s for s in policy['states'] if s['name'] == 'CHIEF_COMPLAINT_CONFIRM'), None)
            confirm_question = confirm_stage.get('ask', "Are you experiencing symptoms?") if confirm_stage else "Are you experiencing symptoms?"
            confirm_slot = confirm_stage.get('capture', 'confirm_symptom') if confirm_stage else 'confirm_symptom'
            
            return InterviewResponse(
                assistant_message=confirm_question,
                updated_state=interview_state,
                next_slot=confirm_slot,
                done=False
            )
        
        elif current_stage['name'] == 'CHIEF_COMPLAINT_CONFIRM':
            # Get confirmation details from policy
            confirm_stage = next((s for s in policy['states'] if s['name'] == 'CHIEF_COMPLAINT_CONFIRM'), None)
            confirm_slot = confirm_stage.get('capture', 'confirm_symptom') if confirm_stage else 'confirm_symptom'
            
            # Dynamic confirmation based on complaint type
            confirmation_keywords = []
            if complaint == 'fever':
                confirmation_keywords = ['yes', 'fever', 'temperature', 'hot']
            elif complaint == 'chest_pain':
                confirmation_keywords = ['yes', 'chest pain', 'chest', 'pain', 'discomfort']
            else:
                confirmation_keywords = ['yes']
            
            if any(word in request.user_message.lower() for word in confirmation_keywords):
                interview_state['slots'][confirm_slot] = True
                # Find CORE stage
                core_stage = next((s for s in policy['states'] if 'ask_order' in s), None)
                if core_stage:
                    interview_state['stage'] = core_stage['name']
                    next_slot = self.first_unfilled_slot(core_stage['ask_order'], interview_state['slots'])
                    if next_slot:
                        slot_config = next((s for s in config['slots'] if s['name'] == next_slot), None)
                        question = slot_config['question'] if slot_config else "Can you tell me more?"
                        return InterviewResponse(
                            assistant_message=question,
                            updated_state=interview_state,
                            next_slot=next_slot,
                            done=False
                        )
            else:
                return InterviewResponse(
                    assistant_message="Which symptom is troubling you most right now?",
                    updated_state=interview_state,
                    done=False
                )
        
        elif 'ask_order' in current_stage:
            # Handle slot-filling stages (CORE, ASSOCIATED, CONTEXT)
            slots_needed = current_stage['ask_order']
            next_slot = self.first_unfilled_slot(slots_needed, interview_state['slots'])
            
            if next_slot:
                slot_config = next((s for s in config['slots'] if s['name'] == next_slot), None)
                question = slot_config['question'] if slot_config else "Can you tell me more?"
                interview_state['last_asked'] = next_slot
                return InterviewResponse(
                    assistant_message=question,
                    updated_state=interview_state,
                    next_slot=next_slot,
                    done=False
                )
            else:
                # All slots filled, advance to next stage
                interview_state['stage'] = current_stage['next']
                return self.conduct_interview(InterviewRequest(
                    user_message="",
                    session_id=request.session_id,
                    interview_state=interview_state,
                    user_id=request.user_id
                ))
        
        elif current_stage['name'] == 'RED_FLAGS':
            # Evaluate red flags
            triggered_flags = self.evaluate_red_flag_rules(config['redFlagRules'], interview_state['slots'])
            interview_state['slots']['red_flags'] = [f['name'] for f in triggered_flags]
            triage_level = self.determine_triage_level(triggered_flags)
            interview_state['slots']['triage'] = triage_level
            
            if triggered_flags:
                warning_messages = [f['message'] for f in triggered_flags]
                warning = f"⚠️ Note: {' '.join(warning_messages)}"
                interview_state['stage'] = 'SUMMARY'
                return InterviewResponse(
                    assistant_message=warning,
                    updated_state=interview_state,
                    done=False,
                    red_flags_triggered=[f['name'] for f in triggered_flags],
                    triage_level=triage_level
                )
            else:
                interview_state['stage'] = 'SUMMARY'
                return self.conduct_interview(InterviewRequest(
                    user_message="",
                    session_id=request.session_id,
                    interview_state=interview_state,
                    user_id=request.user_id
                ))
        
        elif current_stage['name'] == 'SUMMARY':
            # Generate final summary and recommendations
            triage_level = interview_state['slots'].get('triage', 'green')
            
            # Determine next steps based on triage
            if triage_level == 'red':
                next_steps = "🚨 Please seek emergency care now or call 911 immediately."
            elif triage_level == 'orange':
                next_steps = "⚠️ Same-day urgent evaluation is recommended. Contact your healthcare provider or visit urgent care."
            elif triage_level == 'yellow':
                next_steps = "📞 Consider clinic evaluation within 24-48 hours and monitor hydration."
            else:
                next_steps = "🏠 Home care advice: fluids, rest, fever reducers as appropriate; return if symptoms worsen or red flags develop."
            
            # Generate provisional diagnoses
            provisional_diagnoses = self.generate_provisional_diagnoses(
                complaint, interview_state['slots'], triage_level
            )
            
            # Create summary
            summary_parts = []
            duration = interview_state['slots'].get('duration_days', '—')
            max_temp = interview_state['slots'].get('max_temp_f', '—')
            onset = interview_state['slots'].get('onset', '—')
            
            summary_parts.append(f"**📋 Clinical Summary:**")
            summary_parts.append(f"Fever for {duration} day(s), onset {onset}, max temperature {max_temp}°F")
            
            # Add associated symptoms
            resp = interview_state['slots'].get('resp_symptoms', [])
            gi = interview_state['slots'].get('gi_symptoms', [])
            neuro = interview_state['slots'].get('neuro_symptoms', [])
            
            if resp and 'none' not in resp:
                summary_parts.append(f"Respiratory: {', '.join(resp)}")
            if gi and 'none' not in gi:
                summary_parts.append(f"GI: {', '.join(gi)}")
            if neuro and 'none' not in neuro:
                summary_parts.append(f"Neurological: {', '.join(neuro)}")
            
            summary_parts.append(f"**🎯 Triage Level:** {triage_level.upper()}")
            
            # Add provisional diagnoses
            if provisional_diagnoses:
                summary_parts.append(f"\n**🔬 Most Likely Diagnoses:**")
                for i, dx in enumerate(provisional_diagnoses, 1):
                    summary_parts.append(f"{i}. **{dx['name']}** ({dx['probability']}% likelihood)")
                    summary_parts.append(f"   *Reasoning:* {dx['reasoning']}")
                    summary_parts.append(f"   *Urgency:* {dx['urgency']}")
            
            summary_parts.append(f"\n**📋 Next Steps:**")
            summary_parts.append(next_steps)
            
            interview_state['interview_complete'] = True
            
            return InterviewResponse(
                assistant_message='\n'.join(summary_parts),
                updated_state=interview_state,
                done=True,
                red_flags_triggered=interview_state['slots'].get('red_flags', []),
                provisional_diagnoses=provisional_diagnoses,
                triage_level=triage_level
            )
        
        # Default response
        return InterviewResponse(
            assistant_message="Thank you for the information. Let me process this.",
            updated_state=interview_state,
            done=True
        )

# Initialize the interviewer
medical_interviewer = StructuredMedicalInterviewer()

@router.post("/structured-interview", response_model=InterviewResponse)
async def conduct_structured_interview(request: InterviewRequest):
    """Conduct structured medical interview with slot filling"""
    try:
        return medical_interviewer.conduct_interview(request)
    except Exception as e:
        print(f"Error in structured interview: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error in medical interview: {str(e)}")

@router.get("/available-interviews")
async def get_available_interviews():
    """Get list of available structured interviews"""
    return {
        "available_interviews": list(medical_interviewer.interview_configs.keys()),
        "total_interviews": len(medical_interviewer.interview_configs)
    }

@router.get("/interview-config/{complaint}")
async def get_interview_config(complaint: str):
    """Get configuration for a specific medical interview"""
    if complaint in medical_interviewer.interview_configs:
        return medical_interviewer.interview_configs[complaint]
    else:
        raise HTTPException(status_code=404, detail=f"Interview configuration for '{complaint}' not found")