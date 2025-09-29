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
  
  // Structured conversation state following Cursor approach
  const [conversationState, setConversationState] = useState({
    currentStep: 'initial_assessment',
    collectedData: {
      primarySymptom: '',
      location: '',
      duration: '',
      severity: '',
      associatedSymptoms: [],
      triggerFactors: '',
      relievingFactors: ''
    },
    urgencyLevel: 'low',
    requiresFollowup: true,
    conversationHistory: []
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
  
  const addMessage = (type, message, urgencyLevel = null, messageId = null) => {
    const newMessage = {
      id: messageId || Date.now(),
      type,
      message,
      timestamp: new Date(),
      urgencyLevel,
      feedback: null // Track feedback for assistant messages
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

    try {
      // Call backend API for proper medical processing
      const response = await fetch(`${BACKEND_URL}/api/symptom-intelligence/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id || user.email,
          message: userMessage,
          session_id: conversationState.sessionId || null
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Update conversation state with backend response
      setConversationState(prev => ({
        ...prev,
        currentStep: data.next_step,
        requiresFollowup: data.requires_followup,
        urgencyLevel: data.urgency_level,
        sessionId: data.session_id
      }));

      // Add assistant response
      addMessage('assistant', data.response, data.urgency_level);
      
    } catch (error) {
      console.error('API Error:', error);
      // Fallback to local processing
      const response = processSymptomWithMedicalKnowledge(userMessage);
      addMessage('assistant', response);
    }
    
    setIsTyping(false);
  };

  const processSymptomWithMedicalKnowledge = (userMessage) => {
    const messageLower = userMessage.toLowerCase().trim();
    
    // Handle greetings - don't treat as symptoms
    const greetingPatterns = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'];
    if (greetingPatterns.some(pattern => messageLower === pattern || messageLower.startsWith(pattern + ' '))) {
      return "Hello! I'm here to help you with your health concerns. What is your main symptom or health concern today?";
    }
    
    // Handle acknowledgments
    const acknowledgmentPatterns = ['thank you', 'thanks', 'okay', 'ok', 'yes', 'no', 'sure'];
    if (acknowledgmentPatterns.includes(messageLower)) {
      return "Please tell me what specific symptom is concerning you today.";
    }
    
    // Process based on current conversation step
    return handleConversationStep(userMessage);
  };

  const handleConversationStep = (userMessage) => {
    const currentStep = conversationState.currentStep;
    let response = '';
    let nextStep = currentStep;
    let updatedData = { ...conversationState.collectedData };
    let urgencyLevel = 'low';
    
    console.log('Current step:', currentStep, 'Message:', userMessage);

    switch (currentStep) {
      case 'initial_assessment':
        const primarySymptom = extractPrimarySymptom(userMessage);
        if (primarySymptom) {
          updatedData.primarySymptom = primarySymptom;
          urgencyLevel = assessUrgency(userMessage);
          
          if (urgencyLevel === 'emergency') {
            nextStep = 'emergency_advice';
            response = `⚠️ **EMERGENCY**: You mentioned ${primarySymptom}. This requires immediate medical attention. Please call 911 or go to the nearest emergency room right away. Do not delay seeking medical care.`;
          } else {
            nextStep = 'symptom_details';
            response = `I understand you're experiencing ${primarySymptom}. Can you describe it in more detail? For example, is it sharp, dull, throbbing, or burning?`;
          }
        } else {
          response = "I want to help you with your health concern. Please tell me your main symptom - for example, 'chest pain', 'headache', 'fever', or 'stomach pain'.";
        }
        break;

      case 'symptom_details':
        updatedData.description = userMessage;
        nextStep = 'location_assessment';
        response = `Thank you for that description. Where exactly do you feel this ${updatedData.primarySymptom}? Please be as specific as possible about the location.`;
        break;

      case 'location_assessment':
        updatedData.location = userMessage;
        nextStep = 'duration_timing';
        response = `I see, ${updatedData.location}. When did this ${updatedData.primarySymptom} start? For example, was it today, yesterday, or several days ago?`;
        break;

      case 'duration_timing':
        updatedData.duration = userMessage;
        nextStep = 'severity_assessment';
        response = `Thank you. On a scale of 1-10 (where 10 is the worst pain you can imagine), how would you rate your ${updatedData.primarySymptom}?`;
        break;

      case 'severity_assessment':
        updatedData.severity = userMessage;
        nextStep = 'associated_symptoms';
        response = `I understand the severity is ${userMessage}. Are you experiencing any other symptoms along with the ${updatedData.primarySymptom}? For example, nausea, fever, dizziness, or shortness of breath?`;
        break;

      case 'associated_symptoms':
        updatedData.associatedSymptoms = userMessage;
        nextStep = 'medical_assessment';
        response = generateStructuredAssessment(updatedData);
        break;

      default:
        response = "Let me help you with your health concern. What is your main symptom today?";
        nextStep = 'initial_assessment';
    }

    // Update conversation state
    const newState = {
      currentStep: nextStep,
      collectedData: updatedData,
      urgencyLevel: urgencyLevel,
      requiresFollowup: nextStep !== 'medical_assessment',
      conversationHistory: [...conversationState.conversationHistory, {
        step: currentStep,
        userMessage,
        response,
        timestamp: new Date()
      }]
    };

    setConversationState(newState);
    console.log('Updated state:', newState);

    return response;
  };

  // Old functions removed - now using structured conversation approach

  const generateProvisionalDiagnoses = (collectedData) => {
    const diagnoses = [];
    const symptom = collectedData.primarySymptom;
    const location = collectedData.location?.toLowerCase() || '';
    
    // Chest pain diagnoses
    if (symptom === 'chest pain') {
      diagnoses.push({
        name: "Musculoskeletal chest pain",
        probability: "45%",
        reasoning: "Most common cause of chest pain in younger patients without cardiac risk factors",
        triage: "🟡 MODERATE - Monitor, seek care if worsening"
      });
      
      diagnoses.push({
        name: "Gastroesophageal reflux (GERD)",
        probability: "35%",
        reasoning: "Burning chest pain, often related to meals or lying down",
        triage: "🟢 LOW-MODERATE - Dietary modifications, antacids"
      });
      
      diagnoses.push({
        name: "Anxiety/Panic disorder",
        probability: "25%",
        reasoning: "Chest tightness with associated anxiety symptoms",
        triage: "🟢 LOW - Stress management, rule out cardiac causes"
      });
      
      diagnoses.push({
        name: "Cardiac chest pain",
        probability: "20%",
        reasoning: "Especially with risk factors, exertional symptoms, or radiation",
        triage: "🔴 HIGH - Immediate medical evaluation required"
      });
      
      diagnoses.push({
        name: "Pulmonary embolism",
        probability: "10%",
        reasoning: "Less common but serious cause, especially with shortness of breath",
        triage: "🔴 HIGH - Emergency evaluation if breathing difficulties"
      });
    }
    
    // Abdominal pain diagnoses
    else if (symptom === 'abdominal pain') {
      if (location.includes('lower')) {
        diagnoses.push({
          name: "Gastroenteritis",
          probability: "50%",
          reasoning: "Lower abdominal pain with acute onset - common GI cause",
          triage: "🟡 MODERATE - Monitor symptoms, ensure hydration"
        });
        
        diagnoses.push({
          name: "Appendicitis (early)",
          probability: "30%",
          reasoning: "Lower abdominal pain, especially right-sided - needs monitoring",
          triage: "🟡 MODERATE - Seek care if pain worsens or fever develops"
        });
      } else {
        diagnoses.push({
          name: "Gastritis/Peptic ulcer",
          probability: "45%",
          reasoning: "Upper abdominal pain, often related to meals or stress",
          triage: "🟡 MODERATE - Monitor, avoid NSAIDs, seek care if severe"
        });
        
        diagnoses.push({
          name: "Gallbladder disease",
          probability: "35%",
          reasoning: "Right upper abdominal pain, especially after fatty meals",
          triage: "🟡 MODERATE - Seek medical evaluation for diagnosis"
        });
      }
      
      // Add common diagnoses for any abdominal pain
      diagnoses.push({
        name: "Urinary Tract Infection",
        probability: "25%",
        reasoning: "Can cause lower abdominal discomfort",
        triage: "🟡 MODERATE - Urinalysis recommended"
      });
      
      diagnoses.push({
        name: "Muscle strain/Gas pain",
        probability: "40%",
        reasoning: "Benign causes of abdominal discomfort",
        triage: "🟢 LOW - Conservative management"
      });
      
      diagnoses.push({
        name: "Gynecological causes",
        probability: "20%",
        reasoning: "Ovarian or uterine causes in females",
        triage: "🟢 LOW-MODERATE - Consider gynecologic evaluation"
      });
    }
    
    // Headache diagnoses
    else if (symptom === 'headache') {
      diagnoses.push({
        name: "Tension headache",
        probability: "60%",
        reasoning: "Most common type of headache, often stress-related",
        triage: "🟢 LOW - Rest, hydration, over-the-counter pain relief"
      });
      
      diagnoses.push({
        name: "Migraine",
        probability: "25%",
        reasoning: "Throbbing headache, often with associated symptoms",
        triage: "🟡 MODERATE - Avoid triggers, consider migraine medication"
      });
      
      diagnoses.push({
        name: "Sinusitis",
        probability: "20%",
        reasoning: "Headache with facial pressure or nasal congestion",
        triage: "🟡 MODERATE - Consider decongestants, seek care if persistent"
      });
      
      diagnoses.push({
        name: "Cluster headache",
        probability: "10%",
        reasoning: "Severe, unilateral headache with autonomic symptoms",
        triage: "🟡 MODERATE - Specialized treatment may be needed"
      });
      
      diagnoses.push({
        name: "Secondary headache",
        probability: "5%",
        reasoning: "Due to underlying condition - concerning if sudden/severe",
        triage: "🔴 HIGH - Seek immediate care if sudden onset or worst ever"
      });
    }
    
    // Default/other symptoms
    else {
      diagnoses.push({
        name: "Viral illness",
        probability: "50%",
        reasoning: "Common cause of various symptoms",
        triage: "🟢 LOW-MODERATE - Supportive care, monitor symptoms"
      });
      
      diagnoses.push({
        name: "Stress/Anxiety related",
        probability: "30%",
        reasoning: "Physical symptoms from psychological stress",
        triage: "🟢 LOW - Stress management, rule out physical causes"
      });
      
      diagnoses.push({
        name: "Medication side effect",
        probability: "20%",
        reasoning: "Side effect from current medications",
        triage: "🟡 MODERATE - Review medications with healthcare provider"
      });
      
      diagnoses.push({
        name: "Dehydration/Fatigue",
        probability: "25%",
        reasoning: "Common cause of various non-specific symptoms",
        triage: "🟢 LOW - Rest, hydration, monitor improvement"
      });
      
      diagnoses.push({
        name: "Underlying medical condition",
        probability: "15%",
        reasoning: "May require further evaluation",
        triage: "🟡 MODERATE - Consider medical evaluation if persistent"
      });
    }
    
    // Ensure we always return 5 diagnoses
    return diagnoses.slice(0, 5);
  };

 

  const extractPrimarySymptom = (message) => {
    const messageLower = message.toLowerCase();
    
    // Define symptom patterns
    const symptomPatterns = [
      { pattern: /chest pain|chest hurt|heart pain/i, symptom: 'chest pain' },
      { pattern: /headache|head pain|head hurt/i, symptom: 'headache' },
      { pattern: /stomach pain|abdominal pain|belly pain|stomach hurt/i, symptom: 'abdominal pain' },
      { pattern: /fever|temperature|hot|chills/i, symptom: 'fever' },
      { pattern: /cough|coughing/i, symptom: 'cough' },
      { pattern: /nausea|nauseous|sick|vomit/i, symptom: 'nausea' },
      { pattern: /dizzy|dizziness|lightheaded/i, symptom: 'dizziness' },
      { pattern: /shortness of breath|breathing|breath/i, symptom: 'breathing difficulty' },
      { pattern: /back pain|back hurt/i, symptom: 'back pain' },
      { pattern: /sore throat|throat pain|throat hurt/i, symptom: 'sore throat' }
    ];
    
    for (const { pattern, symptom } of symptomPatterns) {
      if (pattern.test(messageLower)) {
        return symptom;
      }
    }
    
    return null;
  };

  const assessUrgency = (message) => {
    const emergencyKeywords = [
      'chest pain', 'heart attack', 'stroke', 'severe pain', 'can\'t breathe',
      'shortness of breath', 'crushing pain', 'sudden weakness'
    ];
    
    const messageLower = message.toLowerCase();
    return emergencyKeywords.some(keyword => messageLower.includes(keyword)) ? 'emergency' : 'low';
  };

  const generateStructuredAssessment = (collectedData) => {
    let assessment = "**CLINICAL ASSESSMENT**\n\n";
    
    // Chief complaint summary
    assessment += `**Chief Complaint:** ${collectedData.primarySymptom}`;
    if (collectedData.location) assessment += ` in ${collectedData.location}`;
    if (collectedData.duration) assessment += ` for ${collectedData.duration}`;
    assessment += "\n\n";
    
    // Details
    if (collectedData.description) {
      assessment += `**Description:** ${collectedData.description}\n\n`;
    }
    
    if (collectedData.severity) {
      assessment += `**Severity:** ${collectedData.severity}/10\n\n`;
    }
    
    if (collectedData.associatedSymptoms) {
      assessment += `**Associated Symptoms:** ${collectedData.associatedSymptoms}\n\n`;
    }
    
    // Generate 5 provisional diagnoses based on collected data
    const diagnoses = generateProvisionalDiagnoses(collectedData);
    assessment += "**PROVISIONAL DIAGNOSES (in order of likelihood):**\n\n";
    
    diagnoses.forEach((diagnosis, index) => {
      assessment += `${index + 1}. **${diagnosis.name}** (${diagnosis.probability})\n`;
      assessment += `   - ${diagnosis.reasoning}\n`;
      assessment += `   - Triage: ${diagnosis.triage}\n\n`;
    });
    
    // Recommendations
    assessment += "**RECOMMENDATIONS:**\n";
    assessment += "• Monitor symptoms closely\n";
    assessment += "• Seek medical attention if symptoms worsen\n";
    assessment += "• Stay hydrated and rest as needed\n";
    
    if (collectedData.primarySymptom === 'chest pain') {
      assessment += "• Seek immediate care if chest pain worsens or is accompanied by sweating, nausea, or shortness of breath\n";
    }
    
    assessment += "\n⚠️ **Disclaimer:** This assessment is for educational purposes. Please consult a healthcare professional for proper diagnosis and treatment.";
    
    return assessment;
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