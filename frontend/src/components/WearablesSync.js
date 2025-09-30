import React, { useState, useEffect } from 'react';
import './WearablesSync.css';

const WearablesSync = ({ userId }) => {
    const [devices, setDevices] = useState([]);
    const [permissions, setPermissions] = useState({});
    const [loading, setLoading] = useState(false);
    const [permissionRequests, setPermissionRequests] = useState([]);
    const [syncData, setSyncData] = useState({});
    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [realTimeAnalysis, setRealTimeAnalysis] = useState({});
    const [healthAlerts, setHealthAlerts] = useState([]);

    const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

    useEffect(() => {
        loadUserDevices();
        loadUserPermissions();
        // Poll for real-time health analysis
        const analysisInterval = setInterval(fetchRealTimeAnalysis, 30000); // Every 30 seconds
        return () => clearInterval(analysisInterval);
    }, [userId]);

    const loadUserDevices = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/wearables/devices/${userId}`);
            const data = await response.json();
            setDevices(data.devices || []);
        } catch (error) {
            console.error('Error loading devices:', error);
        }
    };

    const loadUserPermissions = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/wearables/permissions/${userId}`);
            const data = await response.json();
            setPermissions(data.permissions || {});
        } catch (error) {
            console.error('Error loading permissions:', error);
        }
    };

    const fetchRealTimeAnalysis = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/wearable-intelligence/health-insights/${userId}?days=1`);
            if (response.ok) {
                const data = await response.json();
                setRealTimeAnalysis(data);
                
                // Filter urgent alerts
                const urgentAlerts = data.triage_alerts?.filter(alert => 
                    alert.level === 'RED' || alert.level === 'ORANGE'
                ) || [];
                setHealthAlerts(urgentAlerts);
            }
        } catch (error) {
            console.error('Error fetching real-time analysis:', error);
        }
    };

    const submitWearableData = async (dataType, data) => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/wearable-intelligence/wearable-data/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userId,
                    data_type: dataType,
                    data: data,
                    timestamp: new Date().toISOString()
                })
            });

            if (response.ok) {
                const result = await response.json();
                
                // Handle real-time analysis results
                if (result.real_time_analysis) {
                    setRealTimeAnalysis(prev => ({
                        ...prev,
                        [dataType]: result.real_time_analysis
                    }));
                    
                    // Show immediate recommendations if available
                    if (result.immediate_recommendations?.length > 0) {
                        showHealthRecommendations(dataType, result.immediate_recommendations);
                    }
                    
                    // Handle triage alerts
                    if (result.triage_level === 'RED' || result.triage_level === 'ORANGE') {
                        showTriageAlert(dataType, result.triage_level, result.real_time_analysis);
                    }
                }
                
                return result;
            }
        } catch (error) {
            console.error('Error submitting wearable data:', error);
        }
        return null;
    };

    const showHealthRecommendations = (dataType, recommendations) => {
        const message = `📊 Health Analysis for ${dataType.replace('_', ' ')}:\n\n${recommendations.slice(0, 3).join('\n')}`;
        
        // Create a toast notification
        const toast = document.createElement('div');
        toast.className = 'health-recommendation-toast';
        toast.innerHTML = `
            <div class="toast-header">
                <strong>💡 Health Insight</strong>
                <button onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
            <div class="toast-body">${message}</div>
        `;
        
        document.body.appendChild(toast);
        setTimeout(() => {
            if (toast.parentElement) toast.remove();
        }, 10000);
    };

    const showTriageAlert = (dataType, level, analysis) => {
        const urgencyText = level === 'RED' ? 'IMMEDIATE ATTENTION NEEDED' : 'URGENT ATTENTION NEEDED';
        const findings = analysis.findings || ['Health pattern detected that needs attention'];
        
        const alert = {
            id: Date.now(),
            level,
            dataType,
            message: findings[0],
            timestamp: new Date().toISOString(),
            recommendations: analysis.recommendations || []
        };
        
        setHealthAlerts(prev => [alert, ...prev.slice(0, 4)]); // Keep last 5 alerts
        
        // Show modal for critical alerts
        if (level === 'RED') {
            showCriticalAlertModal(alert);
        }
    };

    const showCriticalAlertModal = (alert) => {
        const modal = document.createElement('div');
        modal.className = 'critical-alert-modal';
        modal.innerHTML = `
            <div class="modal-content critical">
                <div class="alert-header">
                    <h3>🚨 CRITICAL HEALTH ALERT</h3>
                </div>
                <div class="alert-body">
                    <p><strong>Finding:</strong> ${alert.message}</p>
                    <div class="recommendations">
                        <strong>Immediate Actions:</strong>
                        <ul>
                            ${alert.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                            <li><strong>Consider seeking immediate medical attention</strong></li>
                        </ul>
                    </div>
                </div>
                <div class="alert-actions">
                    <button onclick="this.closest('.critical-alert-modal').remove()" class="dismiss-btn">
                        I Understand
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    };

    const requestPermission = async (deviceType, requestedPermissions) => {
        setLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/api/wearables/request-permission`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userId,
                    device_type: deviceType,
                    requested_permissions: requestedPermissions
                })
            });
            
            const result = await response.json();
            
            if (result.status === 'pending') {
                alert('Permission request sent! Please check your device to authorize data sharing.');
                // Simulate user granting permission after a delay
                setTimeout(() => {
                    simulatePermissionGrant(deviceType, requestedPermissions);
                }, 3000);
            }
        } catch (error) {
            console.error('Error requesting permission:', error);
            alert('Failed to request permission. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const simulatePermissionGrant = async (deviceType, requestedPermissions) => {
        try {
            const deviceId = `${deviceType}_${Date.now()}`;
            const permissionData = {
                user_id: userId,
                device_id: deviceId,
                permissions: requestedPermissions.reduce((acc, perm) => {
                    acc[perm] = true;
                    return acc;
                }, {}),
                granted_at: new Date().toISOString()
            };

            await fetch(`${BACKEND_URL}/api/wearables/grant-permission`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(permissionData)
            });

            // Connect the device
            await fetch(`${BACKEND_URL}/api/wearables/connect-device`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    device_id: deviceId,
                    device_name: `${deviceType} Device`,
                    manufacturer: deviceType.charAt(0).toUpperCase() + deviceType.slice(1),
                    device_type: deviceType,
                    connected: true,
                    permissions_granted: true
                })
            });

            loadUserDevices();
            loadUserPermissions();
            alert('Device connected successfully!');
        } catch (error) {
            console.error('Error granting permission:', error);
        }
    };

    const syncDeviceData = async (deviceId) => {
        setLoading(true);
        try {
            // Generate sample wearable data
            const sampleData = generateSampleWearableData(deviceId);
            
            const response = await fetch(`${BACKEND_URL}/api/wearables/sync-data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(sampleData)
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                setSyncData(prev => ({
                    ...prev,
                    [deviceId]: {
                        lastSync: new Date().toLocaleString(),
                        recordCount: result.synced_count
                    }
                }));
                alert(`Synced ${result.synced_count} records successfully!`);
            }
        } catch (error) {
            console.error('Error syncing data:', error);
            alert('Failed to sync data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const generateSampleWearableData = (deviceId) => {
        const now = new Date();
        const data = [];
        
        // Generate heart rate data
        for (let i = 0; i < 24; i++) {
            const timestamp = new Date(now.getTime() - (i * 60 * 60 * 1000));
            data.push({
                user_id: userId,
                device_id: deviceId,
                data_type: 'heart_rate',
                value: (70 + Math.random() * 30).toFixed(0),
                unit: 'bpm',
                timestamp: timestamp.toISOString(),
                sync_id: `sync_${Date.now()}_${i}`
            });
        }
        
        // Generate steps data
        data.push({
            user_id: userId,
            device_id: deviceId,
            data_type: 'steps',
            value: Math.floor(Math.random() * 10000).toString(),
            unit: 'steps',
            timestamp: now.toISOString(),
            sync_id: `sync_steps_${Date.now()}`
        });
        
        return data;
    };

    const disconnectDevice = async (deviceId) => {
        if (window.confirm('Are you sure you want to disconnect this device?')) {
            try {
                await fetch(`${BACKEND_URL}/api/wearables/disconnect/${deviceId}`, {
                    method: 'DELETE'
                });
                loadUserDevices();
                alert('Device disconnected successfully.');
            } catch (error) {
                console.error('Error disconnecting device:', error);
                alert('Failed to disconnect device.');
            }
        }
    };

    const availableDeviceTypes = [
        { id: 'fitbit', name: 'Fitbit', permissions: ['heart_rate', 'steps', 'sleep', 'activity'] },
        { id: 'apple_watch', name: 'Apple Watch', permissions: ['heart_rate', 'steps', 'workout', 'ecg'] },
        { id: 'garmin', name: 'Garmin', permissions: ['heart_rate', 'steps', 'gps', 'vo2_max'] },
        { id: 'samsung_health', name: 'Samsung Health', permissions: ['heart_rate', 'steps', 'sleep', 'stress'] }
    ];

    return (
        <div className="wearables-sync">
            <div className="wearables-header">
                <h2>🏃‍♂️ Wearables & Health Data</h2>
                <p>Connect your fitness devices to sync health data with ARYA</p>
            </div>

            <div className="connected-devices">
                <h3>Connected Devices</h3>
                {devices.length === 0 ? (
                    <div className="no-devices">
                        <p>No devices connected yet</p>
                        <p>Connect a device below to start syncing your health data</p>
                    </div>
                ) : (
                    <div className="devices-grid">
                        {devices.map(device => (
                            <div key={device.device_id} className="device-card">
                                <div className="device-info">
                                    <h4>{device.device_name}</h4>
                                    <p>{device.manufacturer}</p>
                                    <span className={`status ${device.connected ? 'connected' : 'disconnected'}`}>
                                        {device.connected ? '✅ Connected' : '❌ Disconnected'}
                                    </span>
                                </div>
                                <div className="device-actions">
                                    {device.connected && (
                                        <>
                                            <button 
                                                onClick={() => syncDeviceData(device.device_id)}
                                                disabled={loading}
                                                className="sync-btn"
                                            >
                                                🔄 Sync Data
                                            </button>
                                            <button 
                                                onClick={() => disconnectDevice(device.device_id)}
                                                className="disconnect-btn"
                                            >
                                                🔌 Disconnect
                                            </button>
                                        </>
                                    )}
                                </div>
                                {syncData[device.device_id] && (
                                    <div className="sync-info">
                                        <small>
                                            Last sync: {syncData[device.device_id].lastSync}<br/>
                                            Records: {syncData[device.device_id].recordCount}
                                        </small>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="available-devices">
                <h3>Add New Device</h3>
                <div className="device-types">
                    {availableDeviceTypes.map(deviceType => (
                        <div key={deviceType.id} className="device-type-card">
                            <h4>{deviceType.name}</h4>
                            <p>Permissions: {deviceType.permissions.join(', ')}</p>
                            <button 
                                onClick={() => requestPermission(deviceType.id, deviceType.permissions)}
                                disabled={loading}
                                className="connect-btn"
                            >
                                {loading ? 'Requesting...' : '📱 Connect Device'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="permissions-info">
                <h3>🔒 Data Privacy & Permissions</h3>
                <div className="privacy-notice">
                    <p>
                        <strong>Your health data is secure:</strong>
                    </p>
                    <ul>
                        <li>✅ Data is encrypted and stored securely</li>
                        <li>✅ You control which data types to share</li>
                        <li>✅ You can disconnect devices anytime</li>
                        <li>✅ Data is only used to improve ARYA's health assessments</li>
                    </ul>
                </div>
            </div>

            {loading && (
                <div className="loading-overlay">
                    <div className="loading-spinner">
                        <div className="spinner"></div>
                        <p>Processing...</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WearablesSync;