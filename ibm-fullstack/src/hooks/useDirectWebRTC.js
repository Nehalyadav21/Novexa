// Hook for direct WebRTC without Socket.IO dependency
// Perfect for Vercel production deployment

import { useState, useEffect, useRef, useCallback } from 'react';
import { DirectWebRTC } from '@/lib/direct-webrtc';

export const useDirectWebRTC = (meetingId, user, meetingPassword = '') => {
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [error, setError] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcripts, setTranscripts] = useState([]);
  
  const webrtcRef = useRef(null);
  const localVideoRef = useRef(null);
  const recognitionRef = useRef(null);
  const transcriptionIntentionallyStoppedRef = useRef(false);
  
  // Initialize WebRTC
  useEffect(() => {
    if (!meetingId || !user) return;
    
    console.log('🔧 Initializing Direct WebRTC...', { user });
    
    // Handle both user.id and user.userId formats, and generate one if missing
    let userId = user.id || user.userId;
    let userName = user.name || user.email;
    
    // Generate a temporary ID if none exists (for anonymous users)
    if (!userId) {
      userId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('🔧 Generated temporary user ID:', userId);
    }
    
    // Generate a temporary name if none exists
    if (!userName) {
      userName = `User_${userId.substr(-4)}`;
      console.log('🔧 Generated temporary user name:', userName);
    }
    
    console.log('🔧 Final user data:', { userId, userName });
    
    webrtcRef.current = new DirectWebRTC(meetingId, userId, userName, meetingPassword);
    
    // Set up event handlers
    webrtcRef.current.onConnectionStatus = (status) => {
      console.log('Connection status:', status);
      setConnectionStatus(status);
      setIsConnected(status === 'connected' || status === 'peer-connected');
    };
    
    webrtcRef.current.onLocalStream = (stream) => {
      console.log('Local stream received:', stream);
      setLocalStream(stream);
    };

    webrtcRef.current.onRemoteStream = (participantId, stream) => {
      console.log(`📺 Remote stream received from ${participantId}`, stream);
      console.log(`📺 Stream tracks:`, stream.getTracks().map(t => `${t.kind}:${t.enabled}`));
      setRemoteStreams(prev => {
        // Use participantId (which is userId) as the key, but also log the mapping
        const newMap = new Map(prev.set(participantId, stream));
        console.log(`📊 Updated remote streams map:`, Array.from(newMap.keys()));
        console.log(`🔗 Stream mapped: userId ${participantId} -> stream with ${stream.getTracks().length} tracks`);
        return newMap;
      });
    };
    
    webrtcRef.current.onParticipantJoined = (participantData) => {
      console.log(`🎉 Participant joined callback triggered:`, participantData);
      // Transform participant data to match UI expectations
      const transformedParticipant = {
        ...participantData,
        socketId: participantData.userId, // Use userId as socketId for compatibility
        audioEnabled: true, // Default to enabled, could be updated via signaling
        videoEnabled: true, // Default to enabled, could be updated via signaling
        isHost: false // Default to false, could be determined by other logic
      };
      console.log(`🔄 Transformed participant:`, transformedParticipant);
      setParticipants(prev => {
        // Avoid duplicates by filtering out existing participant with same ID
        const filtered = prev.filter(p => p.userId !== participantData.userId);
        const newParticipants = [...filtered, transformedParticipant];
        console.log(`📋 Updated participants list:`, newParticipants);
        return newParticipants;
      });
    };
    
    webrtcRef.current.onParticipantLeft = (participantId) => {
      console.log(`Participant left: ${participantId}`);
      setParticipants(prev => prev.filter(p => p.userId !== participantId));
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        newMap.delete(participantId);
        return newMap;
      });
    };
    
    return () => {
      if (webrtcRef.current) {
        webrtcRef.current.leaveMeeting();
      }
    };
  }, [meetingId, user, meetingPassword]);
  
  // Initialize media and join meeting
  const joinMeeting = useCallback(async () => {
    if (!webrtcRef.current) return;
    
    try {
      setError(null);
      setConnectionStatus('connecting');
      
      // Initialize media first
      const stream = await webrtcRef.current.initializeMedia();
      setLocalStream(stream);
      
      // Set local video
      if (localVideoRef.current && stream) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Join the meeting
      await webrtcRef.current.joinMeeting();
      
    } catch (err) {
      console.error('Failed to join meeting:', err);
      setError(err.message);
      setConnectionStatus('error');
    }
  }, []);
  
  // Leave meeting
  const leaveMeeting = useCallback(async () => {
    if (webrtcRef.current) {
      await webrtcRef.current.leaveMeeting();
      setIsConnected(false);
      setParticipants([]);
      setRemoteStreams(new Map());
      setLocalStream(null);
      setConnectionStatus('disconnected');
    }
  }, []);
  
  // Toggle mute
  const toggleMute = useCallback(() => {
    if (webrtcRef.current) {
      const muted = webrtcRef.current.toggleMute();
      setIsMuted(muted);
      return muted;
    }
    return isMuted;
  }, [isMuted]);
  
  // Toggle video
  const toggleVideo = useCallback(() => {
    if (webrtcRef.current) {
      const videoOff = webrtcRef.current.toggleVideo();
      setIsVideoOff(videoOff);
      return videoOff;
    }
    return isVideoOff;
  }, [isVideoOff]);
  
  // Get media devices
  const getMediaDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return {
        cameras: devices.filter(device => device.kind === 'videoinput'),
        microphones: devices.filter(device => device.kind === 'audioinput')
      };
    } catch (err) {
      console.error('Failed to get media devices:', err);
      return { cameras: [], microphones: [] };
    }
  }, []);

  // Helper function to save transcript
  const saveTranscript = async (text) => {
    try {
      const response = await fetch(`/api/meetings/${meetingId}/transcript`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text,
          userId: user?.id || user?.userId,
          userName: user?.name || user?.email || 'Unknown Speaker',
          confidence: 0.8 // Default confidence for web speech API
        }),
      });
      if (!response.ok) {
        console.error('Failed to save transcript:', response.statusText);
      }
    } catch (error) {
      console.error('Error saving transcript:', error);
    }
  };

  // Start transcription
  const startTranscription = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('❌ Speech recognition not supported in this browser');
      return;
    }

    if (recognitionRef.current || transcriptionIntentionallyStoppedRef.current) {
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsTranscribing(true);
        console.log('✅ Transcription started');
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript.trim()) {
          const newTranscript = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            text: finalTranscript.trim(),
            speaker: user?.name || user?.email || 'You',
            userName: user?.name || user?.email || 'You'
          };
          setTranscripts(prev => [...prev, newTranscript]);
          saveTranscript(finalTranscript.trim());
        }
      };

      recognition.onerror = (event) => {
        console.error('❌ Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          transcriptionIntentionallyStoppedRef.current = true;
          setIsTranscribing(false);
          return;
        }
        // Auto-restart on transient errors
        if (['aborted', 'network', 'no-speech'].includes(event.error)) {
          setTimeout(() => {
            if (!transcriptionIntentionallyStoppedRef.current && isConnected) {
              startTranscription();
            }
          }, 1000);
        }
      };

      recognition.onend = () => {
        recognitionRef.current = null;
        if (!transcriptionIntentionallyStoppedRef.current && isConnected) {
          setTimeout(() => startTranscription(), 1000);
        } else {
          setIsTranscribing(false);
        }
      };

      recognitionRef.current = recognition;
      transcriptionIntentionallyStoppedRef.current = false;
      recognition.start();
    } catch (error) {
      console.error('❌ Error starting transcription:', error);
    }
  }, [user, saveTranscript, isConnected, meetingId]);

  // Stop transcription
  const stopTranscription = useCallback(() => {
    console.log('🛑 Stopping transcription intentionally');
    transcriptionIntentionallyStoppedRef.current = true;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsTranscribing(false);
  }, []);

  // Auto-start transcription when connected
  useEffect(() => {
    if (isConnected && !isTranscribing && !transcriptionIntentionallyStoppedRef.current) {
      console.log('🎤 Auto-starting transcription after connection...');
      setTimeout(() => {
        startTranscription();
      }, 2000);
    }
  }, [isConnected, isTranscribing, startTranscription]);

  // Cleanup transcription on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        transcriptionIntentionallyStoppedRef.current = true;
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);
  
  return {
    // State
    isConnected,
    participants,
    localStream,
    remoteStreams,
    isMuted,
    isVideoOff,
    connectionStatus,
    error,
    isTranscribing,
    transcripts,
    
    // Refs
    localVideoRef,
    
    // Actions
    joinMeeting,
    leaveMeeting,
    toggleMute,
    toggleVideo,
    getMediaDevices,
    startTranscription,
    stopTranscription,
    
    // Utils
    isReady: !!webrtcRef.current
  };
};
