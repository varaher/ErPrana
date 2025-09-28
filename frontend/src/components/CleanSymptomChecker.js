import React, { useState, useEffect, useRef } from 'react';
import './CleanSymptomChecker.css';

const CleanSymptomChecker = ({ user, onBack }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      message: `Hello! I'm ARYA, your health assistant. What is concerning you today? Hope your health is fine.`,
      timestamp: new Date()
    }
  ]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  // Conversation state to track symptoms and build clinical picture
  const [conversationState, setConversationState] = useState({
    chiefComplaint: '',
    symptoms: {},
    timeline: {},
    severity: null,
    associatedSymptoms: [],
    currentSystem: null,
    questionCount: 0,
    hasEnoughInfo: false
  });
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(transcript);
      };
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const addMessage = (type, message) => {
    const newMessage = {
      id: Date.now(),
      type,
      message,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  };
  
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return;
    
    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsTyping(true);
    
    // Add user message immediately
    addMessage('user', userMessage);
    
    // Reset focus to input after message is sent
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);

    // Process with enhanced medical knowledge
    const response = processSymptomWithMedicalKnowledge(userMessage);
    
    setTimeout(() => {
      addMessage('assistant', response);
      setIsTyping(false);
    }, 1000);
  };

  const processSymptomWithMedicalKnowledge = (userMessage) => {
    const messageLower = userMessage.toLowerCase().trim();
    
    // Handle greetings - don't treat as symptoms
    const greetingPatterns = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'];
    if (greetingPatterns.some(pattern => messageLower === pattern || messageLower.startsWith(pattern + ' '))) {
      return "Hello! I'm here to help you with your health concerns. Could you please tell me what specific symptoms or health issues are troubling you today?";
    }
    
    // Handle acknowledgments
    const acknowledgmentPatterns = ['thank you', 'thanks', 'okay', 'ok', 'yes', 'no', 'sure'];
    if (acknowledgmentPatterns.includes(messageLower)) {
      return "Is there anything specific about your health that's concerning you? Please describe your main symptoms.";
    }
    
    // Extract all medical information from the current message
    const extractedInfo = extractComprehensiveInfo(userMessage);
    
    // Update conversation state with new information
    const updatedState = updateConversationState(extractedInfo);
    
    // Check if we have enough information for assessment
    if (hasEnoughInfoForAssessment(updatedState)) {
      return generateClinicalAssessment(updatedState);
    }
    
    // If not enough info, ask intelligent follow-up questions
    return generateIntelligentFollowUp(updatedState, extractedInfo);
  };

  const extractComprehensiveInfo = (userMessage) => {
    const messageLower = userMessage.toLowerCase();
    const extractedInfo = {
      symptoms: [],
      location: null,
      temperature: null,
      duration: null,
      severity: null,
      associatedSymptoms: [],
      timeline: null,
      triggers: [],
      relievingFactors: [],
      medications: []
    };
    
    // Extract location information for pain
    if (messageLower.includes('lower abdomen') || messageLower.includes('lower belly')) {
      extractedInfo.location = 'lower abdomen';
    } else if (messageLower.includes('upper abdomen') || messageLower.includes('upper belly')) {
      extractedInfo.location = 'upper abdomen';
    } else if (messageLower.includes('right side') || messageLower.includes('right abdomen')) {
      extractedInfo.location = 'right abdomen';
    } else if (messageLower.includes('left side') || messageLower.includes('left abdomen')) {
      extractedInfo.location = 'left abdomen';
    } else if (messageLower.includes('abdomen') || messageLower.includes('belly') || messageLower.includes('stomach')) {
      extractedInfo.location = 'abdomen';
    }
    
    // Extract duration - more comprehensive patterns
    const durationPatterns = [
      /yesterday/gi,
      /today/gi,
      /(\d+)\s*days?\s*ago/gi,
      /(\d+)\s*hours?\s*ago/gi,
      /(\d+)\s*weeks?\s*ago/gi,
      /since\s*yesterday/gi,
      /since\s*today/gi,
      /since\s*(\d+)\s*days?/gi,
      /for\s*(\d+)\s*days?/gi,
      /started\s*yesterday/gi,
      /started\s*today/gi
    ];
    
    for (const pattern of durationPatterns) {
      const match = messageLower.match(pattern);
      if (match) {
        if (match[0].includes('yesterday')) {
          extractedInfo.duration = '1 day';
        } else if (match[0].includes('today')) {
          extractedInfo.duration = 'today';
        } else {
          extractedInfo.duration = match[0];
        }
        break;
      }
    }
    
    // Extract temperature
    const tempMatches = [
      /(\d+\.?\d*)\s*(?:degrees?|°|f|fahrenheit)/gi,
      /temp(?:erature)?\s*(?:is|of)?\s*(\d+\.?\d*)/gi,
      /(\d{2,3})\s*(?:fever|temp)/gi
    ];
    
    for (const pattern of tempMatches) {
      const match = messageLower.match(pattern);
      if (match) {
        extractedInfo.temperature = parseFloat(match[1]);
        break;
      }
    }
    
    // Extract symptoms
    const symptomKeywords = [
      'fever', 'headache', 'nausea', 'vomiting', 'cough', 'body aches', 
      'chills', 'fatigue', 'weakness', 'dizziness', 'chest pain', 
      'shortness of breath', 'abdominal pain', 'stomach pain', 'belly pain',
      'diarrhea', 'sore throat', 'pain'
    ];
    
    for (const symptom of symptomKeywords) {
      if (messageLower.includes(symptom)) {
        extractedInfo.symptoms.push(symptom);
      }
    }
    
    // Extract medications
    if (messageLower.includes('paracetamol') || messageLower.includes('acetaminophen') || messageLower.includes('tylenol')) {
      extractedInfo.medications.push('paracetamol');
    }
    if (messageLower.includes('ibuprofen') || messageLower.includes('advil')) {
      extractedInfo.medications.push('ibuprofen');
    }
    
    // Extract pattern information
    if (messageLower.includes('spike') || messageLower.includes('comes back')) {
      extractedInfo.timeline = 'recurrent';
    }
    if (messageLower.includes('4 hours') || messageLower.includes('four hours')) {
      extractedInfo.timeline = 'every_4_hours';
    }
    
    return extractedInfo;
  };

  const updateConversationState = (extractedInfo) => {
    const newState = { ...conversationState };
    
    // Set chief complaint if first symptom mention
    if (extractedInfo.symptoms.length > 0 && !newState.chiefComplaint) {
      newState.chiefComplaint = extractedInfo.symptoms[0];
    }
    
    // Update symptoms
    extractedInfo.symptoms.forEach(symptom => {
      newState.symptoms[symptom] = {
        present: true,
        severity: extractedInfo.severity,
        duration: extractedInfo.duration,
        location: extractedInfo.location
      };
    });
    
    // Update other info
    if (extractedInfo.location) newState.location = extractedInfo.location;
    if (extractedInfo.temperature) newState.temperature = extractedInfo.temperature;
    if (extractedInfo.duration) newState.duration = extractedInfo.duration;
    if (extractedInfo.timeline) newState.timeline = extractedInfo.timeline;
    if (extractedInfo.medications && extractedInfo.medications.length > 0) newState.medications = extractedInfo.medications;
    
    newState.questionCount += 1;
    
    console.log('Updated conversation state:', newState); // Debug log
    
    // Update state
    setConversationState(newState);
    return newState;
  };

  const hasEnoughInfoForAssessment = (state) => {
    // Check if we have sufficient information for clinical assessment
    const hasChiefComplaint = !!state.chiefComplaint;
    const hasLocation = !!state.location;
    const hasDuration = !!state.duration;
    const hasTemperature = !!state.temperature;
    
    console.log('Assessment check:', { hasChiefComplaint, hasLocation, hasDuration, hasTemperature, state }); // Debug
    
    // For abdominal pain: need location + duration OR temperature
    if (state.chiefComplaint === 'pain' || state.chiefComplaint === 'abdominal pain') {
      return hasChiefComplaint && hasLocation && (hasDuration || hasTemperature);
    }
    
    // For fever: need temperature + duration + associated symptoms
    if (state.chiefComplaint === 'fever') {
      const hasAssociatedSymptoms = Object.keys(state.symptoms).length >= 2;
      return hasChiefComplaint && hasTemperature && hasDuration && hasAssociatedSymptoms;
    }
    
    // General rule: need chief complaint + at least 2 pieces of key information
    const keyInfoCount = [hasLocation, hasDuration, hasTemperature].filter(Boolean).length;
    return hasChiefComplaint && keyInfoCount >= 2;
  };

  const generateClinicalAssessment = (state) => {
    let assessment = "**CLINICAL ASSESSMENT**\n\n";
    
    // Chief complaint summary
    assessment += `**Chief Complaint:** ${state.chiefComplaint}`;
    if (state.temperature) assessment += ` with temperature ${state.temperature}°F`;
    if (state.duration) assessment += ` for ${state.duration}`;
    assessment += "\n\n";
    
    // Associated symptoms
    const symptomList = Object.keys(state.symptoms).filter(s => s !== state.chiefComplaint);
    if (symptomList.length > 0) {
      assessment += `**Associated Symptoms:** ${symptomList.join(', ')}\n\n`;
    }
    
    // Pattern analysis
    if (state.timeline && state.medications) {
      assessment += `**Pattern:** Fever responds to ${state.medications.join('/')} but recurs suggesting ongoing infectious/inflammatory process.\n\n`;
    }
    
    // 5 Provisional Diagnoses
    assessment += "**PROVISIONAL DIAGNOSES (in order of likelihood):**\n\n";
    
    const diagnoses = generateProvisionalDiagnoses(state);
    diagnoses.forEach((diagnosis, index) => {
      assessment += `${index + 1}. **${diagnosis.name}** (${diagnosis.probability})\n`;
      assessment += `   - ${diagnosis.reasoning}\n`;
      assessment += `   - Triage: ${diagnosis.triage}\n\n`;
    });
    
    // Recommendations
    assessment += "**RECOMMENDATIONS:**\n";
    assessment += "• Continue fever monitoring\n";
    assessment += "• Maintain hydration\n";
    assessment += "• Seek medical attention if fever >102°F or symptoms worsen\n";
    assessment += "• Consider blood tests if fever persists >3 days\n\n";
    
    assessment += "⚠️ **Disclaimer:** This assessment is for educational purposes. Please consult a healthcare professional for proper diagnosis and treatment.";
    
    return assessment;
  };

  const generateProvisionalDiagnoses = (state) => {
    const diagnoses = [];
    
    // Abdominal pain diagnoses
    if ((state.chiefComplaint === 'pain' || state.chiefComplaint === 'abdominal pain') && state.location === 'lower abdomen') {
      diagnoses.push({
        name: "Gastroenteritis",
        probability: "60%",
        reasoning: "Lower abdominal pain with acute onset - common cause of GI discomfort",
        triage: "🟡 MODERATE - Monitor symptoms, ensure hydration"
      });
      
      diagnoses.push({
        name: "Urinary Tract Infection (UTI)",
        probability: "45%",
        reasoning: "Lower abdominal pain can be associated with bladder/urinary tract issues",
        triage: "🟡 MODERATE - Consider urinalysis if pain persists"
      });
      
      diagnoses.push({
        name: "Appendicitis (early)",
        probability: "35%",
        reasoning: "Lower abdominal pain, especially if progressing - needs monitoring",
        triage: "🟡 MODERATE - Seek care if pain worsens or fever develops"
      });
      
      diagnoses.push({
        name: "Muscle strain/Gas pain",
        probability: "40%",
        reasoning: "Benign causes of lower abdominal discomfort",
        triage: "🟢 LOW - Conservative management, monitor progression"
      });
      
      diagnoses.push({
        name: "Gynecological causes (if female)",
        probability: "30%",
        reasoning: "Ovarian cysts, menstrual-related pain in lower abdomen",
        triage: "🟢 LOW-MODERATE - Monitor, gynecologic evaluation if persistent"
      });
    }
    
    // Fever diagnoses (existing code)
    else if (state.symptoms.fever && state.symptoms.nausea && state.symptoms['body aches']) {
      diagnoses.push({
        name: "Viral Gastroenteritis",
        probability: "75%",
        reasoning: "Classic triad of fever, nausea, and body aches with 2-day duration",
        triage: "🟡 MODERATE - Monitor, seek care if worsening"
      });
      
      diagnoses.push({
        name: "Viral Syndrome (URI/Flu-like)",
        probability: "65%",
        reasoning: "Systemic symptoms with fever pattern responsive to antipyretics",
        triage: "🟡 MODERATE - Symptomatic care, monitor progression"
      });
      
      diagnoses.push({
        name: "Early Bacterial Infection",
        probability: "45%",
        reasoning: "Fever pattern with recurrence despite medication suggests possible bacterial component",
        triage: "🟡 MODERATE - Consider medical evaluation if fever persists >3 days"
      });
      
      diagnoses.push({
        name: "Food Poisoning/Toxin-mediated illness",
        probability: "35%",
        reasoning: "GI symptoms with fever and body aches, short duration",
        triage: "🟢 LOW-MODERATE - Supportive care unless severe dehydration"
      });
      
      diagnoses.push({
        name: "Medication reaction/Heat-related illness",
        probability: "20%",
        reasoning: "Less likely but possible given fever pattern",
        triage: "🟢 LOW - Monitor, discontinue any new medications"
      });
    }
    
    return diagnoses;
  };

  const generateIntelligentFollowUp = (state, extractedInfo) => {
    console.log('Follow-up check:', { state, extractedInfo }); // Debug
    
    // If we have some info but not enough, ask targeted questions
    if (state.chiefComplaint) {
      
      // For abdominal/stomach pain
      if ((state.chiefComplaint === 'pain' || state.chiefComplaint === 'abdominal pain') && !state.location && !extractedInfo.location) {
        return "You mentioned abdominal pain. Where exactly is the pain located? (upper abdomen, lower abdomen, right side, left side)";
      }
      
      // If we have location but no duration
      if (state.location && !state.duration && !extractedInfo.duration) {
        return `I see you have ${state.location} pain. When did this start? How long have you had this pain?`;
      }
      
      // For fever without temperature
      if (state.symptoms.fever && !state.temperature) {
        return "I see you have a fever. What's your current temperature reading?";
      }
      
      // If we have basic info but need associated symptoms
      if (state.duration && (state.location || state.temperature) && Object.keys(state.symptoms).length < 2) {
        return `Besides ${state.chiefComplaint}, are you experiencing any other symptoms like nausea, vomiting, fever, or changes in bowel movements?`;
      }
      
      // If we still don't have duration after multiple attempts
      if (!state.duration && state.questionCount > 1) {
        return `To help assess your ${state.chiefComplaint}, I need to know when this started. Was it today, yesterday, or several days ago?`;
      }
    }
    
    // First interaction - identify chief complaint
    return `I understand your concern. Could you tell me your main symptom that brought you here today?`;
  };

  // Removed individual symptom handlers - now using comprehensive processing
  
  const startVoiceInput = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="clean-chat-container">
      <div className="chat-header">
        <button className="back-btn" onClick={onBack}>
          ← Back to ErPrana
        </button>
        <div className="chat-title">
          <h2>ARYA Health Assistant</h2>
          <span className="online-status">● Online</span>
        </div>
      </div>
      
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message-wrapper ${msg.type}`}>
            <div className="message-content">
              {msg.type === 'assistant' && (
                <div className="avatar">🌿</div>
              )}
              {msg.type === 'user' && (
                <div className="avatar user-avatar">{user?.fullName ? user.fullName[0] : 'U'}</div>
              )}
              <div className="message-bubble">
                <p>{msg.message}</p>
                <span className="timestamp">
                  {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="message-wrapper assistant">
            <div className="message-content">
              <div className="avatar">🌿</div>
              <div className="message-bubble">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div className="chat-input-area">
        <div className="input-container">
          <button
            className={`voice-btn ${isListening ? 'listening' : ''}`}
            onClick={startVoiceInput}
            disabled={isTyping}
          >
            {isListening ? '⏹️' : '🎤'}
          </button>
          
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe your symptoms..."
            className="message-input"
            disabled={isTyping || isListening}
          />
          
          <button
            className="send-btn"
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isTyping || isListening}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
};

export default CleanSymptomChecker;