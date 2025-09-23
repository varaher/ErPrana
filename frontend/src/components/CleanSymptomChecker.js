import React, { useState, useEffect, useRef } from 'react';
import './CleanSymptomChecker.css';

const CleanSymptomChecker = ({ user, onBack }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      message: `Hello! I'm ARYA. What is your main concern today?`,
      timestamp: new Date()
    }
  ]);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
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
  
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    const userMessage = inputMessage.trim();
    setInputMessage('');
    addMessage('user', userMessage);
    setIsTyping(true);
    
    try {
      // Send message to intelligent backend
      const response = await fetch(`${BACKEND_URL}/api/analyze-symptom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_message: userMessage,
          session_id: sessionId,
          conversation_state: conversationState
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response from server');
      }
      
      const data = await response.json();
      
      // Update conversation state
      setConversationState(data.updated_state);
      
      // Handle emergency detection
      if (data.emergency_detected) {
        setTimeout(() => {
          addMessage('assistant', '🚨 **MEDICAL EMERGENCY DETECTED**\n\nYour symptoms suggest a potential medical emergency. Please:\n\n• Call emergency services immediately (911, 108, 999)\n• Go to the nearest emergency room\n• Do not delay seeking immediate medical attention\n\nI can continue gathering information while you arrange emergency care.');
        }, 500);
      }
      
      // Add assistant response
      setTimeout(() => {
        addMessage('assistant', data.assistant_message);
        
        // If assessment is ready, generate medical assessment
        if (data.assessment_ready && !data.next_question) {
          setTimeout(() => {
            generateAssessment();
          }, 1500);
        }
      }, 800);
      
    } catch (error) {
      console.error('Error getting intelligent response:', error);
      setTimeout(() => {
        addMessage('assistant', 'I apologize, but I\'m having trouble understanding right now. Could you please rephrase that?');
      }, 800);
    } finally {
      setIsTyping(false);
    }
  };
  
  const generateAssessment = async () => {
    addMessage('assistant', '📊 **GENERATING MEDICAL ASSESSMENT**\n\nLet me analyze your symptoms...');
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/generate-assessment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_state: conversationState,
          session_id: sessionId
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate assessment');
      }
      
      const assessment = await response.json();
      
      // Display symptom summary
      setTimeout(() => {
        addMessage('assistant', `**SYMPTOM SUMMARY:**\n${assessment.summary}`);
      }, 2000);
      
      // Display differential diagnoses
      setTimeout(() => {
        const diagnosesText = assessment.diagnoses.map((dx, i) => 
          `**${i+1}. ${dx.condition}** - ${dx.likelihood}% likelihood\n${dx.description}\n*Rationale: ${dx.rationale}*`
        ).join('\n\n');
        
        addMessage('assistant', `**DIFFERENTIAL DIAGNOSIS:**\n\n${diagnosesText}`);
      }, 4000);
      
      // Display triage recommendation
      setTimeout(() => {
        addMessage('assistant', `🚦 **TRIAGE RECOMMENDATION: ${assessment.triage.level}**\n${assessment.triage.recommendation}\n\n⚠️ ${assessment.disclaimer}`);
      }, 6000);
      
    } catch (error) {
      console.error('Error generating assessment:', error);
      setTimeout(() => {
        addMessage('assistant', 'I apologize, but I\'m having trouble generating a complete assessment right now. Please consult with a healthcare provider for proper medical evaluation.');
      }, 2000);
    }
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