import React, { useState, useEffect } from 'react';
import './HealthDashboard.css';

const HealthDashboard = ({ user }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportType, setReportType] = useState('weekly');
  const [generatingReport, setGeneratingReport] = useState(false);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/wearable-intelligence/health-dashboard/${user.id || user.email}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      } else {
        setError('Failed to load health dashboard');
      }
    } catch (err) {
      setError('Error loading dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateHealthReport = async () => {
    try {
      setGeneratingReport(true);
      const response = await fetch(`${BACKEND_URL}/api/wearable-intelligence/health-reports/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id || user.email,
          report_type: reportType,
          include_recommendations: true,
          include_trends: true
        }),
      });

      if (response.ok) {
        const reportData = await response.json();
        setSelectedReport(reportData);
        // Refresh dashboard data
        await fetchDashboardData();
      } else {
        setError('Failed to generate health report');
      }
    } catch (err) {
      setError('Error generating health report');
      console.error('Report generation error:', err);
    } finally {
      setGeneratingReport(false);
    }
  };

  const getHealthScoreColor = (score) => {
    if (score >= 80) return '#27ae60'; // Green
    if (score >= 60) return '#f39c12'; // Orange  
    return '#e74c3c'; // Red
  };

  const getTriageColor = (level) => {
    switch (level) {
      case 'RED': return '#e74c3c';
      case 'ORANGE': return '#f39c12';
      case 'YELLOW': return '#f1c40f';
      default: return '#27ae60';
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      default: return '➡️';
    }
  };

  if (loading) {
    return (
      <div className="health-dashboard">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your health dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="health-dashboard">
        <div className="error-message">
          <h3>⚠️ Dashboard Error</h3>
          <p>{error}</p>
          <button onClick={fetchDashboardData} className="retry-button">
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="health-dashboard">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>🏥 Health Intelligence Dashboard</h1>
          <p>Comprehensive health insights powered by medical AI</p>
        </div>
        
        <div className="overall-health-score">
          <div 
            className="health-score-circle"
            style={{ borderColor: getHealthScoreColor(dashboardData?.latest_health_score || 0) }}
          >
            <span className="score">{dashboardData?.latest_health_score || 0}</span>
            <span className="score-label">Health Score</span>
          </div>
        </div>
      </div>

      {/* Alert Bar */}
      {dashboardData?.recent_alerts && dashboardData.recent_alerts.length > 0 && (
        <div className="alert-bar">
          <h3>🚨 Recent Health Alerts</h3>
          <div className="alerts-grid">
            {dashboardData.recent_alerts.slice(0, 3).map((alert, index) => (
              <div 
                key={index}
                className="alert-card"
                style={{ borderLeftColor: getTriageColor(alert.level) }}
              >
                <div className="alert-header">
                  <span className="alert-level" style={{ color: getTriageColor(alert.level) }}>
                    {alert.level}
                  </span>
                  <span className="alert-time">
                    {new Date(alert.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <p className="alert-message">{alert.message}</p>
                <span className="alert-type">{alert.type.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Health Trends */}
      <div className="health-trends-section">
        <h3>📊 Health Trends</h3>
        <div className="trends-grid">
          {dashboardData?.health_trends?.map((trend, index) => (
            <div key={index} className="trend-card">
              <div className="trend-header">
                <span className="trend-icon">{getTrendIcon(trend.trend)}</span>
                <h4>{trend.metric.replace('_', ' ')}</h4>
              </div>
              <div className="trend-value">{trend.value}</div>
              <div className={`trend-status ${trend.trend}`}>
                {trend.trend}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Report Generation */}
      <div className="report-section">
        <div className="report-header">
          <h3>📋 Generate Health Report</h3>
          <div className="report-controls">
            <select 
              value={reportType} 
              onChange={(e) => setReportType(e.target.value)}
              className="report-type-select"
            >
              <option value="daily">Daily Report</option>
              <option value="weekly">Weekly Report</option>
              <option value="monthly">Monthly Report</option>
              <option value="quarterly">Quarterly Report</option>
              <option value="yearly">Yearly Report</option>
            </select>
            
            <button 
              onClick={generateHealthReport}
              disabled={generatingReport}
              className="generate-report-button"
            >
              {generatingReport ? '🔄 Generating...' : '📊 Generate Report'}
            </button>
          </div>
        </div>

        {dashboardData?.last_report_date && (
          <p className="last-report-info">
            Last report generated: {new Date(dashboardData.last_report_date).toLocaleString()}
          </p>
        )}
      </div>

      {/* Generated Report Display */}
      {selectedReport && (
        <div className="generated-report">
          <div className="report-header-display">
            <h3>📄 Generated {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Health Report</h3>
            <div className="report-meta">
              <span>Report ID: {selectedReport.report_id}</span>
              <span>Generated: {new Date(selectedReport.generated_at).toLocaleString()}</span>
            </div>
          </div>

          <div className="report-content">
            {/* Key Findings */}
            <div className="report-section-card">
              <h4>🔍 Key Findings</h4>
              <ul className="findings-list">
                {selectedReport.key_findings?.map((finding, index) => (
                  <li key={index}>{finding}</li>
                ))}
              </ul>
            </div>

            {/* Priority Recommendations */}
            {selectedReport.priority_recommendations && (
              <div className="report-section-card">
                <h4>⚡ Priority Recommendations</h4>
                <ul className="recommendations-list">
                  {selectedReport.priority_recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Health Trends */}
            {selectedReport.health_trends && (
              <div className="report-section-card">
                <h4>📈 Health Trends Analysis</h4>
                <div className="trends-analysis">
                  {selectedReport.health_trends.map((trend, index) => (
                    <div key={index} className="trend-analysis-item">
                      <div className="trend-metric">{trend.metric.replace('_', ' ')}</div>
                      <div className="trend-change">
                        <span className={`change-value ${trend.change_percentage > 0 ? 'positive' : 'negative'}`}>
                          {trend.change_percentage > 0 ? '+' : ''}{trend.change_percentage.toFixed(1)}%
                        </span>
                        <span className={`trend-direction ${trend.trend_direction}`}>
                          {trend.trend_direction}
                        </span>
                      </div>
                      <p className="trend-significance">{trend.medical_significance}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Triage Alerts */}
            {selectedReport.triage_alerts && selectedReport.triage_alerts.length > 0 && (
              <div className="report-section-card triage-alerts">
                <h4>🚨 Medical Attention Needed</h4>
                {selectedReport.triage_alerts.map((alert, index) => (
                  <div 
                    key={index}
                    className="triage-alert"
                    style={{ borderLeftColor: getTriageColor(alert.level) }}
                  >
                    <div className="alert-priority">
                      <span 
                        className="priority-badge"
                        style={{ backgroundColor: getTriageColor(alert.level) }}
                      >
                        {alert.level}
                      </span>
                      <h5>{alert.alert}</h5>
                    </div>
                    {alert.recommendations && (
                      <div className="alert-recommendations">
                        <strong>Recommended Actions:</strong>
                        <ul>
                          {alert.recommendations.map((rec, i) => (
                            <li key={i}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="recommendations-section">
        <div className="recommendations-grid">
          <div className="recommendation-card immediate">
            <h4>⚡ Immediate Actions</h4>
            <ul>
              {dashboardData?.recommendations?.immediate?.map((rec, index) => (
                <li key={index}>{rec}</li>
              )) || <li>No immediate actions needed</li>}
            </ul>
          </div>

          <div className="recommendation-card preventive">
            <h4>🛡️ Preventive Care</h4>
            <ul>
              {dashboardData?.recommendations?.preventive?.map((rec, index) => (
                <li key={index}>{rec}</li>
              )) || <li>Continue current healthy practices</li>}
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="dashboard-footer">
        <p>
          Dashboard updated: {new Date(dashboardData?.dashboard_generated_at || Date.now()).toLocaleString()}
        </p>
        <button onClick={fetchDashboardData} className="refresh-button">
          🔄 Refresh Data
        </button>
      </div>
    </div>
  );
};

export default HealthDashboard;