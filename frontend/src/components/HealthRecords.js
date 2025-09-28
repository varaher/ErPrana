import React, { useState, useEffect } from 'react';
import './HealthRecords.css';

const HealthRecords = ({ onClose, userId }) => {
  const [activeTab, setActiveTab] = useState('timeline');
  const [healthRecords, setHealthRecords] = useState([]);
  const [vitalsHistory, setVitalsHistory] = useState([]);
  const [medicalDocuments, setMedicalDocuments] = useState([]);
  const [medications, setMedications] = useState([]);
  const [todayReminders, setTodayReminders] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [timeFilter, setTimeFilter] = useState('all'); // all, 1m, 3m, 6m, 1y
  const [showMedicationModal, setShowMedicationModal] = useState(false);
  const [medicationForm, setMedicationForm] = useState({
    name: '',
    dosage: '',
    frequency: 'daily',
    times: ['08:00'],
    instructions: '',
    prescribing_doctor: ''
  });

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
  
  useEffect(() => {
    loadHealthData();
  }, []);
  
  const loadHealthData = () => {
    // Simulate loading health records
    const records = [
      {
        id: 1,
        date: new Date('2024-09-15'),
        type: 'checkup',
        title: 'Annual Physical Exam',
        doctor: 'Dr. Sarah Johnson',
        facility: 'City Medical Center',
        summary: 'Routine annual physical examination. All vital signs normal.',
        details: {
          bloodPressure: '118/76 mmHg',
          heartRate: '72 bpm',
          weight: '154 lbs',
          height: '5\'8"',
          bmi: '23.4',
          notes: 'Patient in good health. Continue regular exercise routine.'
        },
        status: 'completed'
      },
      {
        id: 2,
        date: new Date('2024-09-01'),
        type: 'symptom',
        title: 'Headache Consultation',
        doctor: 'Dr. Michael Chen',
        facility: 'Urgent Care Plus',
        summary: 'Patient reported persistent headaches for 3 days. Diagnosed as tension headache.',
        details: {
          symptoms: ['Headache', 'Mild nausea', 'Light sensitivity'],
          diagnosis: 'Tension headache',
          treatment: 'Rest, hydration, OTC pain relievers',
          followUp: 'Return if symptoms persist beyond 7 days'
        },
        status: 'completed'
      },
      {
        id: 3,
        date: new Date('2024-08-20'),
        type: 'lab',
        title: 'Blood Work - Comprehensive Panel',
        doctor: 'Dr. Sarah Johnson',
        facility: 'City Medical Center Lab',
        summary: 'Comprehensive metabolic panel and CBC. All results within normal ranges.',
        details: {
          glucose: '92 mg/dL (Normal)',
          cholesterol: '185 mg/dL (Normal)',
          hdl: '58 mg/dL (Good)',
          ldl: '112 mg/dL (Normal)',
          triglycerides: '98 mg/dL (Normal)',
          hemoglobin: '14.2 g/dL (Normal)'
        },
        status: 'completed'
      },
      {
        id: 4,
        date: new Date('2024-08-05'),
        type: 'prescription',
        title: 'Prescription Refill',
        doctor: 'Dr. Emily Rodriguez',
        facility: 'Family Health Clinic',
        summary: 'Vitamin D3 supplement prescription refilled.',
        details: {
          medication: 'Vitamin D3 2000 IU',
          dosage: 'Once daily with food',
          quantity: '90 tablets',
          refills: '2 remaining'
        },
        status: 'active'
      },
      {
        id: 5,
        date: new Date('2024-07-10'),
        type: 'imaging',
        title: 'Chest X-Ray',
        doctor: 'Dr. Robert Kim',
        facility: 'Regional Imaging Center',
        summary: 'Routine chest X-ray for annual physical. Clear lungs, normal heart size.',
        details: {
          study: 'Chest X-Ray (PA and Lateral)',
          findings: 'No acute findings. Heart size normal. Lungs clear.',
          impression: 'Normal chest X-ray'
        },
        status: 'completed'
      }
    ];
    
    setHealthRecords(records);
    
    // Simulate vitals history
    const vitals = [];
    const now = new Date();
    for (let i = 30; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      vitals.push({
        date,
        heartRate: 65 + Math.random() * 20,
        systolic: 115 + Math.random() * 15,
        diastolic: 75 + Math.random() * 10,
        weight: 154 + (Math.random() - 0.5) * 4,
        steps: 8000 + Math.random() * 4000,
        sleep: 6.5 + Math.random() * 2
      });
    }
    setVitalsHistory(vitals);
    
    // Simulate medical documents
    const documents = [
      {
        id: 1,
        name: 'Annual Physical Report 2024',
        type: 'Report',
        date: new Date('2024-09-15'),
        size: '2.4 MB',
        doctor: 'Dr. Sarah Johnson'
      },
      {
        id: 2,
        name: 'Blood Work Results',
        type: 'Lab Results',
        date: new Date('2024-08-20'),
        size: '856 KB',
        doctor: 'Dr. Sarah Johnson'
      },
      {
        id: 3,
        name: 'Chest X-Ray Images',
        type: 'Imaging',
        date: new Date('2024-07-10'),
        size: '12.3 MB',
        doctor: 'Dr. Robert Kim'
      },
      {
        id: 4,
        name: 'Prescription History',
        type: 'Prescription',
        date: new Date('2024-08-05'),
        size: '124 KB',
        doctor: 'Dr. Emily Rodriguez'
      }
    ];
    setMedicalDocuments(documents);
  };
  
  const getRecordIcon = (type) => {
    switch (type) {
      case 'checkup': return '🏥';
      case 'symptom': return '🩺';
      case 'lab': return '🧪';
      case 'prescription': return '💊';
      case 'imaging': return '📊';
      default: return '📋';
    }
  };
  
  const getRecordColor = (type) => {
    switch (type) {
      case 'checkup': return '#3498db';
      case 'symptom': return '#e74c3c';
      case 'lab': return '#9b59b6';
      case 'prescription': return '#2ecc71';
      case 'imaging': return '#f39c12';
      default: return '#7f8c8d';
    }
  };
  
  const filteredRecords = healthRecords.filter(record => {
    if (timeFilter === 'all') return true;
    
    const now = new Date();
    const recordDate = new Date(record.date);
    const diffTime = now - recordDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    switch (timeFilter) {
      case '1m': return diffDays <= 30;
      case '3m': return diffDays <= 90;
      case '6m': return diffDays <= 180;
      case '1y': return diffDays <= 365;
      default: return true;
    }
  });
  
  const generateHealthSummary = () => {
    const recentRecords = healthRecords.slice(0, 3);
    const avgHeartRate = vitalsHistory.reduce((sum, v) => sum + v.heartRate, 0) / vitalsHistory.length;
    const avgSteps = vitalsHistory.reduce((sum, v) => sum + v.steps, 0) / vitalsHistory.length;
    
    return {
      totalRecords: healthRecords.length,
      recentVisits: recentRecords.length,
      avgHeartRate: Math.round(avgHeartRate),
      avgSteps: Math.round(avgSteps),
      lastCheckup: healthRecords.find(r => r.type === 'checkup')?.date || null
    };
  };
  
  const summary = generateHealthSummary();
  
  const exportHealthData = () => {
    const dataStr = JSON.stringify({
      records: healthRecords,
      vitals: vitalsHistory,
      documents: medicalDocuments,
      exportDate: new Date(),
      patientInfo: {
        name: 'Patient Name',
        dob: '1990-01-01',
        id: 'P123456'
      }
    }, null, 2);
    
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `health-records-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="health-records-modal">
      <div className="health-records-container">
        <div className="health-records-header">
          <h2>📋 Health Records</h2>
          <div className="header-actions">
            <button className="export-btn" onClick={exportHealthData}>
              📤 Export
            </button>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
        </div>
        
        <div className="health-summary">
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-value">{summary.totalRecords}</span>
              <span className="summary-label">Total Records</span>
            </div>
            <div className="summary-item">
              <span className="summary-value">{summary.recentVisits}</span>
              <span className="summary-label">Recent Visits</span>
            </div>
            <div className="summary-item">
              <span className="summary-value">{summary.avgHeartRate}</span>
              <span className="summary-label">Avg Heart Rate</span>
            </div>
            <div className="summary-item">
              <span className="summary-value">{summary.avgSteps.toLocaleString()}</span>
              <span className="summary-label">Avg Daily Steps</span>
            </div>
          </div>
        </div>
        
        <div className="records-tabs">
          <button
            className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('timeline')}
          >
            📅 Timeline
          </button>
          <button
            className={`tab-btn ${activeTab === 'vitals' ? 'active' : ''}`}
            onClick={() => setActiveTab('vitals')}
          >
            📊 Vitals History
          </button>
          <button
            className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`}
            onClick={() => setActiveTab('documents')}
          >
            📄 Documents
          </button>
        </div>
        
        <div className="records-content">
          {activeTab === 'timeline' && (
            <div className="timeline-view">
              <div className="timeline-filters">
                {['all', '1m', '3m', '6m', '1y'].map(filter => (
                  <button
                    key={filter}
                    className={`filter-btn ${timeFilter === filter ? 'active' : ''}`}
                    onClick={() => setTimeFilter(filter)}
                  >
                    {filter === 'all' ? 'All' : filter.toUpperCase()}
                  </button>
                ))}
              </div>
              
              <div className="timeline">
                {filteredRecords.map((record, index) => (
                  <div key={record.id} className="timeline-item">
                    <div className="timeline-marker" style={{ backgroundColor: getRecordColor(record.type) }}>
                      {getRecordIcon(record.type)}
                    </div>
                    <div className="timeline-content">
                      <div className="record-header">
                        <h4>{record.title}</h4>
                        <span className="record-date">
                          {record.date.toLocaleDateString()}
                        </span>
                      </div>
                      <div className="record-meta">
                        <span className="doctor">{record.doctor}</span>
                        <span className="facility">{record.facility}</span>
                      </div>
                      <p className="record-summary">{record.summary}</p>
                      <button
                        className="view-details-btn"
                        onClick={() => setSelectedRecord(record)}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {activeTab === 'vitals' && (
            <div className="vitals-history">
              <div className="vitals-charts">
                <div className="chart-container">
                  <h4>Heart Rate Trend (30 days)</h4>
                  <div className="simple-chart">
                    {vitalsHistory.slice(-7).map((vital, index) => (
                      <div key={index} className="chart-bar">
                        <div
                          className="bar"
                          style={{
                            height: `${(vital.heartRate / 100) * 100}%`,
                            backgroundColor: '#e74c3c'
                          }}
                        ></div>
                        <span className="bar-label">
                          {vital.date.getDate()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="chart-container">
                  <h4>Blood Pressure Trend (30 days)</h4>
                  <div className="simple-chart">
                    {vitalsHistory.slice(-7).map((vital, index) => (
                      <div key={index} className="chart-bar">
                        <div
                          className="bar systolic"
                          style={{
                            height: `${(vital.systolic / 140) * 100}%`,
                            backgroundColor: '#3498db'
                          }}
                        ></div>
                        <div
                          className="bar diastolic"
                          style={{
                            height: `${(vital.diastolic / 90) * 100}%`,
                            backgroundColor: '#2ecc71'
                          }}
                        ></div>
                        <span className="bar-label">
                          {vital.date.getDate()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'documents' && (
            <div className="documents-view">
              <div className="documents-grid">
                {medicalDocuments.map(doc => (
                  <div key={doc.id} className="document-card">
                    <div className="document-icon">📄</div>
                    <div className="document-info">
                      <h4>{doc.name}</h4>
                      <div className="document-meta">
                        <span className="doc-type">{doc.type}</span>
                        <span className="doc-date">{doc.date.toLocaleDateString()}</span>
                      </div>
                      <div className="document-details">
                        <span className="doc-size">{doc.size}</span>
                        <span className="doc-doctor">{doc.doctor}</span>
                      </div>
                    </div>
                    <div className="document-actions">
                      <button className="view-btn">👁️ View</button>
                      <button className="download-btn">⬇️ Download</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {selectedRecord && (
          <div className="record-detail-modal">
            <div className="record-detail-content">
              <div className="detail-header">
                <h3>{selectedRecord.title}</h3>
                <button
                  className="close-detail-btn"
                  onClick={() => setSelectedRecord(null)}
                >
                  ×
                </button>
              </div>
              
              <div className="detail-body">
                <div className="detail-meta">
                  <div className="meta-item">
                    <strong>Date:</strong> {selectedRecord.date.toLocaleDateString()}
                  </div>
                  <div className="meta-item">
                    <strong>Doctor:</strong> {selectedRecord.doctor}
                  </div>
                  <div className="meta-item">
                    <strong>Facility:</strong> {selectedRecord.facility}
                  </div>
                  <div className="meta-item">
                    <strong>Status:</strong> 
                    <span className={`status ${selectedRecord.status}`}>
                      {selectedRecord.status}
                    </span>
                  </div>
                </div>
                
                <div className="detail-summary">
                  <h4>Summary</h4>
                  <p>{selectedRecord.summary}</p>
                </div>
                
                <div className="detail-details">
                  <h4>Details</h4>
                  <div className="details-grid">
                    {Object.entries(selectedRecord.details).map(([key, value]) => (
                      <div key={key} className="detail-item">
                        <strong>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</strong>
                        {Array.isArray(value) ? (
                          <ul>
                            {value.map((item, index) => (
                              <li key={index}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          <span>{value}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HealthRecords;