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
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const lowerMessage = userMessage.toLowerCase();
    
    // Emergency keywords detection - more comprehensive
    const emergencyKeywords = [
      'chest pain', 'difficulty breathing', 'severe pain', 'unconscious', 'bleeding heavily', 
      'stroke', 'heart attack', 'can\'t breathe', 'crushing chest pain', 'severe abdominal pain',
      'severe headache', 'loss of consciousness', 'seizure', 'anaphylaxis', 'allergic reaction',
      'difficulty swallowing', 'severe vomiting', 'severe diarrhea', 'high fever', 'dehydration'
    ];
    const hasEmergency = emergencyKeywords.some(keyword => lowerMessage.includes(keyword));
    
    if (hasEmergency) {
      addMessage('bot', '🚨 EMERGENCY ALERT: Based on your symptoms, you should seek immediate medical attention. Please call emergency services (911, 108, 999) or go to the nearest emergency room right away.');
      addMessage('bot', 'Do not delay seeking professional medical help. Would you like me to provide general first aid guidance while you arrange for emergency care?');
      return;
    }
    
    // Advanced symptom analysis with WikiEM-style medical reasoning
    await performMedicalAnalysis(lowerMessage, currentStep);
  };
  
  const performMedicalAnalysis = async (message, step) => {
    // Enhanced medical reasoning with WikiEM-style approach
    const symptoms = extractSymptoms(message);
    const medicalContext = analyzeMedicalContext(message);
    
    if (step === 'symptoms' || step === 'followup') {
      // Generate intelligent follow-up questions based on symptoms
      const followUpQuestions = generateFollowUpQuestions(symptoms, medicalContext);
      
      if (followUpQuestions.length > 0) {
        addMessage('bot', `I understand you're experiencing ${symptoms.join(', ')}. Let me gather some more specific information to provide better guidance:`);
        
        followUpQuestions.forEach((question, index) => {
          setTimeout(() => {
            addMessage('bot', `${index + 1}. ${question}`);
          }, (index + 1) * 800);
        });
        
        setCurrentStep('followup');
      } else {
        // Move to analysis if we have enough information
        setTimeout(() => performDifferentialDiagnosis(message), 2000);
      }
    } else {
      // Perform differential diagnosis
      await performDifferentialDiagnosis(message);
    }
  };
  
  const extractSymptoms = (message) => {
    const commonSymptoms = {
      'flank pain': ['ureteric colic', 'kidney stone', 'pyelonephritis'],
      'colicky pain': ['ureteric colic', 'bowel obstruction', 'biliary colic'],
      'radiating pain': ['ureteric colic', 'sciatica', 'myocardial infarction'],
      'severe pain': ['ureteric colic', 'acute abdomen', 'myocardial infarction'],
      'nausea vomiting': ['ureteric colic', 'gastroenteritis', 'bowel obstruction'],
      'blood in urine': ['ureteric colic', 'UTI', 'bladder cancer'],
      'hematuria': ['ureteric colic', 'UTI', 'glomerulonephritis'],
      'back pain': ['ureteric colic', 'pyelonephritis', 'musculoskeletal'],
      'abdominal pain': ['ureteric colic', 'appendicitis', 'cholecystitis'],
      'headache': ['tension headache', 'migraine', 'cluster headache'],
      'fever': ['infection', 'viral syndrome', 'bacterial infection'],
      'cough': ['upper respiratory infection', 'pneumonia', 'asthma'],
      'chest pain': ['myocardial infarction', 'angina', 'pneumonia'],
      'shortness of breath': ['asthma', 'pneumonia', 'heart failure']
    };
    
    const foundSymptoms = [];
    Object.keys(commonSymptoms).forEach(symptom => {
      if (message.toLowerCase().includes(symptom)) {
        foundSymptoms.push(symptom);
      }
    });
    
    return foundSymptoms.length > 0 ? foundSymptoms : ['unspecified symptoms'];
  };
  
  const analyzeMedicalContext = (message) => {
    const context = {
      severity: 'moderate',
      duration: 'acute',
      associated: []
    };
    
    // Severity assessment
    if (message.includes('severe') || message.includes('excruciating')) {
      context.severity = 'severe';
    } else if (message.includes('mild') || message.includes('slight')) {
      context.severity = 'mild';
    }
    
    // Duration assessment
    if (message.includes('sudden') || message.includes('acute')) {
      context.duration = 'acute';
    } else if (message.includes('chronic') || message.includes('persistent')) {
      context.duration = 'chronic';
    }
    
    return context;
  };
  
  const generateFollowUpQuestions = (symptoms, context) => {
    const questions = [];
    
    // Symptom-specific questions based on WikiEM protocols
    if (symptoms.some(s => s.includes('flank pain') || s.includes('colicky pain'))) {
      questions.push('Does the pain radiate from your back/flank to your groin or genitals?');
      questions.push('Is the pain colicky (comes in waves) or constant?');
      questions.push('Have you noticed any blood in your urine or changes in urination?');
      questions.push('Any nausea, vomiting, or fever?');
      questions.push('Have you had kidney stones before?');
    } else if (symptoms.some(s => s.includes('chest pain'))) {
      questions.push('Is the pain crushing, squeezing, or sharp?');
      questions.push('Does it radiate to your arm, jaw, or back?');
      questions.push('Any shortness of breath or sweating?');
      questions.push('Does the pain worsen with breathing or movement?');
    } else if (symptoms.some(s => s.includes('headache'))) {
      questions.push('Is this the worst headache of your life?');
      questions.push('Is it one-sided or both sides of your head?');
      questions.push('Any visual changes, nausea, or sensitivity to light?');
      questions.push('Did it start suddenly or gradually?');
    } else if (symptoms.some(s => s.includes('abdominal pain'))) {
      questions.push('Where exactly is the pain located?');
      questions.push('Does the pain move or radiate anywhere?');
      questions.push('Any nausea, vomiting, or changes in bowel movements?');
      questions.push('Does eating make it better or worse?');
    }
    
    // Always ask about timeline and severity if not already specified
    if (!questions.length) {
      questions.push('When did these symptoms start?');
      questions.push('On a scale of 1-10, how severe are they?');
      questions.push('Have you experienced anything like this before?');
    }
    
    return questions.slice(0, 4); // Limit to 4 questions
  };
  
  const performDifferentialDiagnosis = async (allSymptoms) => {
    addMessage('bot', '🔍 **Analyzing your symptoms using medical knowledge base...**');
    
    // Simulate advanced medical analysis
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const differentialDiagnoses = generateDifferentialDiagnoses(allSymptoms);
    
    addMessage('bot', '📋 **Based on your symptoms, here are the 5 most likely conditions:**');
    
    differentialDiagnoses.forEach((diagnosis, index) => {
      setTimeout(() => {
        addMessage('bot', `**${index + 1}. ${diagnosis.condition}** (${diagnosis.probability}% likelihood)\n${diagnosis.description}\n\n**Key Features:** ${diagnosis.keyFeatures.join(', ')}\n**Recommended Action:** ${diagnosis.action}`);
      }, (index + 1) * 1500);
    });
    
    setTimeout(() => {
      addMessage('bot', '⚠️ **IMPORTANT MEDICAL DISCLAIMER:**\nThis analysis is for educational purposes only and should not replace professional medical evaluation. Please consult a healthcare provider for proper diagnosis and treatment.\n\n**Seek immediate medical attention if:**\n• Symptoms worsen rapidly\n• Severe pain (8/10 or higher)\n• High fever (>101.3°F/38.5°C)\n• Difficulty breathing\n• Loss of consciousness');
      
      addMessage('bot', '🏥 **Next Steps:**\n1. Monitor your symptoms\n2. Consider seeing a healthcare provider\n3. Keep a symptom diary\n4. Follow up if symptoms persist or worsen\n\nWould you like information about nearby healthcare facilities or have any other questions?');
      
      setCurrentStep('recommendation');
    }, 8000);
  };
  
  const generateDifferentialDiagnoses = (symptoms) => {
    const lowerSymptoms = symptoms.toLowerCase();
    
    // Enhanced diagnostic logic based on symptom patterns
    if (lowerSymptoms.includes('flank pain') || lowerSymptoms.includes('colicky') || 
        lowerSymptoms.includes('kidney stone') || lowerSymptoms.includes('ureteric')) {
      return [
        {
          condition: 'Ureteric Colic (Kidney Stone)',
          probability: 85,
          description: 'Stone blocking ureter causing severe colicky pain',
          keyFeatures: ['Severe flank pain', 'Radiating to groin', 'Nausea/vomiting', 'Hematuria'],
          action: 'Urgent medical evaluation, imaging (CT scan), pain management'
        },
        {
          condition: 'Acute Pyelonephritis',
          probability: 75,
          description: 'Kidney infection causing similar symptoms',
          keyFeatures: ['Flank pain', 'Fever', 'Dysuria', 'Costovertebral angle tenderness'],
          action: 'Immediate medical attention, urine culture, antibiotic therapy'
        },
        {
          condition: 'Renal Infarction',
          probability: 60,
          description: 'Blocked blood supply to kidney',
          keyFeatures: ['Sudden severe flank pain', 'Hematuria', 'Elevated LDH'],
          action: 'Emergency evaluation, CT angiography, immediate intervention'
        },
        {
          condition: 'Musculoskeletal Back Pain',
          probability: 40,
          description: 'Muscle strain or spinal issue',
          keyFeatures: ['Localized back pain', 'Movement-related', 'No systemic symptoms'],
          action: 'Conservative management, physical therapy, pain relief'
        },
        {
          condition: 'Abdominal Aortic Aneurysm',
          probability: 20,
          description: 'Serious vascular condition (if >50 years)',
          keyFeatures: ['Severe back/abdominal pain', 'Pulsatile mass', 'Hypotension'],
          action: 'IMMEDIATE emergency evaluation - life-threatening condition'
        }
      ];
    } else if (lowerSymptoms.includes('chest pain')) {
      return [
        {
          condition: 'Acute Coronary Syndrome',
          probability: 70,
          description: 'Heart attack or unstable angina',
          keyFeatures: ['Crushing chest pain', 'Radiating pain', 'Sweating', 'Shortness of breath'],
          action: 'IMMEDIATE emergency care - call 911'
        },
        {
          condition: 'Pulmonary Embolism',
          probability: 60,
          description: 'Blood clot in lung vessels',
          keyFeatures: ['Sharp chest pain', 'Shortness of breath', 'Rapid heart rate'],
          action: 'Emergency evaluation, CT pulmonary angiogram'
        },
        {
          condition: 'Pneumonia',
          probability: 50,
          description: 'Lung infection',
          keyFeatures: ['Chest pain with breathing', 'Cough', 'Fever', 'Sputum'],
          action: 'Medical evaluation, chest X-ray, possible antibiotics'
        },
        {
          condition: 'Gastroesophageal Reflux',
          probability: 45,
          description: 'Acid reflux causing chest discomfort',
          keyFeatures: ['Burning chest pain', 'After meals', 'Lying down worsens'],
          action: 'Dietary changes, antacids, medical evaluation if persistent'
        },
        {
          condition: 'Musculoskeletal Pain',
          probability: 35,
          description: 'Chest wall muscle strain',
          keyFeatures: ['Localized pain', 'Movement-related', 'Tender to touch'],
          action: 'Rest, anti-inflammatory medications, heat/ice therapy'
        }
      ];
    } else {
      // Generic symptom analysis
      return [
        {
          condition: 'Viral Syndrome',
          probability: 60,
          description: 'Common viral infection',
          keyFeatures: ['Multiple symptoms', 'Gradual onset', 'Self-limiting'],
          action: 'Supportive care, rest, hydration, symptom monitoring'
        },
        {
          condition: 'Bacterial Infection',
          probability: 45,
          description: 'Bacterial cause requiring treatment',
          keyFeatures: ['Fever', 'Localized symptoms', 'Progressive course'],
          action: 'Medical evaluation, possible antibiotic therapy'
        },
        {
          condition: 'Stress-Related Symptoms',
          probability: 40,
          description: 'Physical manifestation of psychological stress',
          keyFeatures: ['Multiple vague symptoms', 'Timing with stressors'],
          action: 'Stress management, lifestyle changes, counseling if needed'
        },
        {
          condition: 'Medication Side Effects',
          probability: 30,
          description: 'Adverse reaction to medications',
          keyFeatures: ['Timing with new medications', 'Known side effects'],
          action: 'Review medications with healthcare provider'
        },
        {
          condition: 'Chronic Medical Condition',
          probability: 25,
          description: 'Underlying chronic disease manifestation',
          keyFeatures: ['Gradual onset', 'Progressive symptoms', 'System involvement'],
          action: 'Comprehensive medical evaluation, specialist referral'
        }
      ];
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