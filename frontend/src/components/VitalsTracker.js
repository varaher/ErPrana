import React, { useState, useEffect } from 'react';
import './VitalsTracker.css';

const VitalsTracker = ({ onClose }) => {
  const [vitalsData, setVitalsData] = useState({
    heartRate: { value: 72, unit: 'bpm', status: 'normal', timestamp: new Date() },
    bloodPressure: { systolic: 120, diastolic: 80, unit: 'mmHg', status: 'normal', timestamp: new Date() },
    oxygenSaturation: { value: 98, unit: '%', status: 'normal', timestamp: new Date() },
    temperature: { value: 98.6, unit: '°F', status: 'normal', timestamp: new Date() },
    respiratoryRate: { value: 16, unit: '/min', status: 'normal', timestamp: new Date() },
    bloodGlucose: { value: 95, unit: 'mg/dL', status: 'normal', timestamp: new Date() }
  });
  
  const [selectedVital, setSelectedVital] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [newReading, setNewReading] = useState('');
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [vitalsHistory, setVitalsHistory] = useState([]);
  const [timeRange, setTimeRange] = useState('24h'); // 24h, 7d, 30d
  
  useEffect(() => {
    // Simulate device connection check
    checkDeviceConnection();
    
    // Load historical data
    loadVitalsHistory();
    
    // Simulate real-time updates every 30 seconds
    const interval = setInterval(simulateRealtimeUpdate, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  const checkDeviceConnection = async () => {
    // Simulate checking for connected wearable devices
    setTimeout(() => {
      const connected = Math.random() > 0.3; // 70% chance of having a connected device
      setDeviceConnected(connected);
    }, 1000);
  };
  
  const loadVitalsHistory = () => {
    // Simulate loading historical vital signs data
    const history = [];
    const now = new Date();
    
    for (let i = 24; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - (i * 60 * 60 * 1000));
      history.push({
        timestamp,
        heartRate: 65 + Math.random() * 20,
        systolic: 115 + Math.random() * 15,
        diastolic: 75 + Math.random() * 10,
        oxygenSaturation: 96 + Math.random() * 3,
        temperature: 97.5 + Math.random() * 2,
        respiratoryRate: 14 + Math.random() * 6,
        bloodGlucose: 85 + Math.random() * 30
      });
    }
    
    setVitalsHistory(history);
  };
  
  const simulateRealtimeUpdate = () => {
    if (deviceConnected) {
      setVitalsData(prev => ({
        ...prev,
        heartRate: {
          ...prev.heartRate,
          value: Math.round(65 + Math.random() * 20),
          timestamp: new Date()
        },
        oxygenSaturation: {
          ...prev.oxygenSaturation,
          value: Math.round(96 + Math.random() * 3),
          timestamp: new Date()
        }
      }));
    }
  };
  
  const getVitalStatus = (vital, value) => {
    const ranges = {
      heartRate: { normal: [60, 100], warning: [50, 120] },
      systolic: { normal: [90, 120], warning: [80, 140] },
      diastolic: { normal: [60, 80], warning: [50, 90] },
      oxygenSaturation: { normal: [95, 100], warning: [90, 95] },
      temperature: { normal: [97.0, 99.5], warning: [96.0, 101.0] },
      respiratoryRate: { normal: [12, 20], warning: [10, 24] },
      bloodGlucose: { normal: [70, 140], warning: [60, 180] }
    };
    
    const range = ranges[vital];
    if (!range) return 'normal';
    
    if (value >= range.normal[0] && value <= range.normal[1]) return 'normal';
    if (value >= range.warning[0] && value <= range.warning[1]) return 'warning';
    return 'critical';
  };
  
  const handleManualEntry = (vitalType) => {
    setSelectedVital(vitalType);
    setNewReading('');
  };
  
  const saveReading = () => {
    if (!newReading || !selectedVital) return;
    
    const value = parseFloat(newReading);
    const status = getVitalStatus(selectedVital, value);
    
    if (selectedVital === 'bloodPressure') {
      const [systolic, diastolic] = newReading.split('/').map(v => parseInt(v));
      setVitalsData(prev => ({
        ...prev,
        bloodPressure: {
          systolic,
          diastolic,
          unit: 'mmHg',
          status: getVitalStatus('systolic', systolic),
          timestamp: new Date()
        }
      }));
    } else {
      setVitalsData(prev => ({
        ...prev,
        [selectedVital]: {
          ...prev[selectedVital],
          value,
          status,
          timestamp: new Date()
        }
      }));
    }
    
    setSelectedVital(null);
    setNewReading('');
  };
  
  const connectWearableDevice = async () => {
    setIsRecording(true);
    
    // Simulate device connection process
    try {
      // Check if Web Bluetooth API is available
      if ('bluetooth' in navigator) {
        // This would normally connect to a real device
        setTimeout(() => {
          setDeviceConnected(true);
          setIsRecording(false);
          alert('Wearable device connected successfully!');
        }, 2000);
      } else {
        // Fallback for browsers without Bluetooth support
        setTimeout(() => {
          setDeviceConnected(true);
          setIsRecording(false);
          alert('Simulated device connection successful!');
        }, 2000);
      }
    } catch (error) {
      setIsRecording(false);
      alert('Failed to connect device. Please try again.');
    }
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'normal': return '#27ae60';
      case 'warning': return '#f39c12';
      case 'critical': return '#e74c3c';
      default: return '#7f8c8d';
    }
  };
  
  const vitalsConfig = [
    {
      key: 'heartRate',
      name: 'Heart Rate',
      icon: '❤️',
      color: '#e74c3c'
    },
    {
      key: 'bloodPressure',
      name: 'Blood Pressure',
      icon: '🩸',
      color: '#3498db'
    },
    {
      key: 'oxygenSaturation',
      name: 'Oxygen Saturation',
      icon: '🫁',
      color: '#2ecc71'
    },
    {
      key: 'temperature',
      name: 'Temperature',
      icon: '🌡️',
      color: '#f39c12'
    },
    {
      key: 'respiratoryRate',
      name: 'Respiratory Rate',
      icon: '💨',
      color: '#9b59b6'
    },
    {
      key: 'bloodGlucose',
      name: 'Blood Glucose',
      icon: '🍯',
      color: '#e67e22'
    }
  ];
  
  return (
    <div className="vitals-tracker-modal">
      <div className="vitals-tracker-container">
        <div className="vitals-header">
          <h2>📊 Vitals Tracking</h2>
          <div className="device-status">
            <span className={`device-indicator ${deviceConnected ? 'connected' : 'disconnected'}`}></span>
            {deviceConnected ? 'Device Connected' : 'No Device'}
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="vitals-content">
          <div className="connection-section">
            <div className="connection-info">
              <h3>🔗 Wearable Devices</h3>
              <p>Connect your smartwatch, fitness tracker, or health monitor for automatic vital signs tracking.</p>
            </div>
            <button 
              className={`connect-btn ${deviceConnected ? 'connected' : ''}`}
              onClick={connectWearableDevice}
              disabled={isRecording || deviceConnected}
            >
              {isRecording ? 'Connecting...' : deviceConnected ? 'Connected ✓' : 'Connect Device'}
            </button>
          </div>
          
          <div className="vitals-grid">
            {vitalsConfig.map((config) => {
              const vital = vitalsData[config.key];
              const isBloodPressure = config.key === 'bloodPressure';
              
              return (
                <div key={config.key} className="vital-card">
                  <div className="vital-header">
                    <span className="vital-icon">{config.icon}</span>
                    <h4>{config.name}</h4>
                    <span 
                      className="vital-status"
                      style={{ backgroundColor: getStatusColor(vital.status) }}
                    ></span>
                  </div>
                  
                  <div className="vital-value">
                    {isBloodPressure ? (
                      <span className="value">{vital.systolic}/{vital.diastolic}</span>
                    ) : (
                      <span className="value">{vital.value}</span>
                    )}
                    <span className="unit">{vital.unit}</span>
                  </div>
                  
                  <div className="vital-footer">
                    <span className="timestamp">
                      {vital.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    <button 
                      className="manual-btn"
                      onClick={() => handleManualEntry(config.key)}
                    >
                      Manual Entry
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="vitals-summary">
            <h3>📈 Health Summary</h3>
            <div className="summary-cards">
              <div className="summary-card normal">
                <span className="summary-count">
                  {Object.values(vitalsData).filter(v => v.status === 'normal').length}
                </span>
                <span className="summary-label">Normal</span>
              </div>
              <div className="summary-card warning">
                <span className="summary-count">
                  {Object.values(vitalsData).filter(v => v.status === 'warning').length}
                </span>
                <span className="summary-label">Warning</span>
              </div>
              <div className="summary-card critical">
                <span className="summary-count">
                  {Object.values(vitalsData).filter(v => v.status === 'critical').length}
                </span>
                <span className="summary-label">Critical</span>
              </div>
            </div>
          </div>
        </div>
        
        {selectedVital && (
          <div className="manual-entry-modal">
            <div className="manual-entry-content">
              <h3>Enter {vitalsConfig.find(v => v.key === selectedVital)?.name}</h3>
              <input
                type="text"
                value={newReading}
                onChange={(e) => setNewReading(e.target.value)}
                placeholder={selectedVital === 'bloodPressure' ? 'e.g., 120/80' : 'Enter value'}
                className="reading-input"
              />
              <div className="entry-buttons">
                <button onClick={() => setSelectedVital(null)} className="cancel-btn">
                  Cancel
                </button>
                <button onClick={saveReading} className="save-btn">
                  Save Reading
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VitalsTracker;