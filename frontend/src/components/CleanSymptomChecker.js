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
  
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    const userMessage = inputMessage.trim();
    setInputMessage('');
    addMessage('user', userMessage);
    setIsTyping(true);
    
    // Re-focus the input after a short delay to prevent cursor disappearing
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);

    try {
      console.log('Making API request to:', `${BACKEND_URL}/api/analyze-symptom`);
      console.log('Request payload:', {
        user_message: userMessage,
        session_id: sessionId,
        conversation_state: conversationState,
        user_id: user?.id || user?.email || 'anonymous'
      });
      
      // Send message to intelligent backend
      const response = await fetch(`${BACKEND_URL}/api/analyze-symptom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_message: userMessage,
          session_id: sessionId,
          conversation_state: conversationState,
          user_id: user?.id || user?.email || 'anonymous'
        }),
      });
      
      console.log('Response received:', response.status, response.statusText);
      
      if (!response.ok) {
        console.error('API Response not OK:', response.status, response.statusText);
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('API Response:', data); // Debug log
      
      // Update conversation state
      setConversationState(data.updated_state);
      
      // Handle emergency detection
      if (data.emergency_detected) {
        setTimeout(() => {
          addMessage('assistant', '🚨 **MEDICAL EMERGENCY DETECTED**\n\nYour symptoms suggest a potential medical emergency. Please:\n\n• Call emergency services immediately (911, 108, 999)\n• Go to the nearest emergency room\n• Do not delay seeking immediate medical attention\n\nI can continue gathering information while you arrange emergency care.');
        }, 500);
      }
      
      // Handle user confirmation request
      if (data.needs_user_confirmation) {
        console.log('Showing confirmation message:', data.assistant_message);
        setTimeout(() => {
          addMessage('assistant', data.assistant_message);
        }, 500);
        setIsTyping(false);
        return;
      }
      
      // Show personalization status if available
      if (data.personalized_analysis) {
        setTimeout(() => {
          addMessage('system', '🔒 Using your personal health data and wearables information for personalized analysis');
        }, 300);
      } else if (data.personalized_analysis === false && conversationState.user_confirmed === 'other') {
        setTimeout(() => {
          addMessage('system', '🔒 Providing general medical guidance without using your personal health data');
        }, 300);
      }
      
      // Add assistant response
      setTimeout(() => {
        addMessage('assistant', data.assistant_message);
        
        // Ask conversational follow-up question if provided
        if (data.next_question && !data.assessment_ready) {
          setTimeout(() => {
            addMessage('assistant', data.next_question);
          }, 1500);
        }
        
        // If assessment is ready, generate medical assessment
        if (data.assessment_ready && !data.next_question) {
          setTimeout(() => {
            generateAssessment();
          }, 2000);
        }
        
        // Re-focus input after response
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 100);
      }, 800);
      
    } catch (error) {
      console.error('Error getting intelligent response:', error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      console.error('Request details:', {
        url: `${BACKEND_URL}/api/analyze-symptom`,
        userMessage: userMessage,
        sessionId: sessionId
      });
      // Simple local fallback for common symptoms while we debug the API
      let fallbackResponse = '';
      const messageLower = userMessage.toLowerCase();
      
      if (messageLower.includes('fever')) {
        fallbackResponse = `I understand you're experiencing a fever. This can be concerning. How long have you had the fever, and what's your current temperature?`;
      } else if (messageLower.includes('pain')) {
        fallbackResponse = `I hear you're experiencing pain. Can you tell me where exactly you feel the pain and rate it from 1-10?`;
      } else if (messageLower.includes('cough')) {
        fallbackResponse = `I understand you have a cough. Is it a dry cough or are you bringing up any phlegm? How long have you had it?`;
      } else if (messageLower.includes('headache')) {
        fallbackResponse = `I'm sorry you're experiencing a headache. Can you describe the type of pain - is it throbbing, sharp, or dull? Where exactly is it located?`;
      } else {
        fallbackResponse = `I understand your concern about: "${userMessage}". Can you tell me more details about when this started and how it's affecting you?`;
      }
      
      setTimeout(() => {
        addMessage('assistant', fallbackResponse);
        // Re-focus input after error
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 100);
      }, 800);
    } finally {
      setIsTyping(false);
    }
  };
  
  const generateAssessment = async () => {
    addMessage('assistant', '📊 **CLINICAL ASSESSMENT**\n\nLet me analyze your symptoms using medical protocols...');
    
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
        addMessage('assistant', `**CLINICAL SUMMARY:**\n${assessment.summary}`);
      }, 2000);
      
      // Display differential diagnoses
      setTimeout(() => {
        const diagnosesText = assessment.diagnoses.map((dx, i) => 
          `**${i+1}. ${dx.condition}** - ${dx.likelihood}% likelihood\n${dx.description}\n*Clinical reasoning: ${dx.rationale}*`
        ).join('\n\n');
        
        addMessage('assistant', `**DIFFERENTIAL DIAGNOSIS:**\n\n${diagnosesText}`);
        setFinalDiagnoses(assessment.diagnoses);
      }, 4000);
      
      // Display triage recommendation
      setTimeout(() => {
        addMessage('assistant', `🚦 **MEDICAL RECOMMENDATION: ${assessment.triage.level}**\n${assessment.triage.recommendation}\n\n⚠️ ${assessment.disclaimer}`);
        
        // Show feedback options after complete assessment
        setTimeout(() => {
          setAssessmentComplete(true);
          addMessage('assistant', `I've completed my assessment. How did I do? Your feedback helps me become a better physician assistant.`);
          setShowFeedback(true);
        }, 3000);
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