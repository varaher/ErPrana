# services/complaint_detection.py
# Enhanced Chief Complaint Detection with Synonym Mapping and Fuzzy Matching

import re
from typing import Optional, List, Tuple
from rapidfuzz import process, fuzz
import os
from pymongo import MongoClient
from datetime import datetime, timezone

# ==========================================================
# 🔍 Comprehensive Synonym Mapping Dictionary
# ==========================================================
SYMPTOM_SYNONYMS = {
    # 🟥 Chest Pain & Cardiac
    "chest heaviness": "chest pain",
    "chest tightness": "chest tightness",
    "pressure in chest": "chest pain",
    "heart pain": "chest pain",
    "pain in chest": "chest pain",
    "chest discomfort": "chest pain",
    "chest squeezing": "chest pain",
    "pain in heart area": "chest pain",
    "angina": "chest pain",
    "burning in chest": "chest pain",
    "cardiac pain": "chest pain",
    "tight chest": "chest tightness",
    
    # 🟥 Shortness of Breath
    "breathlessness": "shortness of breath",
    "difficulty breathing": "shortness of breath",
    "cannot breathe": "shortness of breath",
    "trouble breathing": "shortness of breath",
    "gasping for air": "shortness of breath",
    "wheezing": "shortness of breath",
    "panting": "shortness of breath",
    "breathing problem": "shortness of breath",
    "breath tightness": "shortness of breath",
    "suffocation": "shortness of breath",

    # 🟥 Fever
    "high temperature": "fever",
    "elevated temperature": "fever",
    "hot body": "fever",
    "feverish": "fever",
    "chills and fever": "fever",
    "body heat": "fever",
    "hot and cold shivering": "fever",
    "temperature": "fever",

    # 🟥 Headache
    "head pain": "headache",
    "migraine": "headache",
    "pain in head": "headache",
    "throbbing head": "headache",
    "pressure in head": "headache",
    "temple pain": "headache",
    "pain in head and neck": "headache",

    # 🟥 Abdominal Pain
    "stomach pain": "severe abdominal pain",
    "belly pain": "severe abdominal pain",
    "tummy ache": "severe abdominal pain",
    "pain in stomach": "severe abdominal pain",
    "lower abdomen pain": "severe abdominal pain",
    "upper stomach pain": "severe abdominal pain",
    "cramps": "severe abdominal pain",
    "gas pain": "severe abdominal pain",
    "epigastric pain": "severe abdominal pain",
    "abdominal pain": "severe abdominal pain",

    # 🟥 Altered Mental Status
    "confusion": "altered mental status",
    "not responding": "altered mental status",
    "unresponsive": "unconsciousness",
    "disoriented": "altered mental status",
    "acting strange": "altered mental status",
    "unconscious": "unconsciousness",

    # 🟥 Dizziness / Syncope
    "giddiness": "dizziness",
    "dizzy": "dizziness",
    "lightheaded": "dizziness",
    "feeling faint": "syncope",
    "off balance": "dizziness",
    "spinning": "dizziness",
    "vertigo": "dizziness",
    "passed out": "syncope",
    "fainted": "syncope",
    "blackout": "syncope",
    "passing out": "syncope",
    "blacking out": "syncope",

    # 🟥 Seizures
    "fits": "seizures",
    "convulsions": "seizures",
    "jerking movements": "seizures",
    "epileptic attack": "seizures",
    "shaking episode": "seizures",

    # 🟥 Vomiting / Nausea
    "throwing up": "hematemesis",
    "puking": "hematemesis",
    "retching": "hematemesis",
    "vomiting": "hematemesis",
    "nauseous": "hematemesis",
    "feeling sick": "hematemesis",
    "want to vomit": "hematemesis",
    "vomiting blood": "hematemesis",
    "blood in vomit": "hematemesis",

    # 🟥 Diarrhea
    "loose stools": "diarrhea",
    "frequent stools": "diarrhea",
    "runny stools": "diarrhea",
    "watery stool": "diarrhea",
    "loose motion": "diarrhea",
    "diarrhea": "diarrhea",

    # 🟥 Bleeding
    "bloody stools": "severe bleeding",
    "blood in stool": "severe bleeding",
    "bleeding from nose": "severe bleeding",
    "nosebleed": "severe bleeding",
    "bleeding wound": "severe bleeding",
    "vomit blood": "hematemesis",

    # 🟥 Weakness
    "weakness": "weakness acute",
    "feeling weak": "weakness acute",
    "tiredness": "weakness acute",
    "exhausted": "weakness acute",
    "no energy": "weakness acute",
    "lethargy": "weakness acute",

    # 🟥 Palpitations
    "racing heart": "palpitations",
    "fluttering in chest": "palpitations",
    "fast heartbeat": "palpitations",
    "heart racing": "palpitations",
    "irregular heartbeat": "palpitations",

    # 🟥 Stroke Symptoms
    "face drooping": "stroke symptoms",
    "arm weakness": "stroke symptoms",
    "speech slurred": "stroke symptoms",
    "slurred speech": "stroke symptoms",
    "facial droop": "stroke symptoms",

    # 🟥 Vision Loss
    "sudden blindness": "sudden vision loss",
    "cannot see": "sudden vision loss",
    "vision loss": "sudden vision loss",
    "blind": "sudden vision loss",

    # 🟧 Trauma
    "injury": "trauma",
    "fall": "trauma",
    "accident": "trauma",
    "wound": "trauma",
    "hit on head": "trauma",

    # 🟧 Swelling / Edema
    "puffy legs": "edema",
    "leg swelling": "edema",
    "swollen feet": "edema",
    "fluid in legs": "edema",

    # 🟧 Blood Pressure
    "low blood pressure": "hypotension",
    "bp low": "hypotension",
    "hypotension": "hypotension",

    # 🟩 Cough / Cold
    "cough": "cough",
    "cold and cough": "cough",
    "dry cough": "cough",
    "runny nose": "cold",
    "sneezing": "cold",
    "blocked nose": "cold",
    "nasal congestion": "cold",
    
    # 🟩 Pain
    "body pain": "body ache",
    "muscle pain": "body ache",
    "joint pain": "joint pain",
    "back pain": "back pain",
    "lower back pain": "back pain",
    "backache": "back pain",

    # 🟩 Digestive
    "heartburn": "heartburn",
    "acid reflux": "heartburn",
    "burning in stomach": "heartburn",
    "indigestion": "heartburn",
    "bloating": "bloating",
    
    # Anaphylaxis triggers
    "allergic reaction": "anaphylaxis",
    "allergy": "anaphylaxis",
    "swelling throat": "anaphylaxis",
    "trouble swallowing": "anaphylaxis"
}

