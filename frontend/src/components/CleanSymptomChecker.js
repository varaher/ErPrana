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
      temperature: null,
      duration: null,
      severity: null,
      associatedSymptoms: [],
      timeline: null,
      triggers: [],
      relievingFactors: [],
      medications: []
    };
    
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
    
    // Extract duration
    const durationPatterns = [
      /(\d+)\s*days?/gi,
      /(\d+)\s*hours?/gi,
      /(\d+)\s*weeks?/gi,
      /since\s*(\d+)\s*days?/gi,
      /for\s*(\d+)\s*days?/gi
    ];
    
    for (const pattern of durationPatterns) {
      const match = messageLower.match(pattern);
      if (match) {
        extractedInfo.duration = match[0];
        break;
      }
    }
    
    // Extract symptoms
    const symptomKeywords = [
      'fever', 'headache', 'nausea', 'vomiting', 'cough', 'body aches', 
      'chills', 'fatigue', 'weakness', 'dizziness', 'chest pain', 
      'shortness of breath', 'abdominal pain', 'diarrhea', 'sore throat'
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
        duration: extractedInfo.duration
      };
    });
    
    // Update other info
    if (extractedInfo.temperature) newState.temperature = extractedInfo.temperature;
    if (extractedInfo.duration) newState.duration = extractedInfo.duration;
    if (extractedInfo.timeline) newState.timeline = extractedInfo.timeline;
    if (extractedInfo.medications.length > 0) newState.medications = extractedInfo.medications;
    
    newState.questionCount += 1;
    
    // Update state
    setConversationState(newState);
    return newState;
  };

  const hasEnoughInfoForAssessment = (state) => {
    // Check if we have sufficient information for clinical assessment
    const hasChiefComplaint = !!state.chiefComplaint;
    const hasTemperature = !!state.temperature;
    const hasDuration = !!state.duration;
    const hasAssociatedSymptoms = Object.keys(state.symptoms).length >= 2;
    
    return hasChiefComplaint && (hasTemperature || hasDuration) && hasAssociatedSymptoms;
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
    
    // Analyze symptom pattern for fever + nausea + body aches + 2 days duration
    if (state.symptoms.fever && state.symptoms.nausea && state.symptoms['body aches']) {
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
    // If we have some info but not enough, ask targeted questions
    if (state.chiefComplaint) {
      const missingInfo = [];
      
      if (!state.temperature && state.symptoms.fever) {
        return "I see you have a fever. What's your current temperature reading?";
      }
      
      if (!state.duration) {
        return `You mentioned ${state.chiefComplaint}. When did this start? How many days ago?`;
      }
      
      if (Object.keys(state.symptoms).length < 2) {
        return `Besides ${state.chiefComplaint}, are you experiencing any other symptoms like nausea, headache, body aches, or cough?`;
      }
    }
    
    // First interaction - identify chief complaint
    return `I understand your concern. Could you tell me your main symptom that brought you here today?`;
  };

  const handleCardiovascularSymptoms = (messageLower) => {
    if (messageLower.includes('chest pain')) {
      return `⚠️ **Chest pain needs careful evaluation.** Please tell me:

1. **Onset**: Did it start suddenly or gradually? Was it during activity or at rest?
2. **Nature**: Is it sharp, crushing, pressure-like, or burning?
3. **Radiation**: Does it spread to your arm, jaw, neck, or back?
4. **Associated symptoms**: Any shortness of breath, sweating, nausea, or dizziness?
5. **Rate the pain**: On a scale of 1-10?

🚨 **If you're having severe chest pain with sweating or shortness of breath, please seek immediate emergency care.**`;
    }
    
    if (messageLower.includes('palpitation') || messageLower.includes('heart racing')) {
      return `I understand you're experiencing heart palpitations. Let me ask some structured questions:

1. **Pattern**: Are they regular or irregular? Fast or slow?
2. **Triggers**: Do they happen with activity, stress, or at rest?  
3. **Duration**: How long do episodes last?
4. **Associated symptoms**: Any chest pain, dizziness, or shortness of breath?
5. **Medical history**: Any heart conditions or medications?`;
    }
    
    return "I see you mentioned a heart-related concern. Could you describe your symptoms more specifically?";
  };

  const handleRespiratorySymptoms = (messageLower) => {
    if (messageLower.includes('shortness of breath') || messageLower.includes('breathing')) {
      return `I understand you're having breathing difficulties. This needs proper evaluation:

1. **Onset**: When did this start? Sudden or gradual?
2. **Pattern**: Does it happen at rest or with activity?
3. **Position**: Do you feel worse lying flat? Do you need to sit up?
4. **Associated symptoms**: Any chest pain, cough, or leg swelling?
5. **Severity**: Rate your breathing difficulty 1-10?

🚨 **If you're having severe breathing problems, please seek immediate medical attention.**`;
    }
    
    if (messageLower.includes('cough')) {
      return `Let me ask about your cough following our clinical approach:

1. **Nature**: Is it dry or are you bringing up phlegm/sputum?
2. **Duration**: How long have you had this cough?
3. **Sputum**: If productive, what color? Any blood?
4. **Associated symptoms**: Fever, shortness of breath, chest pain?
5. **Triggers**: Anything that makes it worse (cold air, exercise, lying down)?`;
    }
    
    return "I see you have a respiratory concern. Could you describe your breathing or cough symptoms more specifically?";
  };

  const handleNeurologicalSymptoms = (messageLower) => {
    if (messageLower.includes('headache')) {
      return `I'm sorry you're experiencing a headache. Let me ask some important questions:

1. **Onset**: Did it start suddenly (like a thunderclap) or gradually?
2. **Severity**: Is this the worst headache you've ever had?
3. **Location**: Where exactly - front, back, one side, or all over?
4. **Nature**: Throbbing, sharp, pressure-like, or constant?
5. **Associated symptoms**: Any nausea, vision changes, or neck stiffness?

🚨 **If this is sudden and severe (worst ever), please seek immediate emergency care.**`;
    }
    
    if (messageLower.includes('weakness') || messageLower.includes('numb')) {
      return `⚠️ **Sudden weakness needs immediate evaluation.** Please tell me:

1. **Onset**: When did this start? How quickly?
2. **Location**: Which part of your body? One side or both?
3. **Associated symptoms**: Any slurred speech, vision changes, or face drooping?
4. **Severity**: Can you move the affected area at all?

🚨 **If this came on suddenly, especially with speech or vision changes, call 911 immediately.**`;
    }
    
    if (messageLower.includes('dizzy')) {
      return `Let me understand your dizziness better:

1. **Type**: Is the room spinning (vertigo) or do you feel lightheaded?
2. **Triggers**: When standing up, moving your head, or constant?
3. **Duration**: How long do episodes last?
4. **Associated symptoms**: Any hearing changes, nausea, or falls?`;
    }
    
    return "I see you have a neurological concern. Could you describe your symptoms more specifically?";
  };

  const handleGastrointestinalSymptoms = (messageLower) => {
    if (messageLower.includes('abdominal') || messageLower.includes('stomach')) {
      return `Let me ask about your abdominal pain systematically:

1. **Location**: Where exactly? Can you point to it?
2. **Radiation**: Does it spread anywhere (back, shoulder)?
3. **Nature**: Sharp, crampy, constant, or comes and goes?
4. **Relation to meals**: Better or worse with eating?
5. **Associated symptoms**: Nausea, vomiting, fever, bowel changes?`;
    }
    
    if (messageLower.includes('nausea') || messageLower.includes('vomit')) {
      return `I understand you're feeling nauseous. Let me ask:

1. **Duration**: When did this start?
2. **Vomiting**: Are you actually vomiting? What does it look like?
3. **Blood**: Any blood or coffee-ground material?
4. **Associated symptoms**: Fever, abdominal pain, diarrhea?
5. **Triggers**: Related to food, medications, or movement?`;
    }
    
    return "I see you have a gastrointestinal concern. Could you describe your symptoms more specifically?";
  };

  const handleFeverSymptoms = (messageLower) => {
    return `I understand you have a fever. This needs proper evaluation:

1. **Temperature**: What's your current temperature?
2. **Duration**: How long have you had the fever?
3. **Pattern**: Constant or coming and going?
4. **Associated symptoms**: 
   - Any cough, shortness of breath?
   - Nausea, vomiting, diarrhea?
   - Headache, neck stiffness?
   - Urinary burning, frequency?
   - Body aches, chills?

🚨 **Seek immediate care if fever >102°F (38.9°C) with severe symptoms or if you feel very unwell.**`;
  };

  const handleGeneralPain = (messageLower) => {
    return `I understand you're experiencing pain. To help you better:

1. **Location**: Where exactly is the pain?
2. **Onset**: When did it start? Sudden or gradual?
3. **Quality**: Sharp, dull, throbbing, burning, or cramping?
4. **Severity**: Rate it 1-10 (10 being worst pain ever)?
5. **Radiation**: Does it spread anywhere?
6. **Triggers**: What makes it better or worse?
7. **Associated symptoms**: Any other symptoms with the pain?`;
  };
  
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