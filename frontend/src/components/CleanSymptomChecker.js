import React, { useState, useEffect, useRef } from 'react';
import './CleanSymptomChecker.css';

const CleanSymptomChecker = ({ user, onBack }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      message: `Hello! I'm ARYA.`,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  useEffect(() => {
    // Focus input on load
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
    
    // Simulate AI response
    setTimeout(async () => {
      await processUserMessage(userMessage);
      setIsTyping(false);
    }, 1000);
  };
  
  const processUserMessage = async (message) => {
    const lowerMessage = message.toLowerCase();
    
    // Emergency detection
    const emergencyKeywords = ['chest pain', 'difficulty breathing', 'severe pain', 'unconscious', 'bleeding', 'heart attack', 'stroke'];
    const hasEmergency = emergencyKeywords.some(keyword => lowerMessage.includes(keyword));
    
    if (hasEmergency) {
      addMessage('assistant', '🚨 This sounds like it could be a medical emergency. Please call emergency services immediately (911, 108, 999) or go to the nearest emergency room.');
      addMessage('assistant', 'Your safety is my priority. Please seek immediate medical attention while I provide some general guidance.');
      return;
    }
    
    // Symptom analysis
    if (lowerMessage.includes('flank pain') || lowerMessage.includes('kidney') || lowerMessage.includes('groin')) {
      addMessage('assistant', 'I understand you\'re experiencing flank pain. Let me ask a few important questions:');
      
      setTimeout(() => {
        addMessage('assistant', '1. When did this pain start?\n2. On a scale of 1-10, how severe is it?\n3. Does it come in waves or is it constant?\n4. Any nausea or blood in urine?');
      }, 1500);
      
      setTimeout(() => {
        addMessage('assistant', 'Based on your symptoms, here are the most likely conditions:\n\n**1. Ureteric Colic (Kidney Stone)** - 85% likelihood\nSevere colicky pain from kidney stone\n\n**2. Pyelonephritis** - 70% likelihood\nKidney infection\n\n**3. Musculoskeletal Pain** - 45% likelihood\nBack muscle strain\n\n**Recommendation:** See a healthcare provider urgently for proper evaluation.');
        
        // Add feedback buttons
        setTimeout(() => {
          addMessage('feedback', 'Was this diagnosis helpful?');
        }, 2000);
      }, 4000);
      
    } else if (lowerMessage.includes('headache')) {
      addMessage('assistant', 'I\'m sorry you\'re experiencing a headache. Let me gather some information:');
      
      setTimeout(() => {
        addMessage('assistant', '1. How long have you had this headache?\n2. Is it the worst headache of your life?\n3. Any visual changes or neck stiffness?\n4. Rate the pain 1-10?');
      }, 1500);
      
      setTimeout(() => {
        addMessage('assistant', 'Based on your symptoms:\n\n**1. Tension Headache** - 75% likelihood\nStress-related headache\n\n**2. Migraine** - 60% likelihood\nSevere headache with other symptoms\n\n**3. Cluster Headache** - 40% likelihood\nSharp, intense headache\n\n**Recommendation:** Rest, hydration, and over-the-counter pain relief. See a doctor if severe or persistent.');
        
        setTimeout(() => {
          addMessage('feedback', 'Was this diagnosis helpful?');
        }, 2000);
      }, 4000);
      
    } else {
      addMessage('assistant', 'Thank you for sharing your symptoms. Could you describe them in more detail? For example:');
      
      setTimeout(() => {
        addMessage('assistant', '• Where is the pain/discomfort?\n• When did it start?\n• How severe is it?\n• Any other symptoms?\n\nThis will help me provide better guidance.');
      }, 1500);
    }
  };
  
  const handleFeedback = (isPositive) => {
    setFeedbackGiven(true);
    
    if (isPositive) {
      addMessage('assistant', '👍 Thank you! Your feedback helps me learn and improve.');
    } else {
      addMessage('assistant', '👎 Thank you for the feedback. I\'ll work on providing better analysis in the future.');
    }
    
    setTimeout(() => {
      addMessage('assistant', '⚠️ **Important Reminder:** This is for guidance only. Please consult a healthcare provider for proper diagnosis and treatment.\n\nIs there anything else I can help you with?');
    }, 2000);
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
                
                {msg.type === 'feedback' && !feedbackGiven && (
                  <div className="feedback-buttons">
                    <button 
                      className="feedback-btn positive"
                      onClick={() => handleFeedback(true)}
                    >
                      👍 Helpful
                    </button>
                    <button 
                      className="feedback-btn negative"
                      onClick={() => handleFeedback(false)}
                    >
                      👎 Not helpful
                    </button>
                  </div>
                )}
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