# ==========================================================
# 🧠 Enhanced Complaint Detection Class
# ==========================================================
class ComplaintDetector:
    """
    Enhanced chief complaint detection with:
    - Comprehensive synonym mapping
    - Fuzzy string matching for typos
    - Multi-symptom detection
    - Unknown term logging
    """
    
    def __init__(self):
        self.synonyms = SYMPTOM_SYNONYMS
        self.synonym_keys = list(SYMPTOM_SYNONYMS.keys())
        
        # MongoDB for logging unknown terms
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        self.client = MongoClient(mongo_url)
        self.db = self.client["erprana"]
        self.unknown_terms = self.db["unknown_terms"]
    
    def normalize_text(self, text: str) -> str:
        """Normalize user input text"""
        text = text.lower().strip()
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        return text
    
    def detect_complaint(self, user_input: str) -> Optional[str]:
        """
        Main complaint detection method
        Returns standardized complaint name or None
        """
        text = self.normalize_text(user_input)
        
        # Step 1: Try exact match in synonyms
        if text in self.synonyms:
            complaint = self.synonyms[text]
            print(f"✅ Exact match: '{text}' → '{complaint}'")
            return complaint
        
        # Step 2: Try partial match (contains)
        for synonym, complaint in self.synonyms.items():
            if synonym in text or text in synonym:
                print(f"✅ Partial match: '{text}' contains '{synonym}' → '{complaint}'")
                return complaint
        
        # Step 3: Try fuzzy matching for typos
        fuzzy_result = self._fuzzy_match(text)
        if fuzzy_result:
            print(f"✅ Fuzzy match: '{text}' → '{fuzzy_result}'")
            return fuzzy_result
        
        # Step 4: Try multi-symptom detection
        multi_symptoms = self._detect_multiple_symptoms(text)
        if multi_symptoms:
            # Return the highest priority symptom
            priority_complaint = self._get_highest_priority(multi_symptoms)
            print(f"✅ Multi-symptom detected: {multi_symptoms} → prioritizing '{priority_complaint}'")
            return priority_complaint
        
        # Step 5: Log unknown term
        self._log_unknown_term(text)
        print(f"⚠️  Unknown complaint: '{text}'")
        return None
    
    def _fuzzy_match(self, text: str, threshold: int = 80) -> Optional[str]:
        """
        Fuzzy string matching for handling typos
        Uses rapidfuzz for efficient matching
        """
        try:
            # Find best match from synonym keys
            result = process.extractOne(
                text,
                self.synonym_keys,
                scorer=fuzz.ratio,
                score_cutoff=threshold
            )
            
            if result:
                matched_synonym, score, _ = result
                complaint = self.synonyms[matched_synonym]
                print(f"   Fuzzy match score: {score}% ('{text}' ≈ '{matched_synonym}')")
                return complaint
        except Exception as e:
            print(f"   Fuzzy matching error: {e}")
        
        return None
    
    def _detect_multiple_symptoms(self, text: str) -> List[str]:
        """
        Detect multiple symptoms in a single input
        Example: "chest pain and sweating" → ["chest pain", "sweating"]
        """
        # Split on common separators
        tokens = re.split(r'\s+and\s+|,\s*|\s+with\s+|\s+along\s+with\s+|\s+followed\s+by\s+', text)
        
        detected_complaints = []
        for token in tokens:
            token = token.strip()
            if not token:
                continue
            
            # Check if token matches a complaint
            if token in self.synonyms:
                complaint = self.synonyms[token]
                if complaint not in detected_complaints:
                    detected_complaints.append(complaint)
            else:
                # Try fuzzy match on token
                fuzzy = self._fuzzy_match(token, threshold=75)
                if fuzzy and fuzzy not in detected_complaints:
                    detected_complaints.append(fuzzy)
        
        return detected_complaints
    
    def _get_highest_priority(self, complaints: List[str]) -> str:
        """
        Return highest priority complaint from a list
        Priority order: Red > Orange > Yellow > Green
        """
        # Define priority levels (higher = more urgent)
        priority_map = {
            # Red level (highest priority)
            "chest pain": 100,
            "chest tightness": 100,
            "shortness of breath": 95,
            "stroke symptoms": 95,
            "unconsciousness": 95,
            "seizures": 90,
            "hematemesis": 90,
            "severe bleeding": 90,
            "anaphylaxis": 95,
            "altered mental status": 90,
            "syncope": 85,
            "hemoptysis": 85,
            "sudden vision loss": 85,
            "severe abdominal pain": 85,
            "weakness acute": 80,
            "cyanosis": 90,
            "hypotension": 85,
            "palpitations": 80,
            
            # Orange/Yellow level
            "fever": 70,
            "headache": 70,
            "dizziness": 60,
            
            # Lower priority
            "cough": 40,
            "cold": 30,
            "body ache": 30,
            "back pain": 35,
            "heartburn": 25
        }
        
        # Find complaint with highest priority
        max_priority = -1
        priority_complaint = complaints[0]
        
        for complaint in complaints:
            priority = priority_map.get(complaint, 50)  # default priority
            if priority > max_priority:
                max_priority = priority
                priority_complaint = complaint
        
        return priority_complaint
    
    def _log_unknown_term(self, text: str):
        """Log unknown terms for future synonym expansion"""
        try:
            self.unknown_terms.update_one(
                {"term": text},
                {
                    "$inc": {"count": 1},
                    "$set": {"last_seen": datetime.now(timezone.utc).isoformat()}
                },
                upsert=True
            )
        except Exception as e:
            print(f"Error logging unknown term: {e}")
    
    def get_unknown_terms(self, min_count: int = 2) -> List[dict]:
        """Get frequently occurring unknown terms for review"""
        return list(self.unknown_terms.find(
            {"count": {"$gte": min_count}}
        ).sort("count", -1).limit(50))

# Global instance
complaint_detector = ComplaintDetector()
