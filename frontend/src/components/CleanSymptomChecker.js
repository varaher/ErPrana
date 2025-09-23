import React, { useState, useEffect, useRef } from 'react';
import './CleanSymptomChecker.css';

const CleanSymptomChecker = ({ user, onBack }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      message: `Hello! I'm ARYA. I'll help assess your symptoms systematically. What is your main concern today?`,
      timestamp: new Date()
    }
  ]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  // Conversation state - this will track what we know
  const [conversationState, setConversationState] = useState({
    chiefComplaint: null,
    onset: null,
    duration: null,
    fever: null,
    cough: null,
    pain: {
      hasPain: null,
      location: null,
      severity: null,
      character: null
    },
    breathingDifficulty: null,
    swallowingDifficulty: null,
    vitals: {
      temp: null,
      HR: null,
      BP: null,
      RR: null,
      SpO2: null
    },
    redFlags: [],
    otherSymptoms: [],
    completed: false
  });
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  
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
  };
  
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    const userMessage = inputMessage.trim();
    setInputMessage('');
    addMessage('user', userMessage);
    setIsTyping(true);
    
    setTimeout(() => {
      processUserResponse(userMessage);
      setIsTyping(false);
    }, 800);
  };
  
  // Parse user message and update conversation state
  const parseUserResponse = (message) => {
    const m = message.toLowerCase();
    const updates = {};
    
    // Chief complaint detection (if not already set)
    if (!conversationState.chiefComplaint) {
      updates.chiefComplaint = message;
    }
    
    // Pain detection and negation
    if (/\b(no pain|don'?t have pain|no chest pain|pain.*no|not.*pain)\b/.test(m)) {
      updates.pain = { ...conversationState.pain, hasPain: false };
    } else if (/\bpain\b/.test(m) && !/\bno\b/.test(m)) {
      updates.pain = { ...conversationState.pain, hasPain: true };
      
      // Extract pain details if mentioned
      if (/\b(chest|heart)\b/.test(m)) updates.pain.location = 'chest';
      if (/\b(abdomen|stomach|belly)\b/.test(m)) updates.pain.location = 'abdomen';
      if (/\b(head|headache)\b/.test(m)) updates.pain.location = 'head';
      if (/\b(back|spine)\b/.test(m)) updates.pain.location = 'back';
      
      // Pain severity
      if (/\b(severe|worst|terrible|unbearable|10)\b/.test(m)) updates.pain.severity = 'severe';
      if (/\b(mild|slight|little|1|2|3)\b/.test(m)) updates.pain.severity = 'mild';
      if (/\b(moderate|medium|5|6|7)\b/.test(m)) updates.pain.severity = 'moderate';
    }
    
    // Fever detection
    if (/\bfever\b/.test(m) && !/\bno fever\b/.test(m)) updates.fever = true;
    if (/\bno fever|afebrile|normal temp\b/.test(m)) updates.fever = false;
    
    // Cough detection
    if (/\bcough\b/.test(m) && !/\bno cough\b/.test(m)) updates.cough = true;
    if (/\bno cough\b/.test(m)) updates.cough = false;
    
    // Breathing difficulty
    if (/\b(shortness of breath|difficulty breathing|can'?t breathe|hard to breathe)\b/.test(m)) {
      updates.breathingDifficulty = true;
    }
    if (/\b(breathing.*fine|no.*breath|breath.*normal)\b/.test(m)) {
      updates.breathingDifficulty = false;
    }
    
    // Swallowing difficulty
    if (/\b(throat pain|difficulty swallowing|hard to swallow)\b/.test(m)) {
      updates.swallowingDifficulty = true;
    }
    
    // Onset/timing
    if (/\b(\d+)\s*(hour|hr|day|week|month)\b/.test(m)) {
      const match = m.match(/\b(\d+)\s*(hour|hr|day|week|month)/);
      updates.onset = `${match[1]} ${match[2]}${match[1] > 1 ? 's' : ''} ago`;
    }
    if (/\b(yesterday|this morning|last night|today)\b/.test(m)) {
      const timeMatch = m.match(/\b(yesterday|this morning|last night|today)\b/);
      updates.onset = timeMatch[1];
    }
    
    // Vitals extraction
    const vitals = { ...conversationState.vitals };
    
    // Temperature
    const tempMatch = m.match(/(\d{2,3}\.?\d?)\s*(f|fahrenheit|°f)/i);
    if (tempMatch) vitals.temp = parseFloat(tempMatch[1]);
    
    // Heart rate
    const hrMatch = m.match(/(\d{2,3})\s*(bpm|beats)/i);
    if (hrMatch) vitals.HR = parseInt(hrMatch[1]);
    
    // Blood pressure
    const bpMatch = m.match(/(\d{2,3})\/(\d{2,3})/);
    if (bpMatch) vitals.BP = `${bpMatch[1]}/${bpMatch[2]}`;
    
    // Oxygen saturation
    const spo2Match = m.match(/(\d{2,3})%?\s*(sat|oxygen|o2)/i);
    if (spo2Match) vitals.SpO2 = parseInt(spo2Match[1]);
    
    if (Object.keys(vitals).some(key => vitals[key] !== conversationState.vitals[key])) {
      updates.vitals = vitals;
    }
    
    // Red flags detection
    const redFlags = [...conversationState.redFlags];
    if (/\b(chest pain|difficulty breathing|stroke|heart attack|unconscious|bleeding)\b/.test(m)) {
      if (!redFlags.includes('potential emergency')) {
        redFlags.push('potential emergency');
        updates.redFlags = redFlags;
      }
    }
    
    return updates;
  };
  
  // Determine next best question based on current state
  const getNextQuestion = (state) => {
    // Emergency check first
    if (state.redFlags.includes('potential emergency') && !state.emergencyWarningGiven) {
      return {
        message: '🚨 **EMERGENCY ALERT**: Your symptoms suggest a potential medical emergency. Please call 911 or go to the nearest emergency room immediately. I can continue gathering information while you arrange emergency care.',
        markEmergencyWarning: true
      };
    }
    
    // Systematic questioning based on missing information
    if (!state.onset && state.chiefComplaint) {
      return { message: 'When did this start? (e.g., "2 hours ago", "yesterday", "this morning")' };
    }
    
    if (state.pain.hasPain === null) {
      return { message: 'Are you experiencing any pain right now? (yes/no)' };
    }
    
    if (state.pain.hasPain === true && !state.pain.location) {
      return { message: 'Where is the pain located?' };
    }
    
    if (state.pain.hasPain === true && !state.pain.severity) {
      return { message: 'On a scale of 1-10, how severe is the pain? (1=mild, 10=worst imaginable)' };
    }
    
    if (state.fever === null) {
      return { message: 'Do you have a fever? (yes/no/unknown)' };
    }
    
    if (state.cough === null) {
      return { message: 'Any cough? (yes/no)' };
    }
    
    if (state.breathingDifficulty === null) {
      return { message: 'Any difficulty breathing or shortness of breath? (yes/no)' };
    }
    
    // Ask for vitals if none provided
    if (!state.vitals.temp && !state.vitals.HR && !state.vitals.BP && !state.vitals.SpO2) {
      return { message: 'Do you know any of your vital signs? (temperature, heart rate, blood pressure) If not, just say "unknown"' };
    }
    
    // If we have enough information, provide assessment
    if (state.chiefComplaint && state.onset && 
        (state.pain.hasPain !== null) && 
        (state.fever !== null) && 
        (state.cough !== null)) {
      return { message: null, complete: true };
    }
    
    // Fallback
    return { message: 'Any other symptoms I should know about?' };
  };
  
  const processUserResponse = (message) => {
    // Parse response and update state
    const updates = parseUserResponse(message);
    const newState = { ...conversationState, ...updates };
    
    // Handle emergency warning flag
    if (updates.markEmergencyWarning) {
      newState.emergencyWarningGiven = true;
    }
    
    setConversationState(newState);
    
    // Get next question
    const nextQuestion = getNextQuestion(newState);
    
    if (nextQuestion.complete) {
      // Generate assessment
      setTimeout(() => {
        generateAssessment(newState);
      }, 1000);
      return;
    }
    
    if (nextQuestion.message) {
      setTimeout(() => {
        addMessage('assistant', nextQuestion.message);
      }, 500);
    }
  };
  
  const generateAssessment = (state) => {
    addMessage('assistant', '📊 **CLINICAL ASSESSMENT**\n\nLet me analyze your symptoms...');
    
    setTimeout(() => {
      const assessment = createDifferentialDiagnosis(state);
      
      addMessage('assistant', `**Chief Complaint:** ${state.chiefComplaint}\n**Onset:** ${state.onset || 'Not specified'}\n**Pain:** ${state.pain.hasPain ? `Yes - ${state.pain.location || 'location unclear'} (severity: ${state.pain.severity || 'not rated'})` : 'No pain reported'}\n**Other symptoms:** ${getSymptomSummary(state)}`);
      
      setTimeout(() => {
        addMessage('assistant', '**DIFFERENTIAL DIAGNOSIS:**\n\n' + assessment.diagnoses.map((dx, i) => 
          `${i+1}. **${dx.condition}** - ${dx.likelihood}%\n   ${dx.description}\n   *Key factors: ${dx.rationale}*`
        ).join('\n\n'));
      }, 2000);
      
      setTimeout(() => {
        addMessage('assistant', `🚦 **TRIAGE RECOMMENDATION: ${assessment.triage.level}**\n${assessment.triage.action}\n\n⚠️ **DISCLAIMER:** This is an AI assessment for informational purposes only and does not replace professional medical evaluation. Please consult with a healthcare provider for proper diagnosis and treatment.`);
      }, 4000);
      
    }, 2000);
  };
  
  const getSymptomSummary = (state) => {
    const symptoms = [];
    if (state.fever === true) symptoms.push('fever');
    if (state.cough === true) symptoms.push('cough');
    if (state.breathingDifficulty === true) symptoms.push('breathing difficulty');
    if (state.swallowingDifficulty === true) symptoms.push('swallowing difficulty');
    
    return symptoms.length > 0 ? symptoms.join(', ') : 'None reported';
  };
  
  const createDifferentialDiagnosis = (state) => {
    const symptoms = state.chiefComplaint.toLowerCase();
    let diagnoses = [];
    let triageLevel = 'NON-URGENT';
    let triageAction = 'Schedule routine appointment within 1-2 weeks. Monitor symptoms.';
    
    // Emergency conditions
    if (state.redFlags.includes('potential emergency')) {
      triageLevel = 'EMERGENCY';
      triageAction = '🚨 Seek immediate emergency care. Call 911 or go to ER now.';
    }
    
    // Generate diagnoses based on symptoms
    if (symptoms.includes('abdominal') || symptoms.includes('stomach')) {
      diagnoses = [
        { condition: 'Gastroenteritis', likelihood: 65, description: 'Stomach and intestinal inflammation', rationale: 'Common cause of abdominal discomfort' },
        { condition: 'Peptic Ulcer Disease', likelihood: 35, description: 'Stomach or duodenal ulcers', rationale: 'Epigastric pain pattern' },
        { condition: 'Appendicitis', likelihood: state.pain.location === 'abdomen' ? 45 : 20, description: 'Appendix inflammation', rationale: 'Abdominal pain with specific characteristics' },
        { condition: 'Gastroesophageal Reflux', likelihood: 40, description: 'Acid reflux disease', rationale: 'Upper abdominal symptoms' }
      ];
    } else if (symptoms.includes('chest')) {
      diagnoses = [
        { condition: 'Musculoskeletal Pain', likelihood: 70, description: 'Chest wall muscle strain', rationale: 'Most common cause of chest pain' },
        { condition: 'Costochondritis', likelihood: 45, description: 'Rib cartilage inflammation', rationale: 'Sharp chest pain' },
        { condition: 'GERD', likelihood: 50, description: 'Acid reflux mimicking heart pain', rationale: 'Chest burning sensation' },
        { condition: 'Cardiac Issue', likelihood: state.redFlags.length > 0 ? 25 : 10, description: 'Heart-related chest pain - needs evaluation', rationale: 'Chest pain with risk factors' }
      ];
      
      if (state.redFlags.length > 0) {
        triageLevel = 'URGENT';
        triageAction = '⚡ Seek medical care within 2-4 hours. Consider emergency evaluation.';
      }
    } else if (symptoms.includes('headache') || symptoms.includes('head')) {
      diagnoses = [
        { condition: 'Tension Headache', likelihood: 75, description: 'Stress-related headache', rationale: 'Most common headache type' },
        { condition: 'Migraine', likelihood: 45, description: 'Vascular headache', rationale: 'Headache characteristics' },
        { condition: 'Sinus Headache', likelihood: state.cough || state.fever ? 55 : 25, description: 'Sinus pressure headache', rationale: 'Associated respiratory symptoms' },
        { condition: 'Cluster Headache', likelihood: 15, description: 'Severe unilateral headache', rationale: 'Pain pattern and timing' }
      ];
    } else {
      // General symptoms
      diagnoses = [
        { condition: 'Viral Upper Respiratory Infection', likelihood: 60, description: 'Common cold or flu', rationale: 'Symptom constellation' },
        { condition: 'Bacterial Infection', likelihood: state.fever ? 45 : 20, description: 'Bacterial illness', rationale: 'Fever and symptom severity' },
        { condition: 'Stress-Related Symptoms', likelihood: 35, description: 'Stress manifestation', rationale: 'Multiple non-specific symptoms' },
        { condition: 'Medication Side Effects', likelihood: 15, description: 'Adverse drug reaction', rationale: 'Timing and symptom pattern' }
      ];
    }
    
    // Adjust triage based on severity and red flags
    if (state.pain.severity === 'severe' && triageLevel === 'NON-URGENT') {
      triageLevel = 'URGENT';
      triageAction = '⚡ Seek medical care within 2-4 hours due to severe pain.';
    } else if ((state.fever === true || state.breathingDifficulty === true) && triageLevel === 'NON-URGENT') {
      triageLevel = 'LESS URGENT';
      triageAction = '🏥 Seek medical care within 24-48 hours.';
    }
    
    return {
      diagnoses: diagnoses.slice(0, 4), // Top 4 most likely
      triage: { level: triageLevel, action: triageAction }
    };
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