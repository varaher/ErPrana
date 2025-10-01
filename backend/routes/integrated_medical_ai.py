from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import os
import json
import uuid
import re
from datetime import datetime, timezone
from dotenv import load_dotenv

# Import existing systems
from .structured_medical_interview import medical_interviewer
from .advanced_symptom_intelligence import (
    multi_symptom_detector, emergency_detector, 
    recommendation_generator, fallback_system
)

# Import diagnosis engine with absolute path
import sys
sys.path.append('/app/backend')
from diagnosis_engine.cross_symptom_analyzer import CrossSymptomAnalyzer

load_dotenv()

router = APIRouter()

class IntegratedMedicalRequest(BaseModel):
    user_message: str
    session_id: str
    conversation_state: Optional[Dict[str, Any]] = None
    user_id: str

class IntegratedMedicalResponse(BaseModel):
    assistant_message: str
    updated_state: Dict[str, Any]
    next_step: str
    interview_active: bool = False
    interview_type: Optional[str] = None
    emergency_detected: bool = False
    comprehensive_diagnoses: Optional[List[Dict[str, Any]]] = None
    triage_level: Optional[str] = None
    clinical_summary: Optional[str] = None
    recommendations: Optional[List[Dict[str, Any]]] = None

class IntegratedMedicalAI:
    """
    Integrated Medical AI that combines:
    1. Structured medical interviews (fever, etc.)
    2. Advanced symptom intelligence
    3. Cross-symptom analysis
    4. Comprehensive provisional diagnoses
    """
    
    def __init__(self):
        self.cross_analyzer = CrossSymptomAnalyzer()
        self.active_interviews = {}  # Track active structured interviews
    
    def detect_structured_interview_trigger(self, message: str, conversation_state: Dict[str, Any]) -> Optional[str]:
        """Detect if we should start a structured interview"""
        message_lower = message.lower()
        
        # Check if already in an interview
        current_interview = conversation_state.get('active_interview')
        if current_interview:
            return current_interview
        
        # Check for existing fever interview state
        if 'fever_interview_state' in conversation_state:
            fever_state = conversation_state['fever_interview_state']
            if not fever_state.get('interview_complete', False):
                return 'fever'
        
        # Fever interview triggers
        fever_patterns = [
            r'fever', r'high temperature', r'temp', r'burning up', 
            r'chills', r'feverish', r'hot', r'cold', r'temperature',
            r'\d+\s*(?:degree|°)?\s*(?:f|fahrenheit|c|celsius)'
        ]
        
        if any(re.search(pattern, message_lower) for pattern in fever_patterns):
            return 'fever'
        
        return None
    
    def should_continue_interview(self, interview_state: Dict[str, Any]) -> bool:
        """Determine if structured interview should continue"""
        if not interview_state:
            return False
        
        # Check if interview is complete
        if interview_state.get('interview_complete'):
            return False
        
        # Check if we're in summary stage
        if interview_state.get('stage') == 'END':
            return False
        
        return True
    
    def merge_interview_data(self, conversation_state: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
        """Extract and merge all completed interview data"""
        merged_data = {}
        
        # Extract fever interview data
        fever_interview = conversation_state.get('fever_interview_state')
        if fever_interview and fever_interview.get('slots'):
            # Ensure collected_symptoms key exists for cross-symptom analyzer
            fever_data = fever_interview['slots'].copy()
            if 'collected_symptoms' not in fever_data:
                # Create collected_symptoms from various symptom fields
                collected_symptoms = []
                if fever_data.get('confirm_fever'):
                    collected_symptoms.append('fever')
                
                # Add respiratory symptoms
                resp_symptoms = fever_data.get('resp_symptoms', [])
                if isinstance(resp_symptoms, list):
                    collected_symptoms.extend([s for s in resp_symptoms if s != 'none'])
                
                # Add GI symptoms
                gi_symptoms = fever_data.get('gi_symptoms', [])
                if isinstance(gi_symptoms, list):
                    collected_symptoms.extend([s for s in gi_symptoms if s != 'none'])
                
                # Add neurological symptoms
                neuro_symptoms = fever_data.get('neuro_symptoms', [])
                if isinstance(neuro_symptoms, list):
                    collected_symptoms.extend([s for s in neuro_symptoms if s != 'none'])
                
                fever_data['collected_symptoms'] = collected_symptoms
            
            merged_data['fever'] = fever_data
        
        return merged_data
    
    async def process_message(self, request: IntegratedMedicalRequest) -> IntegratedMedicalResponse:
        """Process message through integrated medical AI system"""
        
        conversation_state = request.conversation_state or {}
        user_message = request.user_message.strip()
        
        # Enhanced emergency detection first (highest priority)
        all_symptoms = self._extract_all_mentioned_symptoms(conversation_state, user_message)
        emergency_result = emergency_detector.detect_emergency(user_message, all_symptoms)
        
        # Check for critical emergency combinations
        message_lower = user_message.lower()
        critical_emergency = False
        emergency_message = ""
        
        # Meningitis signs
        if ('fever' in message_lower and ('stiff neck' in message_lower or 'confusion' in message_lower)):
            critical_emergency = True
            emergency_message = "🚨 **MEDICAL EMERGENCY DETECTED** 🚨\n\nFever with neurological symptoms (stiff neck/confusion) suggests possible MENINGITIS. **Call 911 immediately** - this is a life-threatening emergency requiring immediate medical attention. Time is critical."
        
        # Sepsis signs  
        elif ('fever' in message_lower and 'confusion' in message_lower):
            critical_emergency = True
            emergency_message = "🚨 **MEDICAL EMERGENCY DETECTED** 🚨\n\nFever with confusion may indicate SEPSIS. **Call 911 immediately** - this is a life-threatening condition requiring emergency care."
        
        # High fever
        elif re.search(r'(104|105|106)\s*(?:degree|°)?\s*(?:f|fahrenheit)', message_lower):
            critical_emergency = True  
            emergency_message = "🚨 **MEDICAL EMERGENCY DETECTED** 🚨\n\nVery high fever (≥104°F) detected. **Call 911 immediately** or go to the nearest emergency room. This temperature requires immediate medical evaluation."
        
        # Use original emergency detection or critical detection
        if critical_emergency or emergency_result["is_emergency"]:
            conversation_state['emergency_detected'] = True
            conversation_state['emergency_type'] = emergency_result.get("emergency_flags", ["critical_emergency"])
            
            final_message = emergency_message if critical_emergency else emergency_result["emergency_message"]
            
            return IntegratedMedicalResponse(
                assistant_message=final_message,
                updated_state=conversation_state,
                next_step="emergency_care",
                emergency_detected=True,
                triage_level="red"
            )
        
        # Check for structured interview triggers or continuation
        interview_type = self.detect_structured_interview_trigger(user_message, conversation_state)
        
        if interview_type:
            # Conduct structured interview
            return await self._conduct_structured_interview(
                interview_type, request, conversation_state
            )
        
        # Check if we should provide comprehensive analysis
        interview_data = self.merge_interview_data(conversation_state)
        if interview_data:
            return await self._provide_comprehensive_analysis(
                request, conversation_state, interview_data
            )
        
        # Fall back to advanced symptom intelligence
        return await self._use_advanced_symptom_intelligence(request, conversation_state)
    
    async def _conduct_structured_interview(self, interview_type: str, 
                                          request: IntegratedMedicalRequest,
                                          conversation_state: Dict[str, Any]) -> IntegratedMedicalResponse:
        """Conduct structured medical interview"""
        
        # Get or initialize interview state
        interview_state_key = f'{interview_type}_interview_state'
        interview_state = conversation_state.get(interview_state_key)
        
        # Ensure interview state has the complaint field
        if not interview_state:
            interview_state = {
                'complaint': interview_type,
                'stage': 'GREETING',
                'slots': {},
                'last_asked': None,
                'interview_complete': False
            }
        elif 'complaint' not in interview_state:
            interview_state['complaint'] = interview_type
        
        # Create structured interview request
        from .structured_medical_interview import InterviewRequest
        
        structured_request = InterviewRequest(
            user_message=request.user_message,
            session_id=request.session_id,
            interview_state=interview_state,
            user_id=request.user_id
        )
        
        # Conduct interview
        interview_response = medical_interviewer.conduct_interview(structured_request)
        
        # Update conversation state
        conversation_state[interview_state_key] = interview_response.updated_state
        conversation_state['active_interview'] = interview_type if not interview_response.done else None
        
        # If interview is complete, provide comprehensive analysis
        if interview_response.done:
            # Extract demographics for cross-analysis
            demographics = self._extract_demographics(interview_response.updated_state)
            interview_data = self.merge_interview_data(conversation_state)
            
            if interview_data:
                comprehensive_analysis = self.cross_analyzer.get_interconnected_analysis(
                    interview_data, demographics
                )
                
                # Enhance response with comprehensive diagnoses
                enhanced_message = interview_response.assistant_message
                
                if comprehensive_analysis["comprehensive_diagnoses"]:
                    enhanced_message += "\n\n**🔬 Comprehensive Differential Diagnoses:**\n"
                    
                    for i, diagnosis in enumerate(comprehensive_analysis["comprehensive_diagnoses"], 1):
                        enhanced_message += f"\n**{i}. {diagnosis['name']}** ({diagnosis['probability']}%)\n"
                        enhanced_message += f"   *Clinical reasoning:* {diagnosis['reasoning']}\n"
                        enhanced_message += f"   *Priority:* {diagnosis['priority']}\n"
                        enhanced_message += f"   *Next steps:* {diagnosis['next_steps']}\n"
                
                if comprehensive_analysis["interconnected_findings"]:
                    enhanced_message += "\n\n**🔗 Clinical Connections:**\n"
                    for finding in comprehensive_analysis["interconnected_findings"]:
                        enhanced_message += f"• {finding}\n"
                
                return IntegratedMedicalResponse(
                    assistant_message=enhanced_message,
                    updated_state=conversation_state,
                    next_step="analysis_complete",
                    interview_active=False,
                    comprehensive_diagnoses=comprehensive_analysis["comprehensive_diagnoses"],
                    triage_level=comprehensive_analysis["overall_triage"].lower(),
                    clinical_summary=comprehensive_analysis["clinical_summary"]
                )
        
        return IntegratedMedicalResponse(
            assistant_message=interview_response.assistant_message,
            updated_state=conversation_state,
            next_step="interview_continue",
            interview_active=not interview_response.done,
            interview_type=interview_type,
            emergency_detected=len(interview_response.red_flags_triggered) > 0,
            triage_level=interview_response.triage_level
        )
    
    async def _provide_comprehensive_analysis(self, request: IntegratedMedicalRequest,
                                            conversation_state: Dict[str, Any],
                                            interview_data: Dict[str, Dict[str, Any]]) -> IntegratedMedicalResponse:
        """Provide comprehensive analysis when user asks for advice"""
        
        # Check if user is asking for advice/recommendations
        asking_for_advice = any(phrase in request.user_message.lower() for phrase in [
            "what should i do", "what do you recommend", "help me", "advice", 
            "treatment", "medication", "doctor", "hospital", "diagnosis"
        ])
        
        if asking_for_advice:
            # Extract demographics
            demographics = {}
            for complaint_data in interview_data.values():
                if 'age_group' in complaint_data:
                    demographics['age_group'] = complaint_data['age_group']
                if 'comorbidities' in complaint_data:
                    demographics['comorbidities'] = complaint_data['comorbidities']
            
            # Get comprehensive analysis
            comprehensive_analysis = self.cross_analyzer.get_interconnected_analysis(
                interview_data, demographics
            )
            
            # Generate response
            response_parts = []
            response_parts.append("Based on your symptoms, here's my comprehensive analysis:")
            
            # Clinical summary
            response_parts.append(f"\n**📋 Clinical Summary:**")
            response_parts.append(comprehensive_analysis["clinical_summary"])
            
            # Top diagnoses
            if comprehensive_analysis["comprehensive_diagnoses"]:
                response_parts.append(f"\n**🔬 Most Likely Diagnoses:**")
                
                for i, diagnosis in enumerate(comprehensive_analysis["comprehensive_diagnoses"], 1):
                    response_parts.append(f"\n**{i}. {diagnosis['name']}** - {diagnosis['probability']}% likelihood")
                    response_parts.append(f"   *Reasoning:* {diagnosis['reasoning']}")
                    response_parts.append(f"   *Priority:* {diagnosis['priority']}")
                    response_parts.append(f"   *Action needed:* {diagnosis['next_steps']}")
            
            # Interconnected findings
            if comprehensive_analysis["interconnected_findings"]:
                response_parts.append(f"\n**🔗 Important Clinical Connections:**")
                for finding in comprehensive_analysis["interconnected_findings"]:
                    response_parts.append(f"• {finding}")
            
            # Overall recommendation
            triage = comprehensive_analysis["overall_triage"]
            response_parts.append(f"\n**⚠️ Overall Priority Level: {triage.upper()}**")
            
            return IntegratedMedicalResponse(
                assistant_message='\n'.join(response_parts),
                updated_state=conversation_state,
                next_step="analysis_complete",
                comprehensive_diagnoses=comprehensive_analysis["comprehensive_diagnoses"],
                triage_level=triage.lower(),
                clinical_summary=comprehensive_analysis["clinical_summary"]
            )
        
        # If not asking for advice, continue conversation
        return await self._use_advanced_symptom_intelligence(request, conversation_state)
    
    async def _use_advanced_symptom_intelligence(self, request: IntegratedMedicalRequest,
                                               conversation_state: Dict[str, Any]) -> IntegratedMedicalResponse:
        """Fall back to advanced symptom intelligence system"""
        
        # Use the existing advanced symptom intelligence
        from .advanced_symptom_intelligence import SymptomRequest, advanced_symptom_analysis
        
        adv_request = SymptomRequest(
            user_message=request.user_message,
            session_id=request.session_id,
            conversation_state=conversation_state,
            user_id=request.user_id
        )
        
        adv_response = await advanced_symptom_analysis(adv_request)
        
        return IntegratedMedicalResponse(
            assistant_message=adv_response.assistant_message,
            updated_state=adv_response.updated_state,
            next_step=adv_response.next_step,
            emergency_detected=adv_response.emergency_detected,
            recommendations=adv_response.recommendations
        )
    
    def _extract_all_mentioned_symptoms(self, conversation_state: Dict[str, Any], 
                                      current_message: str) -> List[str]:
        """Extract all symptoms mentioned across the conversation"""
        symptoms = []
        
        # From conversation history
        for interview_type, interview_state in conversation_state.items():
            if interview_type.endswith('_interview_state') and isinstance(interview_state, dict):
                slots = interview_state.get('slots', {})
                for key, value in slots.items():
                    if 'symptom' in key and isinstance(value, list):
                        symptoms.extend([s for s in value if s != 'none'])
        
        # From current message
        symptom_patterns = [
            r'fever', r'pain', r'nausea', r'vomiting', r'cough', r'headache',
            r'chest pain', r'abdominal pain', r'shortness of breath'
        ]
        
        for pattern in symptom_patterns:
            if re.search(pattern, current_message.lower()):
                symptoms.append(pattern.replace('_', ' '))
        
        return list(set(symptoms))  # Remove duplicates
    
    def _extract_demographics(self, interview_state: Dict[str, Any]) -> Dict[str, Any]:
        """Extract demographic information from interview state"""
        demographics = {}
        
        slots = interview_state.get('slots', {})
        
        if 'age_group' in slots:
            demographics['age_group'] = slots['age_group']
        
        if 'comorbidities' in slots:
            demographics['comorbidities'] = slots['comorbidities']
        
        # Extract gender from context (would need additional logic)
        # demographics['gender'] = 'unknown'  # Default
        
        return demographics

# Initialize integrated AI
integrated_ai = IntegratedMedicalAI()

@router.post("/medical-ai", response_model=IntegratedMedicalResponse)
async def integrated_medical_consultation(request: IntegratedMedicalRequest):
    """
    Integrated medical AI consultation combining structured interviews,
    advanced symptom intelligence, and cross-symptom analysis
    """
    try:
        return await integrated_ai.process_message(request)
    except Exception as e:
        print(f"Error in integrated medical AI: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error in medical consultation: {str(e)}")

@router.get("/medical-ai/status")
async def get_medical_ai_status():
    """Get status of integrated medical AI system"""
    return {
        "status": "operational",
        "available_interviews": list(medical_interviewer.interview_configs.keys()),
        "features": [
            "structured_medical_interviews",
            "advanced_symptom_intelligence", 
            "cross_symptom_analysis",
            "comprehensive_diagnoses",
            "emergency_detection",
            "triage_assessment"
        ]
    }