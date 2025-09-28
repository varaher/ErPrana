import React, { useState, useEffect } from 'react';
import './ProfessionalDashboard.css';

const ProfessionalDashboard = ({ userId }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [professionalProfile, setProfessionalProfile] = useState(null);
    const [dashboardData, setDashboardData] = useState(null);
    const [patients, setPatients] = useState([]);
    const [assessments, setAssessments] = useState([]);
    const [teachingCases, setTeachingCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [currentModal, setCurrentModal] = useState(null);
    const [formData, setFormData] = useState({});

    const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

    useEffect(() => {
        loadProfessionalData();
    }, [userId]);

    const loadProfessionalData = async () => {
        setLoading(true);
        try {
            // Load professional profile
            const profileResponse = await fetch(`${BACKEND_URL}/api/professional/profile/${userId}`);
            if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                setProfessionalProfile(profileData.profile);
                
                // Load dashboard data if profile exists
                if (profileData.profile) {
                    await loadDashboardData(profileData.profile.professional_id);
                }
            }
        } catch (error) {
            console.error('Error loading professional data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadDashboardData = async (professionalId) => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/professional/dashboard/${professionalId}`);
            if (response.ok) {
                const data = await response.json();
                setDashboardData(data);
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    };

    const loadPatients = async () => {
        if (!professionalProfile) return;
        
        try {
            const response = await fetch(`${BACKEND_URL}/api/professional/patients/${professionalProfile.professional_id}`);
            if (response.ok) {
                const data = await response.json();
                setPatients(data.patients || []);
            }
        } catch (error) {
            console.error('Error loading patients:', error);
        }
    };

    const loadAssessments = async () => {
        if (!professionalProfile) return;
        
        try {
            const response = await fetch(`${BACKEND_URL}/api/professional/assessments/${professionalProfile.professional_id}`);
            if (response.ok) {
                const data = await response.json();
                setAssessments(data.assessments || []);
            }
        } catch (error) {
            console.error('Error loading assessments:', error);
        }
    };

    const loadTeachingCases = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/professional/teaching-cases`);
            if (response.ok) {
                const data = await response.json();
                setTeachingCases(data.cases || []);
            }
        } catch (error) {
            console.error('Error loading teaching cases:', error);
        }
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        
        // Load data for specific tabs
        if (tab === 'patients' && patients.length === 0) {
            loadPatients();
        } else if (tab === 'assessments' && assessments.length === 0) {
            loadAssessments();
        } else if (tab === 'cases' && teachingCases.length === 0) {
            loadTeachingCases();
        }
    };

    const openModal = (modalType, data = {}) => {
        setCurrentModal(modalType);
        setFormData(data);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setCurrentModal(null);
        setFormData({});
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        
        try {
            let endpoint = '';
            let method = 'POST';
            let payload = { ...formData };
            
            switch (currentModal) {
                case 'register':
                    endpoint = '/api/professional/register';
                    payload.user_id = userId;
                    break;
                case 'patient':
                    endpoint = '/api/professional/patients';
                    payload.professional_id = professionalProfile.professional_id;
                    payload.patient_id = payload.patient_id || `patient_${Date.now()}`;
                    break;
                case 'assessment':
                    endpoint = '/api/professional/assessment';
                    payload.professional_id = professionalProfile.professional_id;
                    payload.assessment_id = `assessment_${Date.now()}`;
                    break;
                case 'case':
                    endpoint = '/api/professional/teaching-case';
                    payload.professional_id = professionalProfile.professional_id;
                    payload.case_id = `case_${Date.now()}`;
                    break;
                default:
                    return;
            }
            
            const response = await fetch(`${BACKEND_URL}${endpoint}`, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });
            
            if (response.ok) {
                alert('Successfully saved!');
                closeModal();
                
                // Reload relevant data
                if (currentModal === 'register') {
                    loadProfessionalData();
                } else if (currentModal === 'patient') {
                    loadPatients();
                    loadDashboardData(professionalProfile.professional_id);
                } else if (currentModal === 'assessment') {
                    loadAssessments();
                    loadDashboardData(professionalProfile.professional_id);
                } else if (currentModal === 'case') {
                    loadTeachingCases();
                }
            } else {
                alert('Failed to save. Please try again.');
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('An error occurred. Please try again.');
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    if (loading) {
        return (
            <div className="professional-dashboard loading">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading professional dashboard...</p>
                </div>
            </div>
        );
    }

    if (!professionalProfile) {
        return (
            <div className="professional-dashboard">
                <div className="registration-prompt">
                    <h2>🏥 Health Care Professional Registration</h2>
                    <p>Register as a health care professional to access advanced features:</p>
                    <ul>
                        <li>Patient record management</li>
                        <li>Clinical assessments</li>
                        <li>Teaching case library</li>
                        <li>Professional dashboard</li>
                    </ul>
                    <button 
                        className="register-btn"
                        onClick={() => openModal('register')}
                    >
                        Register as Health Care Professional
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="professional-dashboard">
            <div className="dashboard-header">
                <h1>🏥 Health Care Professional Dashboard</h1>
                <div className="professional-info">
                    <span className="specialty">{professionalProfile.specialty}</span>
                    <span className="institution">{professionalProfile.institution}</span>
                    <span className={`verification ${professionalProfile.verified ? 'verified' : 'pending'}`}>
                        {professionalProfile.verified ? '✅ Verified' : '⏸️ Pending Verification'}
                    </span>
                </div>
            </div>

            <div className="dashboard-tabs">
                <button 
                    className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
                    onClick={() => handleTabChange('dashboard')}
                >
                    📊 Dashboard
                </button>
                <button 
                    className={`tab ${activeTab === 'patients' ? 'active' : ''}`}
                    onClick={() => handleTabChange('patients')}
                >
                    👥 Patients
                </button>
                <button 
                    className={`tab ${activeTab === 'assessments' ? 'active' : ''}`}
                    onClick={() => handleTabChange('assessments')}
                >
                    📋 Assessments
                </button>
                <button 
                    className={`tab ${activeTab === 'cases' ? 'active' : ''}`}
                    onClick={() => handleTabChange('cases')}
                >
                    📚 Teaching Cases
                </button>
            </div>

            <div className="tab-content">
                {activeTab === 'dashboard' && (
                    <div className="dashboard-overview">
                        {dashboardData && (
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <h3>{dashboardData.statistics.total_patients}</h3>
                                    <p>Total Patients</p>
                                </div>
                                <div className="stat-card">
                                    <h3>{dashboardData.statistics.total_assessments}</h3>
                                    <p>Clinical Assessments</p>
                                </div>
                                <div className="stat-card">
                                    <h3>{dashboardData.statistics.total_teaching_cases}</h3>
                                    <p>Teaching Cases</p>
                                </div>
                            </div>
                        )}
                        
                        <div className="recent-activity">
                            <h3>Recent Activity</h3>
                            {dashboardData?.recent_patients && (
                                <div className="activity-section">
                                    <h4>Recent Patients</h4>
                                    {dashboardData.recent_patients.map(patient => (
                                        <div key={patient.patient_id} className="activity-item">
                                            <span>{patient.patient_name}</span>
                                            <span className="activity-date">
                                                {new Date(patient.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'patients' && (
                    <div className="patients-section">
                        <div className="section-header">
                            <h3>Patient Records</h3>
                            <button 
                                className="add-btn"
                                onClick={() => openModal('patient')}
                            >
                                + Add Patient
                            </button>
                        </div>
                        
                        <div className="patients-grid">
                            {patients.map(patient => (
                                <div key={patient.patient_id} className="patient-card">
                                    <h4>{patient.patient_name}</h4>
                                    <p>Age: {patient.patient_age} | Gender: {patient.patient_gender}</p>
                                    <p><strong>Chief Complaint:</strong> {patient.chief_complaint}</p>
                                    <p><strong>Assessment:</strong> {patient.assessment}</p>
                                    <div className="patient-actions">
                                        <button className="view-btn">View Details</button>
                                        <button className="edit-btn">Edit</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'assessments' && (
                    <div className="assessments-section">
                        <div className="section-header">
                            <h3>Clinical Assessments</h3>
                            <button 
                                className="add-btn"
                                onClick={() => openModal('assessment')}
                            >
                                + New Assessment
                            </button>
                        </div>
                        
                        <div className="assessments-list">
                            {assessments.map(assessment => (
                                <div key={assessment.assessment_id} className="assessment-card">
                                    <div className="assessment-header">
                                        <h4>Patient ID: {assessment.patient_id}</h4>
                                        <span className={`urgency ${assessment.urgency_level}`}>
                                            {assessment.urgency_level.toUpperCase()}
                                        </span>
                                    </div>
                                    <p><strong>Symptoms:</strong> {assessment.symptoms.join(', ')}</p>
                                    <p><strong>Differential Diagnosis:</strong> {assessment.differential_diagnosis.join(', ')}</p>
                                    <p><strong>Treatment Plan:</strong> {assessment.treatment_plan}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'cases' && (
                    <div className="cases-section">
                        <div className="section-header">
                            <h3>Teaching Cases</h3>
                            <button 
                                className="add-btn"
                                onClick={() => openModal('case')}
                            >
                                + Create Case
                            </button>
                        </div>
                        
                        <div className="cases-grid">
                            {teachingCases.map(teachingCase => (
                                <div key={teachingCase.case_id} className="case-card">
                                    <h4>{teachingCase.title}</h4>
                                    <p className="specialty">{teachingCase.specialty}</p>
                                    <p>{teachingCase.case_description}</p>
                                    <div className="case-actions">
                                        <button className="view-btn">View Full Case</button>
                                        <button className="edit-btn">Edit</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>
                                {currentModal === 'register' && 'Register as Health Care Professional'}
                                {currentModal === 'patient' && 'Add New Patient'}
                                {currentModal === 'assessment' && 'Create Clinical Assessment'}
                                {currentModal === 'case' && 'Create Teaching Case'}
                            </h3>
                            <button className="close-btn" onClick={closeModal}>×</button>
                        </div>
                        
                        <form onSubmit={handleFormSubmit} className="modal-form">
                            {currentModal === 'register' && (
                                <>
                                    <input
                                        type="text"
                                        placeholder="License Number"
                                        value={formData.license_number || ''}
                                        onChange={e => handleInputChange('license_number', e.target.value)}
                                        required
                                    />
                                    <input
                                        type="text"
                                        placeholder="Specialty"
                                        value={formData.specialty || ''}
                                        onChange={e => handleInputChange('specialty', e.target.value)}
                                        required
                                    />
                                    <input
                                        type="text"
                                        placeholder="Institution"
                                        value={formData.institution || ''}
                                        onChange={e => handleInputChange('institution', e.target.value)}
                                        required
                                    />
                                </>
                            )}
                            
                            {currentModal === 'patient' && (
                                <>
                                    <input
                                        type="text"
                                        placeholder="Patient Name"
                                        value={formData.patient_name || ''}
                                        onChange={e => handleInputChange('patient_name', e.target.value)}
                                        required
                                    />
                                    <input
                                        type="number"
                                        placeholder="Age"
                                        value={formData.patient_age || ''}
                                        onChange={e => handleInputChange('patient_age', parseInt(e.target.value))}
                                        required
                                    />
                                    <select
                                        value={formData.patient_gender || ''}
                                        onChange={e => handleInputChange('patient_gender', e.target.value)}
                                        required
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                    <textarea
                                        placeholder="Chief Complaint"
                                        value={formData.chief_complaint || ''}
                                        onChange={e => handleInputChange('chief_complaint', e.target.value)}
                                        required
                                    />
                                    <textarea
                                        placeholder="Assessment"
                                        value={formData.assessment || ''}
                                        onChange={e => handleInputChange('assessment', e.target.value)}
                                        required
                                    />
                                    <textarea
                                        placeholder="Plan"
                                        value={formData.plan || ''}
                                        onChange={e => handleInputChange('plan', e.target.value)}
                                        required
                                    />
                                </>
                            )}
                            
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={closeModal}>
                                    Cancel
                                </button>
                                <button type="submit" className="submit-btn">
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfessionalDashboard;