import React, { useState, useEffect } from 'react';
import "./App.css";
import SymptomChecker from './components/SymptomChecker';
import VitalsTracker from './components/VitalsTracker';
import HealthRecords from './components/HealthRecords';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [backendStatus, setBackendStatus] = useState('checking');
  const [selectedFeature, setSelectedFeature] = useState(null);
  
  useEffect(() => {
    checkBackendStatus();
    const interval = setInterval(checkBackendStatus, 30000);
    return () => clearInterval(interval);
  }, []);
  
  const checkBackendStatus = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/health`);
      if (response.ok) {
        setBackendStatus('online');
      } else {
        setBackendStatus('offline');
      }
    } catch (error) {
      setBackendStatus('offline');
    }
  };
  
  const [activeComponent, setActiveComponent] = useState(null);
  
  const features = [
    {
      id: 'symptom-checker',
      icon: '🩺',
      title: 'Symptom Checker',
      description: 'Chat with AI doctor for symptom analysis, diagnosis and medical guidance.',
      action: () => setActiveComponent('symptom-checker')
    },
    {
      id: 'voice-assistant',
      icon: '🎤',
      title: 'ARYA Voice Assistant',
      description: 'Interact with AI-powered voice assistant for medical guidance and emergency support.',
      action: () => setSelectedFeature('voice-assistant')
    },
    {
      id: 'emergency-protocols',
      icon: '🚑',
      title: 'Emergency Protocols',
      description: 'Access standardized emergency medicine protocols and treatment guidelines.',
      action: () => setSelectedFeature('emergency-protocols')
    },
    {
      id: 'medical-knowledge',
      icon: '📚',
      title: 'Medical Knowledge Base',
      description: 'Browse comprehensive medical information from WikiEM and other trusted sources.',
      action: () => setSelectedFeature('medical-knowledge')
    },
    {
      id: 'triage-system',
      icon: '✅',
      title: 'Intelligent Triage',
      description: 'Smart patient triage system for emergency departments and clinics.',
      action: () => setSelectedFeature('triage-system')
    },
    {
      id: 'multi-language',
      icon: '🌍',
      title: 'Multi-Language Support',
      description: 'Available in multiple languages including English, Spanish, French, Hindi, and more.',
      action: () => setSelectedFeature('multi-language')
    }
  ];
  
  const closeModal = () => setSelectedFeature(null);
  
  const getFeatureContent = (featureId) => {
    const contents = {
      'symptom-checker': {
        title: 'Symptom Checker',
        content: (
          <div>
            <p>This feature provides:</p>
            <ul style={{textAlign: 'left', margin: '20px 0'}}>
              <li>AI-powered symptom analysis</li>
              <li>Evidence-based triage recommendations</li>
              <li>Integration with medical protocols</li>
              <li>Severity assessment</li>
              <li>Treatment suggestions</li>
            </ul>
            <p>Status: Backend API {backendStatus === 'online' ? 'Connected ✅' : 'Offline ❌'}</p>
          </div>
        )
      },
      'voice-assistant': {
        title: 'ARYA Voice Assistant',
        content: (
          <div>
            <p>Voice-powered medical assistant featuring:</p>
            <ul style={{textAlign: 'left', margin: '20px 0'}}>
              <li>Google Cloud Speech-to-Text</li>
              <li>OpenAI Whisper integration</li>
              <li>Real-time voice interaction</li>
              <li>Emergency voice commands</li>
              <li>Multi-language voice support</li>
            </ul>
            <p>Requires API keys for full functionality</p>
          </div>
        )
      },
      'emergency-protocols': {
        title: 'Emergency Protocols',
        content: (
          <div>
            <p>Comprehensive emergency medicine protocols:</p>
            <ul style={{textAlign: 'left', margin: '20px 0'}}>
              <li>ACLS (Advanced Cardiac Life Support)</li>
              <li>PALS (Pediatric Advanced Life Support)</li>
              <li>Trauma protocols</li>
              <li>Medication dosing guidelines</li>
              <li>Diagnostic criteria</li>
            </ul>
          </div>
        )
      },
      'medical-knowledge': {
        title: 'Medical Knowledge Base',
        content: (
          <div>
            <p>Integrated medical knowledge from:</p>
            <ul style={{textAlign: 'left', margin: '20px 0'}}>
              <li>WikiEM (Emergency Medicine)</li>
              <li>Clinical decision rules</li>
              <li>Drug interaction databases</li>
              <li>Diagnostic imaging guides</li>
              <li>Laboratory reference values</li>
            </ul>
          </div>
        )
      },
      'triage-system': {
        title: 'Intelligent Triage',
        content: (
          <div>
            <p>Smart triage system features:</p>
            <ul style={{textAlign: 'left', margin: '20px 0'}}>
              <li>ESI (Emergency Severity Index)</li>
              <li>Automated risk stratification</li>
              <li>Resource utilization prediction</li>
              <li>Wait time optimization</li>
              <li>Clinical decision support</li>
            </ul>
          </div>
        )
      },
      'multi-language': {
        title: 'Multi-Language Support',
        content: (
          <div>
            <p>Supported languages:</p>
            <ul style={{textAlign: 'left', margin: '20px 0'}}>
              <li>🇺🇸 English</li>
              <li>🇪🇸 Spanish (Español)</li>
              <li>🇫🇷 French (Français)</li>
              <li>🇮🇳 Hindi (हिंदी)</li>
              <li>🇮🇳 Tamil (தமிழ்)</li>
              <li>🇮🇳 Telugu (తెలుగు)</li>
              <li>🇮🇳 Kannada (ಕನ್ನಡ)</li>
              <li>🇮🇳 Malayalam (മലയാളം)</li>
              <li>🇸🇦 Arabic (العربية)</li>
            </ul>
          </div>
        )
      }
    };
    return contents[featureId] || {title: 'Feature', content: <p>Feature details</p>};
  };
  
  return (
    <div>
      <div className="api-status">
        <span className={`status-indicator ${backendStatus}`}></span>
        Backend API: {backendStatus === 'online' ? 'Online' : backendStatus === 'offline' ? 'Offline' : 'Checking...'}
      </div>
      
      <div className="container">
        <div className="header">
          <h1>🏥 ErMate</h1>
          <p>Emergency Medicine Assistant with AI-Powered Voice Interface</p>
        </div>
        
        <div className="features-grid">
          {features.map(feature => (
            <div key={feature.id} className="feature-card" onClick={feature.action}>
              <div className="feature-icon">
                {feature.icon}
              </div>
              <div className="feature-title">{feature.title}</div>
              <div className="feature-description">{feature.description}</div>
              <button className="feature-button">
                Learn More
              </button>
            </div>
          ))}
        </div>
      </div>
      
      <button className="emergency-btn" onClick={() => setSelectedFeature('emergency')}>
        📞
      </button>
      
      {selectedFeature && (
        <div className="modal" style={{display: 'block'}}>
          <div className="modal-content">
            <span className="close" onClick={closeModal}>&times;</span>
            {selectedFeature === 'emergency' ? (
              <div>
                <h2>🚨 Emergency</h2>
                <p style={{margin: '20px 0', fontSize: '1.1rem'}}>
                  In case of a medical emergency, call your local emergency number immediately.
                </p>
                <p style={{margin: '20px 0'}}>
                  <strong>US:</strong> 911<br/>
                  <strong>UK:</strong> 999<br/>
                  <strong>India:</strong> 108<br/>
                  <strong>EU:</strong> 112
                </p>
              </div>
            ) : (
              <div>
                <h2>{getFeatureContent(selectedFeature).title}</h2>
                {getFeatureContent(selectedFeature).content}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
