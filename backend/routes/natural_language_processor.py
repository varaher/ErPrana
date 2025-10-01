from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import os
import re
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

class NLURequest(BaseModel):
    text: str
    language: Optional[str] = "en"

class NLUResponse(BaseModel):
    original_text: str
    processed_text: str
    detected_symptoms: List[str]
    medical_translations: Dict[str, str]
    confidence_score: float

class ColloquialMedicalTranslator:
    """Translates colloquial symptom descriptions to medical terminology"""
    
    def __init__(self):
        # Mapping of colloquial phrases to medical terms
        self.colloquial_mappings = {
            # Dizziness and vertigo
            "surrounding is spinning": "vertigo",
            "room is spinning": "vertigo", 
            "world is spinning": "vertigo",
            "everything spinning": "vertigo",
            "feel like spinning": "dizziness",
            "dizzy spells": "episodic dizziness",
            "light headed": "lightheadedness",
            "head feels light": "lightheadedness",
            "woozy": "dizziness",
            
            # Pain descriptions
            "killing me": "severe pain",
            "unbearable pain": "severe pain",
            "excruciating": "severe pain", 
            "throbbing like crazy": "severe throbbing pain",
            "sharp shooting": "sharp radiating pain",
            "dull ache": "dull aching pain",
            "burning sensation": "burning pain",
            "stabbing pain": "sharp stabbing pain",
            
            # Gastrointestinal
            "tummy trouble": "abdominal discomfort",
            "belly ache": "abdominal pain",
            "stomach bug": "gastroenteritis symptoms",
            "runs": "diarrhea",
            "loose stools": "diarrhea", 
            "throw up": "vomiting",
            "puke": "vomiting",
            "feel sick": "nausea",
            "queasy": "nausea",
            "gassy": "flatulence",
            "heartburn": "gastroesophageal reflux",
            
            # Respiratory
            "can't catch my breath": "shortness of breath",
            "out of breath": "dyspnea",
            "winded": "dyspnea",
            "tight chest": "chest tightness",
            "chest feels heavy": "chest pressure",
            "wheezy": "wheezing",
            "stuffy nose": "nasal congestion",
            "runny nose": "rhinorrhea",
            
            # Cardiac
            "heart racing": "tachycardia",
            "heart pounding": "palpitations",
            "heart skipping": "irregular heartbeat",
            "chest flutter": "palpitations",
            "heart feels funny": "cardiac arrhythmia",
            
            # Neurological
            "brain fog": "cognitive impairment",
            "fuzzy thinking": "cognitive dysfunction",
            "can't think straight": "confusion",
            "head feels cloudy": "mental cloudiness",
            "seeing stars": "visual disturbances",
            "pins and needles": "paresthesia",
            "numbness": "paresthesia",
            "tingling": "paresthesia",
            
            # General symptoms
            "under the weather": "general malaise",
            "feeling crappy": "general malaise",
            "worn out": "fatigue",
            "wiped out": "exhaustion",
            "drained": "fatigue",
            "no energy": "fatigue",
            "achy all over": "generalized myalgia",
            "run down": "fatigue",
            
            # Fever and chills
            "burning up": "high fever",
            "hot and cold": "fever with chills",
            "shivering": "chills",
            "sweating buckets": "diaphoresis",
            "night sweats": "nocturnal diaphoresis",
            
            # Sleep issues
            "can't sleep": "insomnia",
            "tossing and turning": "sleep disturbance",
            "restless nights": "sleep disruption",
            "waking up tired": "non-restorative sleep",
            
            # Skin issues
            "itchy": "pruritus",
            "rash": "dermatitis",
            "red and bumpy": "erythematous rash",
            "swollen": "edema"
        }
        
        # Symptom intensity modifiers
        self.intensity_modifiers = {
            "mild": ["slight", "little bit", "somewhat", "a bit"],
            "moderate": ["pretty", "quite", "fairly", "moderate"],
            "severe": ["really bad", "terrible", "awful", "excruciating", "unbearable", "killing me", "worst ever"]
        }
        
        # Temporal indicators
        self.temporal_patterns = {
            r"since (\d+) days?": "duration: {} days",
            r"for (\d+) days?": "duration: {} days", 
            r"(\d+) days? ago": "onset: {} days ago",
            r"this morning": "onset: this morning",
            r"last night": "onset: last night",
            r"suddenly": "onset: sudden",
            r"gradually": "onset: gradual",
            r"all day": "duration: all day",
            r"on and off": "pattern: intermittent"
        }
    
    def translate_colloquial_to_medical(self, text: str) -> Dict[str, Any]:
        """Translate colloquial descriptions to medical terminology"""
        
        text_lower = text.lower()
        original_text = text
        
        medical_translations = {}
        detected_symptoms = []
        processed_text = text
        
        # Apply colloquial mappings
        for colloquial, medical in self.colloquial_mappings.items():
            if colloquial in text_lower:
                medical_translations[colloquial] = medical
                detected_symptoms.append(medical)
                # Replace in processed text (case-insensitive)
                pattern = re.compile(re.escape(colloquial), re.IGNORECASE)
                processed_text = pattern.sub(medical, processed_text)
        
        # Detect intensity
        intensity_found = []
        for intensity, modifiers in self.intensity_modifiers.items():
            for modifier in modifiers:
                if modifier in text_lower:
                    intensity_found.append(intensity)
                    break
        
        # Detect temporal patterns
        temporal_info = []
        for pattern, description in self.temporal_patterns.items():
            matches = re.findall(pattern, text_lower)
            if matches:
                for match in matches:
                    if isinstance(match, tuple):
                        temporal_info.append(description.format(*match))
                    else:
                        temporal_info.append(description.format(match))
        
        # Calculate confidence score
        confidence = self._calculate_confidence_score(text, medical_translations)
        
        return {
            "original_text": original_text,
            "processed_text": processed_text,
            "detected_symptoms": list(set(detected_symptoms)),  # Remove duplicates
            "medical_translations": medical_translations,
            "intensity_indicators": intensity_found,
            "temporal_information": temporal_info,
            "confidence_score": confidence
        }
    
    def _calculate_confidence_score(self, text: str, translations: Dict[str, str]) -> float:
        """Calculate confidence score for the translation"""
        
        if not translations:
            return 0.0
        
        # Base score on number of successful translations
        base_score = min(len(translations) * 0.3, 0.9)
        
        # Boost for multiple symptom indicators
        if len(translations) > 1:
            base_score += 0.1
        
        # Boost for medical keywords already present
        medical_keywords = ["pain", "symptom", "fever", "nausea", "headache", "dizzy"]
        medical_keyword_count = sum(1 for keyword in medical_keywords if keyword in text.lower())
        base_score += medical_keyword_count * 0.05
        
        return min(base_score, 1.0)

