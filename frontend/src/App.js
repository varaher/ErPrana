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
      
      {/* Components are now handled by currentView routing */}
    </div>
  );
}

export default App;
