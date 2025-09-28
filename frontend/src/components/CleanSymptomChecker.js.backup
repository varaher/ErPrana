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
  const [showFeedback, setShowFeedback] = useState(false);
  const [assessmentComplete, setAssessmentComplete] = useState(false);
  const [finalDiagnoses, setFinalDiagnoses] = useState([]);
  
  // Simple conversation state - LLM will manage the intelligence
  const [conversationState, setConversationState] = useState({});
  const [sessionId] = useState(`session_${Date.now()}_${Math.random()}`);
  
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
      id: Date.now() + Math.random(),
      type,
      message,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  };

  const processSymptomLocally = (userMessage) => {
    const messageLower = userMessage.toLowerCase();
    
    if (messageLower.includes('fever')) {
      return `I understand you're experiencing a fever. This can be concerning. How long have you had the fever, and what's your current temperature? Any other symptoms like chills, body aches, or headache?`;
    } else if (messageLower.includes('pain') || messageLower.includes('hurt')) {
      return `I hear you're experiencing pain. Can you tell me where exactly you feel the pain and rate it from 1-10? Is it constant or does it come and go?`;
    } else if (messageLower.includes('cough')) {
      return `I understand you have a cough. Is it a dry cough or are you bringing up any phlegm? How long have you had it? Any associated symptoms like fever or shortness of breath?`;
    } else if (messageLower.includes('headache')) {
      return `I'm sorry you're experiencing a headache. Can you describe the type of pain - is it throbbing, sharp, or dull? Where exactly is it located? Any triggers you can think of?`;
    } else if (messageLower.includes('nausea') || messageLower.includes('vomit')) {
      return `I understand you're feeling nauseous. Have you actually vomited or just feeling sick? When did this start? Any associated symptoms like fever or abdominal pain?`;
    } else if (messageLower.includes('dizzy') || messageLower.includes('lightheaded')) {
      return `I hear you're feeling dizzy. Is the room spinning or do you feel lightheaded? When does it happen - when standing up, lying down, or all the time?`;
    } else if (messageLower.includes('chest pain') || messageLower.includes('chest hurt')) {
      return `⚠️ Chest pain can be serious. Can you describe the pain - is it sharp, crushing, or burning? Does it radiate to your arm, jaw, or back? Rate it 1-10. If severe, please consider seeking immediate medical attention.`;
    } else if (messageLower.includes('shortness of breath') || messageLower.includes('breathing')) {
      return `I understand you're having trouble breathing. Is this sudden or gradual? Are you at rest or does it happen with activity? Any chest pain or wheezing?`;
    } else {
      return `I understand your concern about: "${userMessage}". Can you tell me more details about when this started, how severe it is, and how it's affecting your daily activities?`;
    }
  };

  const extractAndUpdateState = (messageLower, state) => {
    // SYMPTOM INTERVIEW ENGINE - Extract all possible information from ANY input
    
    // 1. Extract chief complaint (if not already set)
    if (!state.chiefComplaint) {
      if (messageLower.includes('chest pain') || (messageLower.includes('chest') && messageLower.includes('pain'))) {
        state.chiefComplaint = 'chest pain';
        state.chestPain = { present: true };
      } else if (messageLower.includes('fever')) {
        state.chiefComplaint = 'fever';
        state.fever = { present: true };
      } else if (messageLower.includes('cough')) {
        state.chiefComplaint = 'cough';
        state.cough = { present: true };
      } else if (messageLower.includes('headache')) {
        state.chiefComplaint = 'headache';
      } else if (messageLower.includes('breathing') || messageLower.includes('shortness')) {
        state.chiefComplaint = 'breathing difficulty';
        state.dyspnea = { present: true };
      }
    }
    
    // 2. Extract ALL symptoms mentioned (not just chief complaint)
    state.symptoms = state.symptoms || {};
    
    if (messageLower.includes('fever')) {
      state.symptoms.fever = { present: true };
    }
    if (messageLower.includes('cough')) {
      state.symptoms.cough = { present: true };
    }
    if (messageLower.includes('loose stools') || messageLower.includes('diarrhea') || messageLower.includes('loose motion')) {
      state.symptoms.diarrhea = { present: true };
    }
    if (messageLower.includes('body pain') || messageLower.includes('body ache') || messageLower.includes('bodyache')) {
      state.symptoms.bodyAche = { present: true };
    }
    if (messageLower.includes('headache')) {
      state.symptoms.headache = { present: true };
    }
    
    // 3. Extract timing/duration information  
    const durationMatches = [
      messageLower.match(/(\d+)\s*days?/),
      messageLower.match(/(\d+)\s*hours?/),
      messageLower.match(/since\s*(\d+)\s*days?/),
      messageLower.match(/for\s*(\d+)\s*days?/)
    ];
    
    for (let match of durationMatches) {
      if (match) {
        state.duration = match[1] + (messageLower.includes('hour') ? ' hours' : ' days');
        state.duration = match[1] + (messageLower.includes('hour') ? ' hours' : ' days');
        break;
      }
    }
    
    if (messageLower.includes('sudden') || messageLower.includes('suddenly')) {
      state.onset = 'sudden';
    } else if (messageLower.includes('gradual') || messageLower.includes('gradually') || messageLower.includes('slowly')) {  
      state.onset = 'gradual';
    }
    
    // 4. Extract severity - MULTIPLE FORMATS
    const severityPatterns = [
      /(\d+)\/10/,
      /(\d+)\s*out\s*of\s*10/,
      /rate.*?(\d+)/,
      /severity.*?(\d+)/,
      /^(\d+)\.?$/,  // Just a number by itself
      /is\s*(\d+)/,
      /about\s*(\d+)/
    ];
    
    for (let pattern of severityPatterns) {
      const match = messageLower.match(pattern);
      if (match) {
        const num = parseInt(match[1]);
        if (num >= 1 && num <= 10) {
          state.severity = num;
          break;
        }
      }
    }
    
    // Descriptive severity
    if (messageLower.includes('severe') || messageLower.includes('worst')) {
      state.severity = 'severe';
    } else if (messageLower.includes('mild')) {
      state.severity = 'mild';
    } else if (messageLower.includes('moderate')) {
      state.severity = 'moderate';
    }
    
    // 5. Extract temperature - MULTIPLE FORMATS
    const tempPatterns = [
      /(\d+\.?\d*)\s*f/,
      /(\d+\.?\d*)\s*fahrenheit/,
      /(\d+\.?\d*)\s*degrees?/,
      /temp.*?(\d+\.?\d*)/,
      /temperature.*?(\d+\.?\d*)/,
      /recorded.*?(\d+\.?\d*)/
    ];
    
    for (let pattern of tempPatterns) {
      const match = messageLower.match(pattern);
      if (match) {
        const temp = parseFloat(match[1]);
        if (temp >= 95 && temp <= 110) {
          state.temperature = temp;
          state.temperatureUnit = 'F';
          break;
        }
      }
    }
    
    // 6. Extract user's own diagnosis/thoughts
    if (messageLower.includes('viral fever') || messageLower.includes('viral infection')) {
      state.userDiagnosis = 'viral fever';
    }
  };
    
    // Extract fever information
    if (messageLower.includes('fever')) {
      state.fever = state.fever || {};
      state.fever.present = true;
    }
    
    // Extract temperature (check for any number that could be temperature)
    const tempMatch = messageLower.match(/(\d+\.?\d*)\s*(?:degrees?|°|f|fahrenheit|c|celsius|temp|temperature)?/);
    if (tempMatch) {
      const temp = parseFloat(tempMatch[1]);
      // If it's a reasonable temperature range (95-110 F or 35-45 C)
      if ((temp >= 95 && temp <= 110) || (temp >= 35 && temp <= 45)) {
        state.fever = state.fever || {};
        state.fever.present = true;
        state.fever.temperature = temp;
        state.fever.unit = messageLower.includes('c') || messageLower.includes('celsius') ? 'C' : 'F';
      }
    }
    
    // Extract duration
    if (messageLower.includes('days') || messageLower.includes('day')) {
      const daysMatch = messageLower.match(/(\d+)\s*days?/);
      if (daysMatch) {
        state.fever = state.fever || {};
        state.fever.duration = `${daysMatch[1]} days`;
      }
    }
    
    // Extract cough information
    if (messageLower.includes('cough')) {
      state.cough = state.cough || {};
      state.cough.present = true;
      
      if (messageLower.includes('dry')) {
        state.cough.type = 'dry';
      } else if (messageLower.includes('phlegm') || messageLower.includes('sputum') || messageLower.includes('bringing')) {
        state.cough.type = 'productive';
        state.cough.phlegm = true;
      }
    }
    
    // Extract breathing difficulty
    if (messageLower.includes('shortness') || messageLower.includes('breathing') || messageLower.includes('breath')) {
      state.dyspnea = state.dyspnea || {};
      state.dyspnea.present = true;
      
      if (messageLower.includes('sudden')) {
        state.dyspnea.onset = 'sudden';
        state.redFlags = state.redFlags || [];
        if (!state.redFlags.includes('sudden dyspnea')) {
          state.redFlags.push('sudden dyspnea');
        }
      }
    }
    
    // Extract associated symptoms
    if (messageLower.includes('body ache') || messageLower.includes('bodyache')) {
      state.associatedSymptoms = state.associatedSymptoms || [];
      if (!state.associatedSymptoms.includes('body aches')) {
        state.associatedSymptoms.push('body aches');
      }
    }
    
    if (messageLower.includes('headache')) {
      state.associatedSymptoms = state.associatedSymptoms || [];
      if (!state.associatedSymptoms.includes('headache')) {
        state.associatedSymptoms.push('headache');
      }
    }
  };

  const generateStatefulResponse = (messageLower, state) => {
    // Handle greetings and non-medical responses
    if (messageLower.match(/^(hi|hello|hey|good morning|good afternoon|good evening)$/)) {
      return "Hello! I'm here to help with your health concerns. What symptoms are you experiencing?";
    }
    
    // Handle general conversation that's not medical
    if (messageLower.match(/^(how are you|thank you|thanks|ok|okay)$/)) {
      return "I'm here to help with any health concerns you might have. What brings you in today?";
    }
    
    // Handle non-medical queries
    if (!isHealthRelated(messageLower) && !state.chiefComplaint) {
      return "I'm ARYA, your health assistant. I'm designed to help with medical symptoms and health concerns. What health issue would you like to discuss?";
    }
    
    // Check for red flags first
    if (state.redFlags && state.redFlags.length > 0) {
      if (state.redFlags.includes('sudden dyspnea')) {
        return "⚠️ Sudden shortness of breath can be serious. Are you able to speak in full sentences? Do you have chest pain? If you're having severe difficulty breathing, please seek immediate medical attention.";
      }
    }
    
    // Prioritize next question based on what's missing
    const nextQuestion = getNextPriorityQuestion(state);
    if (nextQuestion) return nextQuestion;
    
    // If we have enough information, provide assessment
    if (hasEnoughInfoForAssessment(state)) {
      return generateAssessment(state);
    }
    
    // Default response if we can't determine next step
    return "Can you tell me more about your main concern and when it started?";
  };

  const getNextPriorityQuestion = (state) => {
    // SYMPTOM INTERVIEW ENGINE - Check what slots are MISSING
    
    // Priority 1: Red flag symptoms (Emergency screening)
    if (state.dyspnea?.present && !state.dyspnea.severity) {
      return "⚠️ Breathing difficulty can be serious. Are you able to speak in full sentences right now, or do you need to pause for breath?";
    }
    
    if (state.chestPain?.present && !state.chestPain.severity) {
      return "⚠️ Can you rate your chest pain from 1-10, with 10 being the worst pain imaginable? Does it feel like pressure, crushing, or sharp stabbing?";
    }
    
    // Priority 2: Chief complaint analysis - Check if we have the essential info
    if (state.chiefComplaint === 'fever') {
      // For fever: need duration, severity/temperature, associated symptoms
      
      if (!state.duration && !state.onset) {
        return "How long have you had this fever? Did it start suddenly or gradually?";
      }
      
      if (!state.severity && !state.temperature) {
        return "How severe would you say this fever is on a scale of 1-10?";
      }
      
      if (!state.temperature && state.severity) {
        return "What's your current temperature? Have you measured it recently?";
      }
      
      // If we have basic fever info, check for associated symptoms
      if (!state.hasAskedAssociated) {
        state.hasAskedAssociated = true; // Mark that we asked
        return "Besides the fever, are you experiencing any other symptoms like cough, body aches, headache, or digestive issues?";
      }
      
      // If we have associated symptoms mentioned, get more details
      if (state.symptoms?.cough?.present && !state.symptoms.cough.type) {
        return "Tell me about your cough - is it dry, or are you bringing up any phlegm?";
      }
      
      if (state.symptoms?.diarrhea?.present && !state.symptoms.diarrhea.frequency) {
        return "How often are you having loose stools? Any blood or mucus?";
      }
    }
    
    // Priority 3: Other chief complaints
    if (state.chiefComplaint && state.chiefComplaint !== 'fever') {
      if (!state.onset && !state.duration) {
        return getTimingQuestion(state.chiefComplaint);
      }
      
      if (!state.severity) {
        return getSeverityQuestion(state.chiefComplaint);
      }
      
      if (!state.quality) {
        return getQualityQuestion(state.chiefComplaint);
      }
    }
    
    // Priority 4: Ready for assessment?
    if (hasEnoughInfoForAssessment(state)) {
      return null; // This will trigger assessment
    }
    
    // Priority 5: Fallback
    return "Can you tell me more about how you're feeling right now?";
  };
  
  const getTimingQuestion = (chiefComplaint) => {
    switch(chiefComplaint) {
      case 'chest pain':
        return "When did this chest pain start? Was it sudden and severe, or did it come on gradually?";
      case 'fever':
        return "How long have you had this fever? Did it start suddenly or gradually?";
      case 'cough':
        return "How long have you had this cough? When did you first notice it?";
      case 'headache':
        return "When did this headache start? Is this sudden or has it been building up?";
      default:
        return `When did this ${chiefComplaint} start? Was it sudden or gradual?`;
    }
  };
  
  const getSeverityQuestion = (chiefComplaint) => {
    switch(chiefComplaint) {
      case 'chest pain':
        return "On a scale of 1-10, how severe is your chest pain right now? Is it the worst pain you've ever felt?";
      case 'headache':
        return "How severe is this headache on a scale of 1-10? Is it worse than your usual headaches?";
      case 'pain':
        return "How would you rate this pain from 1-10, with 10 being unbearable?";
      default:
        return `How severe would you say this ${chiefComplaint} is on a scale of 1-10?`;
    }
  };
  
  const getQualityQuestion = (chiefComplaint) => {
    switch(chiefComplaint) {
      case 'chest pain':
        return "Can you describe what the chest pain feels like? Is it crushing, pressure-like, sharp and stabbing, or burning?";
      case 'headache':
        return "What does this headache feel like? Is it throbbing, sharp, dull and aching, or like a tight band?";
      case 'cough':
        return "What does your cough sound like? Is it barking, whooping, or more of a hack?";
      default:
        return `Can you describe what this ${chiefComplaint} feels like?`;
    }
  };
  
  const getAssociatedSymptomsQuestion = (chiefComplaint) => {
    switch(chiefComplaint) {
      case 'chest pain':
        return "Along with the chest pain, are you experiencing any shortness of breath, sweating, nausea, or pain radiating to your arm or jaw?";
      case 'fever':
        return "Besides the fever, are you having any chills, body aches, headache, cough, or sore throat?";
      case 'headache':
        return "With this headache, are you experiencing any nausea, vomiting, vision changes, or sensitivity to light?";
      case 'cough':
        return "Along with the cough, do you have any fever, shortness of breath, chest pain, or fatigue?";
      default:
        return `Are you experiencing any other symptoms along with the ${chiefComplaint}?`;
    }
  };
  
  const getContextQuestion = (chiefComplaint) => {
    switch(chiefComplaint) {
      case 'chest pain':
        return "What were you doing when the chest pain started? Were you at rest, exercising, or under stress?";
      case 'fever':
        return "Have you been around anyone sick recently, or traveled anywhere? Any recent illness in your household?";
      case 'headache':
        return "Is there anything that seems to trigger these headaches? Stress, certain foods, lack of sleep?";
      default:
        return `Is there anything that seems to make this ${chiefComplaint} better or worse?`;
    }
  };

  const hasEnoughInfoForAssessment = (state) => {
    if (!state.chiefComplaint) return false;
    
    // For fever: need duration + (temperature OR severity) + associated symptoms checked
    if (state.chiefComplaint === 'fever') {
      const hasDuration = state.duration || state.onset;
      const hasSeverityInfo = state.temperature || state.severity;
      const hasCheckedAssociated = state.hasAskedAssociated;
      
      return hasDuration && hasSeverityInfo && hasCheckedAssociated;
    }
    
    // For other complaints: need onset + severity + basic details
    return state.onset && state.severity;
  };

  const isHealthRelated = (messageLower) => {
    const healthKeywords = [
      'pain', 'ache', 'hurt', 'fever', 'cough', 'headache', 'dizzy', 'nausea', 'vomit',
      'shortness', 'breath', 'chest', 'stomach', 'belly', 'sick', 'ill', 'symptom',
      'temperature', 'chills', 'sweating', 'tired', 'fatigue', 'weak', 'sore',
      'swelling', 'rash', 'bleeding', 'injury', 'fall', 'cut', 'burn', 'medication'
    ];
    return healthKeywords.some(keyword => messageLower.includes(keyword));
  };

  const generateAssessment = (state) => {
    
    let assessment = "## Clinical Assessment\n\n";
    
    // Summarize what we know
    assessment += "**Based on your symptoms:**\n";
    
    if (state.chiefComplaint === 'fever') {
      assessment += `• Fever for ${state.duration || 'some time'}`;
      if (state.temperature) {
        assessment += ` (${state.temperature}°F)`;
      }
      if (state.severity) {
        assessment += ` - severity ${state.severity}/10`;
      }
      assessment += "\n";
      
      // Add associated symptoms
      if (state.symptoms?.cough?.present) {
        assessment += "• Cough present\n";
      }
      if (state.symptoms?.diarrhea?.present) {
        assessment += "• Loose stools/diarrhea\n";
      }
      if (state.symptoms?.bodyAche?.present) {
        assessment += "• Body aches\n";
      }
      if (state.symptoms?.headache?.present) {
        assessment += "• Headache\n";
      }
      
      // Clinical reasoning
      assessment += "\n**Clinical Impression:**\n";
      
      const symptomCount = Object.values(state.symptoms || {}).filter(s => s.present).length;
      const hasGI = state.symptoms?.diarrhea?.present;
      const hasResp = state.symptoms?.cough?.present;
      
      if (hasGI && symptomCount >= 2) {
        assessment += "This combination of fever, GI symptoms (loose stools), and systemic symptoms (body aches) suggests a possible **viral gastroenteritis** or **viral syndrome**.\n\n";
      } else if (hasResp && symptomCount >= 2) {
        assessment += "Fever with respiratory symptoms suggests a possible **viral upper respiratory infection** or **flu-like illness**.\n\n";
      } else {
        assessment += "The constellation of symptoms suggests a **viral illness**.\n\n";
      }
      
      // Triage level
      if (state.temperature && state.temperature > 102) {
        assessment += "🔴 **HIGH PRIORITY**: Temperature >102°F warrants medical evaluation today.\n\n";
      } else if (symptomCount >= 3) {
        assessment += "🟡 **MODERATE PRIORITY**: Multiple symptoms suggest you should see a healthcare provider within 24-48 hours.\n\n";
      } else {
        assessment += "🟢 **LOW PRIORITY**: Symptoms can likely be managed at home with monitoring.\n\n";
      }
      
      // Recommendations
      assessment += "**Recommendations:**\n";
      assessment += "• Stay hydrated - drink plenty of fluids\n";
      assessment += "• Rest and monitor symptoms\n";
      assessment += "• Take acetaminophen or ibuprofen for fever/aches\n";
      if (hasGI) {
        assessment += "• BRAT diet (bananas, rice, applesauce, toast) for GI symptoms\n";
      }
      assessment += "• Seek care if fever >102°F, severe dehydration, or symptoms worsen\n\n";
    }
    
    assessment += "⚠️ **Disclaimer:** This is not a medical diagnosis. Please consult a healthcare professional for proper evaluation and treatment.";
    
    return assessment;
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

    // Process message locally for now (bypass API issues)
    const response = processSymptomLocally(userMessage);
    setTimeout(() => {
      addMessage('assistant', response);
      setIsTyping(false);
    }, 1000);
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
                <div className="avatar user-avatar">{user.fullName[0]}</div>
              )}
              {msg.type === 'system' && (
                <div className="avatar system-avatar">🔒</div>
              )}
              
              <div className="message-bubble">
                <div className="message-text">{msg.message}</div>
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