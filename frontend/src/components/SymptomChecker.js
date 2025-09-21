import React, { useState, useEffect, useRef } from 'react';
import './SymptomChecker.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const SymptomChecker = ({ onClose }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      message: "Hello! I'm your AI health assistant. I'll help you understand your symptoms and provide basic medical guidance. Please note that I cannot replace professional medical advice.",
      timestamp: new Date()
    },
    {
      id: 2,
      type: 'bot',
      message: "To get started, please tell me: What symptoms are you experiencing? Be as detailed as possible.",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [userProfile, setUserProfile] = useState({
    age: null,
    gender: null,
    medicalHistory: []
  });
  const [currentStep, setCurrentStep] = useState('symptoms'); // symptoms, followup, assessment, recommendation
  
  const messagesEndRef = useRef(null);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
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
  };
  
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    const userMessage = inputMessage.trim();
    setInputMessage('');
    addMessage('user', userMessage);
    setIsLoading(true);
    
    try {
      // Simulate AI response based on current step
      await simulateAIResponse(userMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      addMessage('bot', 'Sorry, I encountered an error. Please try again or consult a healthcare professional if this is urgent.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const simulateAIResponse = async (userMessage) => {
    // Simulate thinking delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const lowerMessage = userMessage.toLowerCase();
    
    // Emergency keywords detection
    const emergencyKeywords = ['chest pain', 'difficulty breathing', 'severe pain', 'unconscious', 'bleeding heavily', 'stroke', 'heart attack'];
    const hasEmergency = emergencyKeywords.some(keyword => lowerMessage.includes(keyword));
    
    if (hasEmergency) {
      addMessage('bot', '🚨 EMERGENCY ALERT: Based on your symptoms, you should seek immediate medical attention. Please call emergency services (911, 108, 999) or go to the nearest emergency room right away.');
      addMessage('bot', 'Do not delay seeking professional medical help. Would you like me to provide general first aid guidance while you arrange for emergency care?');
      return;
    }
    
    switch (currentStep) {
      case 'symptoms':
        await handleSymptomsPhase(lowerMessage);
        break;
      case 'followup':
        await handleFollowupPhase(lowerMessage);
        break;
      case 'assessment':
        await handleAssessmentPhase(lowerMessage);
        break;
      default:
        addMessage('bot', 'I understand. Is there anything else about your symptoms you\'d like to discuss?');
    }
  };
  
  const handleSymptomsPhase = async (message) => {
    // Analyze symptoms and ask follow-up questions
    if (message.includes('headache')) {
      addMessage('bot', 'I understand you\'re experiencing headaches. Let me ask a few questions to better understand your condition:');
      addMessage('bot', '1. How long have you been experiencing these headaches?\n2. On a scale of 1-10, how would you rate the pain?\n3. Where exactly is the pain located?\n4. Have you taken any medication?');
      setCurrentStep('followup');
    } else if (message.includes('fever') || message.includes('temperature')) {
      addMessage('bot', 'I see you mentioned fever. This is important information. Let me gather more details:');
      addMessage('bot', '1. What is your current temperature if you\'ve measured it?\n2. How long have you had the fever?\n3. Are you experiencing any other symptoms like chills, body aches, or fatigue?\n4. Have you taken any fever-reducing medication?');
      setCurrentStep('followup');
    } else if (message.includes('cough')) {
      addMessage('bot', 'Thank you for telling me about your cough. I\'d like to understand it better:');
      addMessage('bot', '1. Is it a dry cough or do you produce phlegm?\n2. How long have you had this cough?\n3. Is it worse at any particular time of day?\n4. Do you have any other symptoms like fever, shortness of breath, or chest pain?');
      setCurrentStep('followup');
    } else if (message.includes('stomach') || message.includes('abdominal') || message.includes('nausea')) {
      addMessage('bot', 'I understand you\'re having stomach/abdominal issues. Let me ask some clarifying questions:');
      addMessage('bot', '1. Where exactly is the pain/discomfort located?\n2. When did it start?\n3. Is the pain constant or does it come and go?\n4. Have you experienced vomiting, diarrhea, or changes in appetite?\n5. Any recent changes in diet or medication?');
      setCurrentStep('followup');
    } else {
      addMessage('bot', 'Thank you for describing your symptoms. To provide better guidance, I need some additional information:');
      addMessage('bot', '1. When did these symptoms start?\n2. How severe are they on a scale of 1-10?\n3. Have you experienced anything like this before?\n4. Are you currently taking any medications?\n5. Do you have any known medical conditions?');
      setCurrentStep('followup');
    }
  };
  
  const handleFollowupPhase = async (message) => {
    addMessage('bot', 'Thank you for providing that additional information. Let me analyze your symptoms...');
    
    // Simulate analysis delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    addMessage('bot', 'Based on the information you\'ve provided, here\'s my assessment:');
    
    // Provide general assessment
    const assessments = [
      {
        condition: 'Common Cold/Upper Respiratory Infection',
        likelihood: 'Moderate',
        recommendations: [
          'Rest and stay hydrated',
          'Consider over-the-counter pain relievers',
          'Use throat lozenges or warm salt water gargles',
          'Monitor your symptoms'
        ]
      },
      {
        condition: 'Tension Headache',
        likelihood: 'High',
        recommendations: [
          'Try relaxation techniques',
          'Apply cold or warm compress',
          'Stay hydrated',
          'Consider over-the-counter pain relievers',
          'Ensure adequate sleep'
        ]
      }
    ];
    
    const randomAssessment = assessments[Math.floor(Math.random() * assessments.length)];
    
    addMessage('bot', `**Possible Condition:** ${randomAssessment.condition}`);
    addMessage('bot', `**Likelihood:** ${randomAssessment.likelihood}`);
    addMessage('bot', `**General Recommendations:**\n${randomAssessment.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}`);
    
    addMessage('bot', '⚠️ **Important:** This is not a medical diagnosis. Please consult with a healthcare professional for proper evaluation and treatment, especially if symptoms persist or worsen.');
    
    addMessage('bot', '**When to seek immediate medical attention:**\n• Symptoms suddenly worsen\n• High fever (>101.3°F/38.5°C)\n• Severe pain\n• Difficulty breathing\n• Persistent vomiting');
    
    addMessage('bot', 'Would you like me to help you find nearby healthcare facilities or do you have any other questions about your symptoms?');
    
    setCurrentStep('recommendation');
  };
  
  const handleAssessmentPhase = async (message) => {
    if (message.includes('doctor') || message.includes('hospital')) {
      addMessage('bot', 'Here are some options for finding medical care:');
      addMessage('bot', '🏥 **Emergency Services:** Call 911 (US), 108 (India), 999 (UK)\n🏥 **Urgent Care:** Look for nearby urgent care centers\n🏥 **Primary Care:** Contact your regular doctor\n🏥 **Telemedicine:** Consider online consultations');
    } else {
      addMessage('bot', 'I\'m here to help! Feel free to ask about your symptoms, general health questions, or if you need guidance on when to seek medical care.');
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const quickResponses = [
    "I have a headache",
    "I'm feeling feverish",
    "I have a persistent cough",
    "My stomach hurts",
    "I'm feeling dizzy",
    "I need emergency help"
  ];
  
  const handleQuickResponse = (response) => {
    setInputMessage(response);
  };
  
  return (
    <div className="symptom-checker-modal">
      <div className="symptom-checker-container">
        <div className="symptom-checker-header">
          <h2>🩺 AI Health Assistant</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="chat-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.type}`}>
              <div className="message-content">
                <div className="message-text">{msg.message}</div>
                <div className="message-time">
                  {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="message bot">
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {messages.length <= 3 && (
          <div className="quick-responses">
            <p>Quick responses:</p>
            <div className="quick-response-buttons">
              {quickResponses.map((response, index) => (
                <button
                  key={index}
                  className="quick-response-btn"
                  onClick={() => handleQuickResponse(response)}
                >
                  {response}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div className="chat-input-container">
          <div className="chat-input-wrapper">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Describe your symptoms in detail..."
              className="chat-input"
              rows="2"
              disabled={isLoading}
            />
            <button
              className="send-btn"
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
            >
              Send
            </button>
          </div>
        </div>
        
        <div className="disclaimer">
          ⚠️ This is not medical advice. Consult healthcare professionals for proper diagnosis and treatment.
        </div>
      </div>
    </div>
  );
};

export default SymptomChecker;