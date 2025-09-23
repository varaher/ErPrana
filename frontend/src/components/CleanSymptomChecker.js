import React, { useState, useEffect, useRef } from 'react';
import './CleanSymptomChecker.css';

const CleanSymptomChecker = ({ user, onBack }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      message: `Hello! I'm ARYA. I'll help you with your symptoms using a structured medical approach. Let's start with your main concern.`,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentStep, setCurrentStep] = useState('chief_complaint');
  const [patientData, setPatientData] = useState({
    chiefComplaint: '',
    vitals: {},
    appearance: '',
    hpi: {
      onset: '',
      location: '',
      duration: '',
      character: '',
      aggravatingFactors: '',
      relievingFactors: '',
      timing: '',
      severity: ''
    },
    pastMedicalHistory: [],
    pastSurgicalHistory: [],
    allergies: [],
    medications: [],
    socialHistory: {},
    familyHistory: ''
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
    }, 1000);
  };
  
  const processUserResponse = (response) => {
    switch (currentStep) {
      case 'chief_complaint':
        handleChiefComplaint(response);
        break;
      case 'vitals_check':
        handleVitalsCheck(response);
        break;
      case 'appearance':
        handleAppearance(response);
        break;
      case 'hpi_onset':
        handleHPIOnset(response);
        break;
      case 'hpi_location':
        handleHPILocation(response);
        break;
      case 'hpi_duration':
        handleHPIDuration(response);
        break;
      case 'hpi_character':
        handleHPICharacter(response);
        break;
      case 'hpi_severity':
        handleHPISeverity(response);
        break;
      case 'hpi_aggravating':
        handleHPIAggravating(response);
        break;
      case 'hpi_relieving':
        handleHPIRelieving(response);
        break;
      case 'associated_symptoms':
        handleAssociatedSymptoms(response);
        break;
      case 'past_medical':
        handlePastMedical(response);
        break;
      case 'medications':
        handleMedications(response);
        break;
      case 'allergies':
        handleAllergies(response);
        break;
      case 'social_history':
        handleSocialHistory(response);
        break;
      default:
        break;
    }
  };
  
  const handleChiefComplaint = (response) => {
    setPatientData(prev => ({ ...prev, chiefComplaint: response }));
    
    // Check for emergency symptoms
    const emergencyKeywords = ['chest pain', 'difficulty breathing', 'severe pain', 'unconscious', 'bleeding', 'heart attack', 'stroke', 'can\'t breathe', 'choking'];
    const hasEmergency = emergencyKeywords.some(keyword => response.toLowerCase().includes(keyword));
    
    if (hasEmergency) {
      addMessage('assistant', '🚨 **EMERGENCY**: Based on your symptoms, this could be a medical emergency. Please call emergency services immediately (911, 108, 999) or go to the nearest emergency room.');
      addMessage('assistant', 'While waiting for emergency care, I can still gather some basic information to help the medical team.');
    }
    
    setTimeout(() => {
      addMessage('assistant', 'Thank you. Now, do you know your current vital signs? If yes, please provide:\n• Blood Pressure (e.g., 120/80)\n• Heart Rate (e.g., 72 bpm)\n• Temperature (e.g., 98.6°F)\n• Oxygen Saturation (e.g., 98%)\n\nIf you don\'t know them, just type "unknown" and we\'ll continue.');
      setCurrentStep('vitals_check');
    }, 1500);
  };
  
  const handleVitalsCheck = (response) => {
    if (response.toLowerCase().includes('unknown') || response.toLowerCase().includes('don\'t know')) {
      addMessage('assistant', 'That\'s fine. How do you appear right now? Are you:\n• Comfortable or in distress?\n• Able to speak in full sentences?\n• Any difficulty breathing?\n• Skin color normal or pale/flushed?');
    } else {
      setPatientData(prev => ({ ...prev, vitals: { raw: response } }));
      addMessage('assistant', 'Got your vitals. How do you appear right now? Are you:\n• Comfortable or in distress?\n• Able to speak in full sentences?\n• Any difficulty breathing?\n• Skin color normal or pale/flushed?');
    }
    setCurrentStep('appearance');
  };
  
  const handleAppearance = (response) => {
    setPatientData(prev => ({ ...prev, appearance: response }));
    
    setTimeout(() => {
      addMessage('assistant', 'Now let\'s get detailed history. When did your symptoms first start? Please be specific (e.g., "2 hours ago", "yesterday morning", "3 days ago").');
      setCurrentStep('hpi_onset');
    }, 1000);
  };
  
  const handleHPIOnset = (response) => {
    setPatientData(prev => ({ 
      ...prev, 
      hpi: { ...prev.hpi, onset: response } 
    }));
    
    setTimeout(() => {
      addMessage('assistant', 'Where exactly is the pain/discomfort located? Please be as specific as possible (e.g., "right lower abdomen", "center of chest", "left side of head").');
      setCurrentStep('hpi_location');
    }, 1000);
  };
  
  const handleHPILocation = (response) => {
    setPatientData(prev => ({ 
      ...prev, 
      hpi: { ...prev.hpi, location: response } 
    }));
    
    setTimeout(() => {
      addMessage('assistant', 'How long have you been experiencing this? Has it been constant or intermittent?');
      setCurrentStep('hpi_duration');
    }, 1000);
  };
  
  const handleHPIDuration = (response) => {
    setPatientData(prev => ({ 
      ...prev, 
      hpi: { ...prev.hpi, duration: response } 
    }));
    
    setTimeout(() => {
      addMessage('assistant', 'How would you describe the character of the pain/discomfort? (e.g., "sharp", "dull", "burning", "cramping", "throbbing", "pressure-like")');
      setCurrentStep('hpi_character');
    }, 1000);
  };
  
  const handleHPICharacter = (response) => {
    setPatientData(prev => ({ 
      ...prev, 
      hpi: { ...prev.hpi, character: response } 
    }));
    
    setTimeout(() => {
      addMessage('assistant', 'On a scale of 1-10, how severe is your pain/discomfort? (1 = minimal, 10 = worst pain imaginable)');
      setCurrentStep('hpi_severity');
    }, 1000);
  };
  
  const handleHPISeverity = (response) => {
    setPatientData(prev => ({ 
      ...prev, 
      hpi: { ...prev.hpi, severity: response } 
    }));
    
    setTimeout(() => {
      addMessage('assistant', 'What makes your symptoms worse? (e.g., "movement", "eating", "breathing deeply", "nothing specific")');
      setCurrentStep('hpi_aggravating');
    }, 1000);
  };
  
  const handleHPIAggravating = (response) => {
    setPatientData(prev => ({ 
      ...prev, 
      hpi: { ...prev.hpi, aggravatingFactors: response } 
    }));
    
    setTimeout(() => {
      addMessage('assistant', 'What helps relieve your symptoms? (e.g., "rest", "pain medication", "changing position", "nothing helps")');
      setCurrentStep('hpi_relieving');
    }, 1000);
  };
  
  const handleHPIRelieving = (response) => {
    setPatientData(prev => ({ 
      ...prev, 
      hpi: { ...prev.hpi, relievingFactors: response } 
    }));
    
    setTimeout(() => {
      addMessage('assistant', 'Do you have any other symptoms along with this? (e.g., nausea, vomiting, fever, dizziness, shortness of breath, etc.)');
      setCurrentStep('associated_symptoms');
    }, 1000);
  };
  
  const handleAssociatedSymptoms = (response) => {
    setPatientData(prev => ({ 
      ...prev, 
      hpi: { ...prev.hpi, associatedSymptoms: response } 
    }));
    
    setTimeout(() => {
      addMessage('assistant', 'Do you have any past medical conditions? (e.g., diabetes, hypertension, heart disease, etc.) If none, type "none".');
      setCurrentStep('past_medical');
    }, 1000);
  };
  
  const handlePastMedical = (response) => {
    setPatientData(prev => ({ 
      ...prev, 
      pastMedicalHistory: response === 'none' ? [] : [response] 
    }));
    
    setTimeout(() => {
      addMessage('assistant', 'What medications are you currently taking? Please include dosages if known. If none, type "none".');
      setCurrentStep('medications');
    }, 1000);
  };
  
  const handleMedications = (response) => {
    setPatientData(prev => ({ 
      ...prev, 
      medications: response === 'none' ? [] : [response] 
    }));
    
    setTimeout(() => {
      addMessage('assistant', 'Do you have any known allergies to medications or other substances? If none, type "none".');
      setCurrentStep('allergies');
    }, 1000);
  };
  
  const handleAllergies = (response) => {
    setPatientData(prev => ({ 
      ...prev, 
      allergies: response === 'none' ? [] : [response] 
    }));
    
    setTimeout(() => {
      addMessage('assistant', 'Brief social history: Do you smoke, drink alcohol, or use any recreational drugs? Any recent travel?');
      setCurrentStep('social_history');
    }, 1000);
  };
  
  const handleSocialHistory = (response) => {
    setPatientData(prev => ({ 
      ...prev, 
      socialHistory: { summary: response } 
    }));
    
    setTimeout(() => {
      generateDifferentialDiagnosis();
    }, 1500);
  };
  
  const generateDifferentialDiagnosis = () => {
    const { chiefComplaint, hpi } = patientData;
    
    addMessage('assistant', '📊 **CLINICAL ASSESSMENT COMPLETE**\n\nBased on your symptoms, here are the most likely diagnoses:');
    
    setTimeout(() => {
      // Generate diagnosis based on symptoms
      let diagnoses = generateDiagnoses(chiefComplaint, hpi);
      
      diagnoses.forEach((diagnosis, index) => {
        setTimeout(() => {
          addMessage('assistant', `**${index + 1}. ${diagnosis.condition}** - ${diagnosis.likelihood}% likelihood\n${diagnosis.description}\n*Key factors: ${diagnosis.keyFactors}*`);
        }, (index + 1) * 1500);
      });
      
      setTimeout(() => {
        const triageLevel = calculateTriageLevel(chiefComplaint, hpi);
        addMessage('assistant', `🚦 **TRIAGE LEVEL: ${triageLevel.level}**\n${triageLevel.recommendation}`);
      }, (diagnoses.length + 1) * 1500);
      
      setTimeout(() => {
        addMessage('assistant', `⚠️ **IMPORTANT DISCLAIMER**: This assessment is for educational purposes only and cannot replace professional medical evaluation. Please consult with a healthcare provider for proper diagnosis and treatment.\n\n📞 **Next Steps:**\n• Seek medical attention based on triage level\n• Bring this symptom summary to your healthcare provider\n• Monitor symptoms and seek immediate care if they worsen`);
      }, (diagnoses.length + 2) * 1500);
      
    }, 2000);
  };
  
  const generateDiagnoses = (chiefComplaint, hpi) => {
    const symptoms = chiefComplaint.toLowerCase();
    
    // Example differential diagnosis generation
    if (symptoms.includes('abdominal pain') || symptoms.includes('stomach pain')) {
      return [
        {
          condition: "Gastroenteritis",
          likelihood: 65,
          description: "Inflammation of stomach and intestines, often viral or bacterial",
          keyFactors: "Onset pattern, associated GI symptoms"
        },
        {
          condition: "Appendicitis", 
          likelihood: 25,
          description: "Inflammation of the appendix",
          keyFactors: "Right lower quadrant pain, fever, nausea"
        },
        {
          condition: "Peptic Ulcer Disease",
          likelihood: 45,
          description: "Ulcers in stomach or duodenum",
          keyFactors: "Epigastric pain, relationship to meals"
        },
        {
          condition: "Gallbladder Disease",
          likelihood: 30,
          description: "Gallstones or cholecystitis",
          keyFactors: "Right upper quadrant pain, fatty food intolerance"
        },
        {
          condition: "Bowel Obstruction",
          likelihood: 15,
          description: "Blockage in small or large intestine", 
          keyFactors: "Cramping pain, vomiting, constipation"
        }
      ];
    } else if (symptoms.includes('chest pain')) {
      return [
        {
          condition: "Musculoskeletal Chest Pain",
          likelihood: 70,
          description: "Pain from chest wall muscles or ribs",
          keyFactors: "Reproducible with movement, tender to touch"
        },
        {
          condition: "Gastroesophageal Reflux",
          likelihood: 50,
          description: "Stomach acid irritating esophagus",
          keyFactors: "Burning sensation, relation to meals"
        },
        {
          condition: "Costochondritis",
          likelihood: 40,
          description: "Inflammation of cartilage connecting ribs to sternum",
          keyFactors: "Sharp pain, tender over sternum"
        },
        {
          condition: "Anxiety/Panic Attack",
          likelihood: 35,
          description: "Psychological stress manifesting as physical symptoms",
          keyFactors: "Associated anxiety, palpitations"
        },
        {
          condition: "Cardiac Ischemia",
          likelihood: 15,
          description: "Reduced blood flow to heart muscle - REQUIRES IMMEDIATE EVALUATION",
          keyFactors: "Pressure-like pain, radiation, risk factors"
        }
      ];
    } else if (symptoms.includes('headache')) {
      return [
        {
          condition: "Tension Headache",
          likelihood: 75,
          description: "Most common type of headache, often stress-related",
          keyFactors: "Band-like pressure, bilateral, gradual onset"
        },
        {
          condition: "Migraine",
          likelihood: 45,
          description: "Vascular headache with specific characteristics",
          keyFactors: "Unilateral, throbbing, light/sound sensitivity"
        },
        {
          condition: "Sinus Headache",
          likelihood: 30,
          description: "Secondary to sinus congestion or infection",
          keyFactors: "Facial pressure, nasal congestion"
        },
        {
          condition: "Cluster Headache",
          likelihood: 10,
          description: "Severe headaches occurring in clusters",
          keyFactors: "Severe unilateral pain, eye tearing"
        },
        {
          condition: "Secondary Headache",
          likelihood: 5,
          description: "Headache due to underlying condition - needs evaluation",
          keyFactors: "Sudden onset, 'worst headache of life', neurological symptoms"
        }
      ];
    } else {
      // Generic assessment for other symptoms
      return [
        {
          condition: "Viral Upper Respiratory Infection",
          likelihood: 60,
          description: "Common cold or flu-like illness",
          keyFactors: "Multiple respiratory symptoms, viral prodrome"
        },
        {
          condition: "Bacterial Infection",
          likelihood: 30,
          description: "Bacterial cause of symptoms",
          keyFactors: "Fever pattern, specific organ involvement"
        },
        {
          condition: "Stress-Related Symptoms",
          likelihood: 40,
          description: "Physical manifestation of psychological stress",
          keyFactors: "Multiple vague symptoms, stressors present"
        },
        {
          condition: "Medication Side Effects",
          likelihood: 20,
          description: "Adverse reaction to current medications",
          keyFactors: "Timing with medication changes"
        },
        {
          condition: "Underlying Medical Condition",
          likelihood: 25,
          description: "Symptom of chronic or undiagnosed condition",
          keyFactors: "Persistent symptoms, systemic involvement"
        }
      ];
    }
  };
  
  const calculateTriageLevel = (chiefComplaint, hpi) => {
    const symptoms = chiefComplaint.toLowerCase();
    const severity = parseInt(hpi.severity) || 0;
    
    // Emergency conditions
    const emergencyKeywords = ['chest pain', 'difficulty breathing', 'stroke', 'heart attack', 'unconscious', 'severe bleeding'];
    if (emergencyKeywords.some(keyword => symptoms.includes(keyword)) || severity >= 8) {
      return {
        level: "EMERGENCY (Level 1)",
        recommendation: "🚨 Seek immediate emergency care. Call 911 or go to the nearest emergency room NOW."
      };
    }
    
    // Urgent conditions  
    if (severity >= 6 || symptoms.includes('severe pain') || symptoms.includes('high fever')) {
      return {
        level: "URGENT (Level 2)", 
        recommendation: "⚡ Seek medical care within 2-4 hours. Consider urgent care or emergency department."
      };
    }
    
    // Less urgent conditions
    if (severity >= 4 || symptoms.includes('persistent')) {
      return {
        level: "LESS URGENT (Level 3)",
        recommendation: "🏥 Seek medical care within 24-48 hours. Schedule appointment with primary care physician."
      };
    }
    
    // Non-urgent conditions
    return {
      level: "NON-URGENT (Level 4)",
      recommendation: "📞 Schedule routine appointment with healthcare provider within 1-2 weeks. Monitor symptoms."
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