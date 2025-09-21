import React, { useState, useEffect } from 'react';
import './UserProfile.css';

const UserProfile = ({ user, onUpdateUser, onClose }) => {
  const [profileData, setProfileData] = useState({
    fullName: user.fullName || '',
    email: user.email || '',
    dateOfBirth: '',
    gender: '',
    isProfessional: user.isProfessional || false,
    medicalLicense: '',
    specialization: '',
    existingDiseases: user.profile?.existingDiseases || [],
    medications: user.profile?.medications || [],
    allergies: [],
    emergencyContact: '',
    wearableConnected: user.profile?.wearableConnected || false
  });
  
  const [newDisease, setNewDisease] = useState('');
  const [newMedication, setNewMedication] = useState('');
  const [newAllergy, setNewAllergy] = useState('');
  const [wearablePermission, setWearablePermission] = useState(false);
  
  useEffect(() => {
    // Check if user already gave wearable permission
    setWearablePermission(profileData.wearableConnected);
  }, [profileData.wearableConnected]);
  
  const handleInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const addItem = (field, newItem, setNewItem) => {
    if (newItem.trim()) {
      setProfileData(prev => ({
        ...prev,
        [field]: [...prev[field], newItem.trim()]
      }));
      setNewItem('');
    }
  };
  
  const removeItem = (field, index) => {
    setProfileData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };
  
  const handleWearablePermission = () => {
    if (wearablePermission) {
      // Request permission for wearable data
      setProfileData(prev => ({ ...prev, wearableConnected: true }));
      alert('✅ Wearable data sync enabled! This will help provide personalized care based on your health metrics.');
    } else {
      setProfileData(prev => ({ ...prev, wearableConnected: false }));
    }
  };
  
  const handleSave = () => {
    const updatedUser = {
      ...user,
      fullName: profileData.fullName,
      isProfessional: profileData.isProfessional,
      profile: {
        ...profileData,
        dateOfBirth: profileData.dateOfBirth,
        gender: profileData.gender,
        medicalLicense: profileData.medicalLicense,
        specialization: profileData.specialization,
        existingDiseases: profileData.existingDiseases,
        medications: profileData.medications,
        allergies: profileData.allergies,
        emergencyContact: profileData.emergencyContact,
        wearableConnected: profileData.wearableConnected
      }
    };
    
    localStorage.setItem('erprana_user', JSON.stringify(updatedUser));
    onUpdateUser(updatedUser);
    onClose();
  };
  
  return (
    <div className="profile-modal">
      <div className="profile-container">
        <div className="profile-header">
          <h2>👤 Your Profile</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="profile-content">
          {/* Basic Information */}
          <div className="profile-section">
            <h3>📝 Basic Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={profileData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label>Date of Birth</label>
                <input
                  type="date"
                  value={profileData.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label>Gender</label>
                <select
                  value={profileData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  className="form-input"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Emergency Contact</label>
                <input
                  type="tel"
                  value={profileData.emergencyContact}
                  onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                  className="form-input"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
          </div>
          
          {/* Medical Professional */}
          <div className="profile-section">
            <h3>👨‍⚕️ Medical Professional</h3>
            <div className="professional-toggle">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={profileData.isProfessional}
                  onChange={(e) => handleInputChange('isProfessional', e.target.checked)}
                />
                <span className="slider"></span>
              </label>
              <div className="toggle-info">
                <strong>I am a medical professional</strong>
                <p>Enable professional mode for advanced features and contribute to AI learning</p>
              </div>
            </div>
            
            {profileData.isProfessional && (
              <div className="professional-fields">
                <div className="form-group">
                  <label>Medical License Number</label>
                  <input
                    type="text"
                    value={profileData.medicalLicense}
                    onChange={(e) => handleInputChange('medicalLicense', e.target.value)}
                    className="form-input"
                    placeholder="License number"
                  />
                </div>
                
                <div className="form-group">
                  <label>Specialization</label>
                  <select
                    value={profileData.specialization}
                    onChange={(e) => handleInputChange('specialization', e.target.value)}
                    className="form-input"
                  >
                    <option value="">Select Specialization</option>
                    <option value="emergency">Emergency Medicine</option>
                    <option value="family">Family Medicine</option>
                    <option value="internal">Internal Medicine</option>
                    <option value="cardiology">Cardiology</option>
                    <option value="neurology">Neurology</option>
                    <option value="orthopedics">Orthopedics</option>
                    <option value="pediatrics">Pediatrics</option>
                    <option value="psychiatry">Psychiatry</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            )}
          </div>
          
          {/* Health Information */}
          <div className="profile-section">
            <h3>🏥 Health Information</h3>
            
            {/* Existing Diseases */}
            <div className="health-list">
              <label>Existing Medical Conditions</label>
              <div className="add-item">
                <input
                  type="text"
                  value={newDisease}
                  onChange={(e) => setNewDisease(e.target.value)}
                  placeholder="e.g., Diabetes, Hypertension"
                  className="form-input"
                />
                <button
                  type="button"
                  onClick={() => addItem('existingDiseases', newDisease, setNewDisease)}
                  className="add-btn"
                >
                  Add
                </button>
              </div>
              <div className="item-list">
                {profileData.existingDiseases.map((disease, index) => (
                  <div key={index} className="item-tag">
                    {disease}
                    <button onClick={() => removeItem('existingDiseases', index)}>×</button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Medications */}
            <div className="health-list">
              <label>Current Medications</label>
              <div className="add-item">
                <input
                  type="text"
                  value={newMedication}
                  onChange={(e) => setNewMedication(e.target.value)}
                  placeholder="e.g., Metformin 500mg"
                  className="form-input"
                />
                <button
                  type="button"
                  onClick={() => addItem('medications', newMedication, setNewMedication)}
                  className="add-btn"
                >
                  Add
                </button>
              </div>
              <div className="item-list">
                {profileData.medications.map((medication, index) => (
                  <div key={index} className="item-tag">
                    {medication}
                    <button onClick={() => removeItem('medications', index)}>×</button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Allergies */}
            <div className="health-list">
              <label>Allergies</label>
              <div className="add-item">
                <input
                  type="text"
                  value={newAllergy}
                  onChange={(e) => setNewAllergy(e.target.value)}
                  placeholder="e.g., Penicillin, Peanuts"
                  className="form-input"
                />
                <button
                  type="button"
                  onClick={() => addItem('allergies', newAllergy, setNewAllergy)}
                  className="add-btn"
                >
                  Add
                </button>
              </div>
              <div className="item-list">
                {profileData.allergies.map((allergy, index) => (
                  <div key={index} className="item-tag">
                    {allergy}
                    <button onClick={() => removeItem('allergies', index)}>×</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Wearable Integration */}
          <div className="profile-section">
            <h3>⌚ Wearable Devices</h3>
            <div className="wearable-permission">
              <div className="permission-info">
                <h4>🔗 Connect Your Wearable Devices</h4>
                <p>Linking your smartwatch, fitness tracker, or health monitor helps us provide personalized care by:</p>
                <ul>
                  <li>Monitoring your vital signs continuously</li>
                  <li>Detecting health pattern changes</li>
                  <li>Providing early health warnings</li>
                  <li>Customizing health recommendations</li>
                </ul>
              </div>
              
              <div className="permission-toggle">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={wearablePermission}
                    onChange={(e) => setWearablePermission(e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
                <div className="toggle-info">
                  <strong>Allow wearable data sync</strong>
                  <p>Your health data is encrypted and secure</p>
                </div>
              </div>
              
              {wearablePermission && (
                <button
                  className="connect-wearable-btn"
                  onClick={handleWearablePermission}
                >
                  🔗 Connect Wearable Device
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="profile-footer">
          <button className="save-btn" onClick={handleSave}>
            💾 Save Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;