class SymptomNormalizer:
    """Normalizes symptom descriptions for better processing"""
    
    def __init__(self):
        self.synonym_groups = {
            "dizziness": ["dizzy", "lightheaded", "woozy", "unsteady", "off balance"],
            "nausea": ["nauseous", "queasy", "sick to stomach", "feel sick"],
            "fatigue": ["tired", "exhausted", "worn out", "drained", "no energy"],
            "pain": ["hurt", "ache", "sore", "tender", "discomfort"],
            "fever": ["high temperature", "burning up", "hot", "feverish"],
            "vomiting": ["throwing up", "puking", "retching", "being sick"]
        }
    
    def normalize_symptoms(self, symptoms: List[str]) -> List[str]:
        """Normalize symptom descriptions to standard terms"""
        
        normalized = []
        
        for symptom in symptoms:
            symptom_lower = symptom.lower().strip()
            
            # Find matching synonym group
            found_match = False
            for standard_term, synonyms in self.synonym_groups.items():
                if symptom_lower in synonyms or any(syn in symptom_lower for syn in synonyms):
                    if standard_term not in normalized:
                        normalized.append(standard_term)
                    found_match = True
                    break
            
            # If no match found, keep original (cleaned)
            if not found_match:
                cleaned_symptom = self._clean_symptom_text(symptom)
                if cleaned_symptom and cleaned_symptom not in normalized:
                    normalized.append(cleaned_symptom)
        
        return normalized
    
    def _clean_symptom_text(self, symptom: str) -> str:
        """Clean and standardize symptom text"""
        
        # Remove common non-medical words
        stop_words = ["i", "have", "feel", "feeling", "experiencing", "am", "been", "is", "are", "the", "a", "an"]
        
        words = symptom.lower().split()
        cleaned_words = [word for word in words if word not in stop_words]
        
        return " ".join(cleaned_words).strip()

# Initialize processors
colloquial_translator = ColloquialMedicalTranslator()
symptom_normalizer = SymptomNormalizer()

@router.post("/process-natural-language", response_model=NLUResponse)
async def process_natural_language(request: NLURequest):
    """Process natural language input to extract and translate medical concepts"""
    
    try:
        # Translate colloquial expressions
        translation_result = colloquial_translator.translate_colloquial_to_medical(request.text)
        
        # Normalize detected symptoms  
        normalized_symptoms = symptom_normalizer.normalize_symptoms(translation_result["detected_symptoms"])
        
        return NLUResponse(
            original_text=translation_result["original_text"],
            processed_text=translation_result["processed_text"],
            detected_symptoms=normalized_symptoms,
            medical_translations=translation_result["medical_translations"],
            confidence_score=translation_result["confidence_score"]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing natural language: {str(e)}")

@router.post("/translate-symptoms")
async def translate_symptoms(text: str):
    """Quick symptom translation endpoint"""
    
    try:
        result = colloquial_translator.translate_colloquial_to_medical(text)
        
        return {
            "original": text,
            "translations": result["medical_translations"],
            "processed": result["processed_text"],
            "symptoms": result["detected_symptoms"],
            "confidence": result["confidence_score"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error translating symptoms: {str(e)}")

@router.get("/supported-phrases")
async def get_supported_phrases():
    """Get list of supported colloquial phrases"""
    
    return {
        "colloquial_mappings": colloquial_translator.colloquial_mappings,
        "total_phrases": len(colloquial_translator.colloquial_mappings),
        "categories": [
            "dizziness_vertigo",
            "pain_descriptions", 
            "gastrointestinal",
            "respiratory",
            "cardiac",
            "neurological",
            "general_symptoms",
            "fever_chills",
            "sleep_issues",
            "skin_issues"
        ]
    }

@router.get("/health")
async def nlu_health_check():
    """Health check for natural language processing service"""
    
    return {
        "status": "healthy",
        "service": "natural_language_processor",
        "version": "1.0",
        "supported_languages": ["en"],
        "total_mappings": len(colloquial_translator.colloquial_mappings)
    }