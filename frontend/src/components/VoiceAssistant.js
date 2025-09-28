import React, { useState, useEffect, useRef } from 'react';
import './VoiceAssistant.css';

const VoiceAssistant = ({ userId, onVoiceResponse }) => {
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [audioLevel, setAudioLevel] = useState(0);
    const [sessionId, setSessionId] = useState(null);
    const [voiceEnabled, setVoiceEnabled] = useState(false);
    const [selectedVoice, setSelectedVoice] = useState('nova');
    const [availableVoices, setAvailableVoices] = useState([]);
    
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const audioRef = useRef(null);
    const streamRef = useRef(null);

    const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

    useEffect(() => {
        initializeVoiceAssistant();
        loadAvailableVoices();
        
        return () => {
            cleanup();
        };
    }, []);

    const initializeVoiceAssistant = async () => {
        try {
            // Generate session ID
            const newSessionId = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            setSessionId(newSessionId);
            
            // Check browser support
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.error('Voice features not supported in this browser');
                return;
            }
            
            setVoiceEnabled(true);
        } catch (error) {
            console.error('Failed to initialize voice assistant:', error);
        }
    };

    const loadAvailableVoices = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/voice/voices`);
            const data = await response.json();
            setAvailableVoices(data.voices || []);
            setSelectedVoice(data.default_voice || 'nova');
        } catch (error) {
            console.error('Failed to load voices:', error);
        }
    };

    const cleanup = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
    };

    const startListening = async () => {
        if (!voiceEnabled) return;
        
        try {
            setIsListening(true);
            setTranscript('');
            audioChunksRef.current = [];

            // Get microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Set up audio level monitoring
            setupAudioLevelMonitoring(stream);

            // Set up media recorder
            mediaRecorderRef.current = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                processAudio();
            };

            mediaRecorderRef.current.start();
            
        } catch (error) {
            console.error('Failed to start listening:', error);
            setIsListening(false);
            alert('Failed to access microphone. Please check permissions.');
        }
    };

    const stopListening = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        
        setIsListening(false);
        setAudioLevel(0);
    };

    const setupAudioLevelMonitoring = (stream) => {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        
        analyserRef.current.fftSize = 256;
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const updateAudioLevel = () => {
            if (isListening) {
                analyserRef.current.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b) / bufferLength;
                setAudioLevel(average);
                requestAnimationFrame(updateAudioLevel);
            }
        };
        
        updateAudioLevel();
    };

    const processAudio = async () => {
        if (audioChunksRef.current.length === 0) return;
        
        setIsProcessing(true);
        
        try {
            // Create audio blob
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            
            // Create form data
            const formData = new FormData();
            formData.append('file', audioBlob, 'recording.webm');
            formData.append('user_id', userId);
            formData.append('session_id', sessionId);
            formData.append('language', 'en-US');
            
            // Send to speech-to-text API
            const response = await fetch(`${BACKEND_URL}/api/voice/speech-to-text`, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                setTranscript(result.transcription);
                
                // Send to ARYA for processing
                await processWithARYA(result.transcription);
            } else {
                console.error('Speech-to-text failed:', result);
                setTranscript('Sorry, I couldn\'t understand that. Please try again.');
            }
            
        } catch (error) {
            console.error('Failed to process audio:', error);
            setTranscript('Sorry, there was an error processing your voice. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const processWithARYA = async (message) => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/voice/conversation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: userId,
                    message: message,
                    session_id: sessionId,
                    language: 'en-US'
                })
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                // Notify parent component of the response
                if (onVoiceResponse) {
                    onVoiceResponse({
                        userMessage: message,
                        aryaResponse: result.text_response,
                        sessionId: sessionId,
                        aryaState: result.arya_state,
                        emergencyLevel: result.emergency_level
                    });
                }
                
                // Play ARYA's audio response
                await playARYAResponse(result.text_response);
            }
            
        } catch (error) {
            console.error('Failed to process with ARYA:', error);
        }
    };

    const playARYAResponse = async (text) => {
        if (!text) return;
        
        setIsSpeaking(true);
        
        try {
            const response = await fetch(`${BACKEND_URL}/api/voice/text-to-speech`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text,
                    voice: selectedVoice,
                    speed: 1.0
                })
            });
            
            if (response.ok) {
                const audioBlob = await response.blob();
                const audioUrl = URL.createObjectURL(audioBlob);
                
                if (audioRef.current) {
                    audioRef.current.src = audioUrl;
                    audioRef.current.onended = () => {
                        setIsSpeaking(false);
                        URL.revokeObjectURL(audioUrl);
                    };
                    await audioRef.current.play();
                }
            }
            
        } catch (error) {
            console.error('Failed to play ARYA response:', error);
            setIsSpeaking(false);
        }
    };

    const stopSpeaking = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setIsSpeaking(false);
    };

    const getAudioLevelIndicator = () => {
        const level = Math.min(audioLevel / 50, 1); // Normalize to 0-1
        return {
            height: `${level * 100}%`,
            backgroundColor: level > 0.5 ? '#ff4444' : level > 0.2 ? '#ffaa00' : '#44ff44'
        };
    };

    if (!voiceEnabled) {
        return (
            <div className="voice-assistant disabled">
                <p>Voice features are not available in this browser</p>
            </div>
        );
    }

    return (
        <div className="voice-assistant">
            <div className="voice-controls">
                <div className="voice-status">
                    {isListening && (
                        <div className="audio-visualizer">
                            <div className="audio-bar" style={getAudioLevelIndicator()}></div>
                            <span>Listening...</span>
                        </div>
                    )}
                    {isProcessing && (
                        <div className="processing-indicator">
                            <div className="processing-spinner"></div>
                            <span>Processing...</span>
                        </div>
                    )}
                    {isSpeaking && (
                        <div className="speaking-indicator">
                            <div className="speaking-wave"></div>
                            <span>ARYA is speaking...</span>
                        </div>
                    )}
                </div>

                <div className="voice-buttons">
                    {!isListening && !isProcessing && !isSpeaking && (
                        <button 
                            className="voice-btn start-btn"
                            onClick={startListening}
                            title="Click and hold to speak"
                        >
                            🎤 Talk to ARYA
                        </button>
                    )}
                    
                    {isListening && (
                        <button 
                            className="voice-btn stop-btn"
                            onClick={stopListening}
                        >
                            ⏹️ Stop Recording
                        </button>
                    )}
                    
                    {isSpeaking && (
                        <button 
                            className="voice-btn stop-speaking-btn"
                            onClick={stopSpeaking}
                        >
                            🔇 Stop Speaking
                        </button>
                    )}
                </div>

                {transcript && (
                    <div className="transcript">
                        <strong>You said:</strong> {transcript}
                    </div>
                )}
            </div>

            <div className="voice-settings">
                <label>
                    ARYA's Voice:
                    <select 
                        value={selectedVoice} 
                        onChange={(e) => setSelectedVoice(e.target.value)}
                    >
                        {availableVoices.map(voice => (
                            <option key={voice.id} value={voice.id}>
                                {voice.name} ({voice.gender})
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            <div className="voice-tips">
                <h4>💡 Voice Tips:</h4>
                <ul>
                    <li>Speak clearly and at normal pace</li>
                    <li>Describe your symptoms in detail</li>
                    <li>ARYA will ask follow-up questions</li>
                    <li>You can interrupt ARYA if needed</li>
                </ul>
            </div>

            <audio ref={audioRef} style={{ display: 'none' }} />
        </div>
    );
};

export default VoiceAssistant;