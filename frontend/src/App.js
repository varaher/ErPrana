import React, { useState, useEffect } from 'react';
import "./App.css";
import LoginPage from './components/LoginPage';
import CleanSymptomChecker from './components/CleanSymptomChecker';
import VitalsTracker from './components/VitalsTracker';
import HealthRecords from './components/HealthRecords';
import UserProfile from './components/UserProfile';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard'); // dashboard, symptom-checker, vitals, records, profile
  const [backendStatus, setBackendStatus] = useState('checking');
  
  useEffect(() => {
    // Check for existing user session
    const savedUser = localStorage.getItem('erprana_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    
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
  
  const handleLogin = (userData) => {
    setUser(userData);
  };
  
  const handleLogout = () => {
    localStorage.removeItem('erprana_user');
    setUser(null);
    setCurrentView('dashboard');
  };
  
  const handleUpdateUser = (updatedUser) => {
    setUser(updatedUser);
  };
  
  // Show login page if no user
  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }
  
  // Show symptom checker as separate page
  if (currentView === 'symptom-checker') {
    return <CleanSymptomChecker user={user} onBack={() => setCurrentView('dashboard')} />;
  }
  
  // Main dashboard features - clean and minimal
  const features = [
    {
      id: 'symptom-checker',
      icon: '🩺',
      title: 'Symptom Checker',
      description: 'Chat with ARYA about your health concerns',
      action: () => setCurrentView('symptom-checker')
    },
    {
      id: 'vitals-tracker',
      icon: '📊',
      title: 'Health Monitoring',
      description: 'Track vitals from wearable devices',
      action: () => setCurrentView('vitals')
    },
    {
      id: 'health-records',
      icon: '📋',
      title: 'Health Records',
      description: 'View your medical history and reports',
      action: () => setCurrentView('records')
    }
  ];
  
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
          <h1>🌿 ErPrana</h1>
          <p>Your Personal Health Assistant</p>
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
      
      {/* Active Components */}
      {activeComponent === 'symptom-checker' && (
        <SymptomChecker onClose={() => setActiveComponent(null)} />
      )}
      
      {activeComponent === 'vitals-tracker' && (
        <VitalsTracker onClose={() => setActiveComponent(null)} />
      )}
      
      {activeComponent === 'health-records' && (
        <HealthRecords onClose={() => setActiveComponent(null)} />
      )}
    </div>
  );
}

export default App;
