from typing import Optional
import re

class ConversationalLayer:
    """
    Natural conversational response layer for handling greetings, 
    small talk, and casual interactions before medical assessment
    """
    
    def __init__(self):
        self.greeting_responses = [
            "Hello! I'm ARYA, your Personal Health Assistant. I'm here to listen and help with any health concerns you have. What's on your mind today?",
            "Hi! I'm ARYA, your Personal Health Assistant. Think of me as someone you can talk to about your health. How are you feeling?",
            "Hey there! I'm ARYA, your Personal Health Assistant. I'm here for you. What would you like to talk about today?"
        ]
        
        self.good_responses = [
            "That's wonderful to hear! 😊 I'm glad you're feeling well. Is there anything specific I can help you with today?",
            "Great! 🌟 It's always good to check in on your health. Any particular concerns or questions?",
            "Excellent! 💚 Preventive health care is so important. What would you like to discuss?"
        ]
        
        self.acknowledgments = [
            "I understand. I'm here to help you.",
            "Thank you for sharing that with me.",
            "I hear you. Let's work through this together.",
            "That's helpful to know. I'm listening."
        ]
        
        self.empathetic_responses = {
            "worried": "I can understand why you might feel worried. Let's talk about what's going on.",
            "scared": "It's okay to feel scared. I'm here to help you understand what's happening.",
            "pain": "I'm sorry you're experiencing pain. Let me help you figure out the best next steps.",
            "confused": "I can help clarify things for you. Let's take it step by step.",
            "tired": "Being tired and not feeling well can be tough. Let's see what might be going on."
        }
    
    def get_empathetic_response(self, user_input: str) -> Optional[str]:
        """
        Detect emotional keywords and provide empathetic response
        """
        user_input_lower = user_input.lower()
        
        for emotion, response in self.empathetic_responses.items():
            if emotion in user_input_lower:
                return response
        
        return None
    
    def check_small_talk(self, user_input: str) -> Optional[str]:
        """
        Check if user input is small talk/greeting and return appropriate response
        Returns None if it's medical content that needs proper routing
        """
        text = user_input.lower().strip()
        
        # First check for emotional content that needs empathy
        empathetic_response = self.get_empathetic_response(user_input)
        if empathetic_response:
            return empathetic_response
        
        # Simple greetings
        if re.match(r'^(hi|hello|hey|hiya|yo)$', text):
            return "Hello! 😊 I'm ARYA, your health assistant. How are you feeling today?"
        
        if re.match(r'^(good morning|morning)$', text):
            return "Good morning! 🌞 Hope your day starts well. How are you feeling today?"
        
        if re.match(r'^(good afternoon|afternoon)$', text):
            return "Good afternoon! ☀️ How can I assist with your health today?"
        
        if re.match(r'^(good evening|evening)$', text):
            return "Good evening! 🌙 I'm here to check on your health. What's bothering you?"
        
        if re.match(r'^(good night|night)$', text):
            return "Good night! 🌙 Sleep well and take care of your health. Feel free to reach out anytime!"
        
        # Thank you responses
        if any(word in text for word in ['thank', 'thanks', 'appreciate']):
            return "You're very welcome! 💚 I'm glad I could help. How are you feeling now?"
        
        # How are you responses
        if 'how are you' in text:
            return "I'm great, thank you for asking! 😊 How about you — are you feeling well today?"
        
        # Goodbye responses
        if any(word in text for word in ['bye', 'goodbye', 'see you', 'farewell']):
            return "Goodbye! 👋 Take care of yourself, and remember — your health matters. Feel free to return anytime!"
        
        # Feeling good responses
        if any(phrase in text for phrase in ['feeling good', 'feeling fine', 'feeling well', 'feeling ok', 'feeling okay', 'im good', 'im fine', 'im ok', 'im okay', 'all good']):
            return "That's wonderful to hear! 😊 I'm glad you're feeling well. Is there anything specific I can help you with today?"
        
        # Feeling bad but non-specific
        if any(phrase in text for phrase in ['not feeling well', 'feeling bad', 'not good', 'unwell']):
            return "I'm sorry to hear you're not feeling well. 💙 Can you tell me more about what's bothering you? Any specific symptoms?"
        
        # General health check
        if text in ['health check', 'check up', 'routine check']:
            return "Great that you're being proactive about your health! 👩‍⚕️ What would you like to discuss or check on today?"
        
        # Confused/unclear responses
        if any(phrase in text for phrase in ['what', 'huh', 'confused', 'dont understand', "don't understand"]):
            return "No worries! 😊 I'm here to help with any health concerns or symptoms you might have. Just tell me what's bothering you in your own words."
        
        # Help requests
        if text in ['help', 'help me', 'need help']:
            return "Of course! I'm here to help with your health concerns. 🏥 What symptoms or health issues are you experiencing?"
        
        return None  # Not small talk - pass to medical engines
    
    def is_medical_content(self, user_input: str) -> bool:
        """
        Check if user input contains medical content that should be routed to medical engines
        """
        text = user_input.lower()
        
        # Medical keywords that indicate symptoms/complaints
        medical_keywords = [
            'fever', 'temperature', 'hot', 'chills',
            'pain', 'hurt', 'ache', 'aching',
            'headache', 'migraine',
            'chest pain', 'chest', 
            'shortness of breath', 'breathless', 'breathing',
            'cough', 'sore throat',
            'nausea', 'vomiting', 'sick',
            'diarrhea', 'constipation',
            'dizziness', 'dizzy', 'lightheaded',
            'fatigue', 'tired', 'weakness',
            'rash', 'itching',
            'swelling', 'swollen',
            'bleeding', 'blood',
            'infection', 'infected',
            'symptoms', 'symptom',
            'days', 'hours', 'weeks',  # Duration indicators
            'since', 'for',  # Duration phrases
            'doctor', 'hospital', 'emergency',
            'medication', 'medicine', 'drug',
            'diagnosis', 'condition', 'disease'
        ]
        
        return any(keyword in text for keyword in medical_keywords)
    
    def handle_input(self, user_input: str) -> tuple[Optional[str], bool]:
        """
        Process user input and determine if it's small talk or medical content
        
        Returns:
            tuple: (response_text or None, is_medical_content)
        """
        # First check for small talk
        small_talk_response = self.check_small_talk(user_input)
        if small_talk_response:
            return (small_talk_response, False)
        
        # Check if it's medical content
        is_medical = self.is_medical_content(user_input)
        
        if not is_medical:
            # Check for vague symptoms that need clarification
            if any(word in user_input.lower() for word in ['uneasy', 'unwell', 'sick', 'bad', 'awful', 'terrible']):
                return ("I understand you're not feeling well. Can you describe your specific symptoms? (e.g., pain, fever, nausea, difficulty moving, etc.)", False)
            # Not clear small talk or medical - ask for clarification
            return ("I'd love to help! Can you tell me a bit more about what's concerning you health-wise today? 🏥", False)
        
        # It's medical content - let the medical engines handle it
        return (None, True)

# Global instance
conversational_layer = ConversationalLayer()