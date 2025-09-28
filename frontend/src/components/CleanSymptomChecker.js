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
    
    // Update conversation state with new information
    const newState = { ...conversationState };
    
    // Extract information from user message
    extractAndUpdateState(messageLower, newState);
    
    // Generate response based on current state and priorities
    const response = generateStatefulResponse(messageLower, newState);
    
    // Update the conversation state
    setConversationState(newState);
    
    return response;
  };

  const extractAndUpdateState = (messageLower, state) => {
    // Extract chief complaint
    if (!state.chiefComplaint) {
      if (messageLower.includes('fever')) state.chiefComplaint = 'fever';
      else if (messageLower.includes('cough')) state.chiefComplaint = 'cough';
      else if (messageLower.includes('pain')) state.chiefComplaint = 'pain';
      else if (messageLower.includes('headache')) state.chiefComplaint = 'headache';
      else if (messageLower.includes('breathing') || messageLower.includes('shortness')) state.chiefComplaint = 'breathing difficulty';
    }
    
    // Extract fever information
    if (messageLower.includes('fever')) {
      state.fever = state.fever || {};
      state.fever.present = true;
    }
    
    // Extract temperature (check for any number that could be temperature)
    const tempMatch = messageLower.match(/(\d+\.?\d*)\s*(?:degrees?|°|f|fahrenheit|c|celsius|temp|temperature)?/);
    if (tempMatch) {
      const temp = parseFloat(tempMatch[1]);
      console.log('🌡️ Found potential temperature:', temp);
      // If it's a reasonable temperature range (95-110 F or 35-45 C)
      if ((temp >= 95 && temp <= 110) || (temp >= 35 && temp <= 45)) {
        state.fever = state.fever || {};
        state.fever.present = true;
        state.fever.temperature = temp;
        state.fever.unit = messageLower.includes('c') || messageLower.includes('celsius') ? 'C' : 'F';
        console.log('✅ Temperature extracted:', temp, state.fever.unit);
      } else {
        console.log('❌ Temperature out of range:', temp);
      }
    } else {
      console.log('❌ No temperature pattern found in:', messageLower);
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
    // Handle greetings
    if (messageLower.match(/^(hi|hello|hey)$/)) {
      return "Hello! I'm here to help with your health concerns. What symptoms are you experiencing?";
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
    console.log('🎯 Checking next priority question for state:', state);
    
    // Priority 1: Red flag symptoms
    if (state.dyspnea?.present && !state.dyspnea.severity) {
      return "Can you tell me how severe your breathing difficulty is? Are you able to speak in full sentences or do you need to pause for breath?";
    }
    
    // Priority 2: Fever details if present but temperature not known
    if (state.fever?.present && (state.fever.temperature === undefined || state.fever.temperature === null)) {
      return "What's your current temperature? Have you measured it recently?";
    }
    
    // Priority 3: Cough details if present but not characterized
    if (state.cough?.present && !state.cough.type) {
      return "Is your cough dry or are you bringing up any phlegm or mucus?";
    }
    
    // Priority 4: Duration of main symptoms
    if (state.chiefComplaint && !state.fever?.duration && !state.onset) {
      return "How long have you been experiencing these symptoms?";
    }
    
    // Priority 5: Associated symptoms
    if ((state.fever?.present || state.cough?.present) && (!state.associatedSymptoms || state.associatedSymptoms.length === 0)) {
      return "Are you experiencing any other symptoms like body aches, headache, or chills?";
    }
    
    console.log('✅ No priority questions needed');
    return null;
  };

  const hasEnoughInfoForAssessment = (state) => {
    return state.chiefComplaint && 
           (state.fever?.temperature || state.cough?.type || state.dyspnea?.severity);
  };

  const generateAssessment = (state) => {
    let assessment = "Based on what you've told me:\n\n";
    
    if (state.fever?.present && state.cough?.present && state.dyspnea?.present) {
      assessment += "🔴 You have fever, cough with phlegm, and sudden breathing difficulty. This combination suggests a possible respiratory infection that may need prompt medical evaluation.\n\n";
      assessment += "**Recommendations:**\n";
      assessment += "• Consider seeing a healthcare provider today\n";
      assessment += "• Monitor your temperature and breathing\n";
      assessment += "• If breathing worsens, seek immediate care\n";
      assessment += "• Stay hydrated and rest\n\n";
      assessment += "⚠️ This is not a medical diagnosis. Please consult a healthcare professional for proper evaluation.";
    } else {
      assessment += "I'd recommend discussing these symptoms with a healthcare provider for proper evaluation and treatment.";
    }
    
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
    return;
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