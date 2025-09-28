import React, { useState, useEffect } from 'react';
import "./App.css";
import LoginPage from './components/LoginPage';
import CleanSymptomChecker from './components/CleanSymptomChecker';
import VitalsTracker from './components/VitalsTracker';
import HealthRecords from './components/HealthRecords';
import UserProfile from './components/UserProfile';
import WearablesSync from './components/WearablesSync';
import VoiceAssistant from './components/VoiceAssistant';
import ProfessionalDashboard from './components/ProfessionalDashboard';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard'); // dashboard, symptom-checker, vitals, records, profile, wearables, professional
  const [backendStatus, setBackendStatus] = useState('checking');
  const [voiceResponse, setVoiceResponse] = useState(null);
  
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
    <div className="erprana-app">
      {/* Top Navigation */}
      <nav className="top-nav">
        <div className="nav-left">
          <h1 className="app-name">🌿 ErPrana</h1>
        </div>
        <div className="nav-right">
          <span className="user-greeting">Hi, {user.fullName.split(' ')[0]}!</span>
          <button 
            className="profile-btn"
            onClick={() => setCurrentView('profile')}
          >
            👤
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      </nav>
      
      {/* Main Content */}
      <main className="main-content">
        {currentView === 'dashboard' && (
          <div className="dashboard">
            <div className="welcome-section">
              <h2>Welcome back, {user.fullName.split(' ')[0]}!</h2>
              <p>How can I help you with your health today?</p>
            </div>
            
            <div className="features-grid">
              {features.map(feature => (
                <div key={feature.id} className="clean-feature-card" onClick={feature.action}>
                  <div className="card-icon">{feature.icon}</div>
                  <div className="card-content">
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </div>
                  <div className="card-arrow">→</div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {currentView === 'profile' && (
          <UserProfile 
            user={user} 
            onUpdateUser={handleUpdateUser}
            onClose={() => setCurrentView('dashboard')}
          />
        )}
        
        {currentView === 'vitals' && (
          <VitalsTracker onClose={() => setCurrentView('dashboard')} />
        )}
        
        {currentView === 'records' && (
          <HealthRecords onClose={() => setCurrentView('dashboard')} />
        )}
      </main>
    </div>
  );
}

export default App;
