/**
 * useWebRTCMeeting Hook
 * 
 * This hook manages:
 * 1. Local media (getUserMedia) with mobile optimization
 * 2. Peer connections (RTCPeerConnection)
 * 3. Socket.IO signaling
 * 4. Meeting state management
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { 
  isMobileDevice, 
  isSecureContext, 
  requestMediaPermissions, 
  getMediaErrorMessage,
  isWebRTCSupported,
  checkMobileBrowserSupport,
  optimizeVideoForMobile 
} from '../utils/mobileOptimization';

const useWebRTCMeeting = (meetingId, user) => {
  // Check if Socket.IO is disabled for production
  const isSocketIODisabled = process.env.NEXT_PUBLIC_DISABLE_SOCKETIO === 'true';
  
  // Debug log for environment variable
  console.log('🔍 Environment Check:', {
    NEXT_PUBLIC_DISABLE_SOCKETIO: process.env.NEXT_PUBLIC_DISABLE_SOCKETIO,
    isSocketIODisabled: isSocketIODisabled
  });

  // State management
  const [isConnected, setIsConnected] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [participants, setParticipants] = useState([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [meetingJoined, setMeetingJoined] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(isSocketIODisabled ? 'disabled' : 'disconnected');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcripts, setTranscripts] = useState([]);

  // Refs for persistent objects
  const socketRef = useRef(null);
  const localVideoRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const recognitionRef = useRef(null);
  const transcriptionIntentionallyStoppedRef = useRef(false);
  const transcriptionRestartAttemptsRef = useRef(0); // consecutive restart attempts
  const transcriptionKeepAliveTimerRef = useRef(null);
  const recognitionStartingRef = useRef(false); // prevent overlapping start attempts
  const networkErrorCountRef = useRef(0);
  const lastNetworkErrorRef = useRef(0);
  const degradedModeRef = useRef(false); // fallback mode after persistent errors
  const circuitBreakerRef = useRef(false); // stop attempts when errors persist
  const lastSuccessfulStartRef = useRef(0);

  // WebRTC configuration
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ],
    iceCandidatePoolSize: 10
  };

  // Helper function to update meeting status
  const updateMeetingStatus = async (status) => {
    try {
      const response = await fetch(`/api/meetings/${meetingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        console.error('Failed to update meeting status:', response.statusText);
      }
    } catch (error) {
      console.error('Error updating meeting status:', error);
    }
  };

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
          userId: user?.id,
          userName: user?.name || 'Unknown Speaker',
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

  // ---------------- Socket Helpers (moved up to avoid TDZ issues) ----------------
  const socketConnectAttemptsRef = useRef(0);
  const maxSocketAttempts = 5; // Increased attempts
  const baseSocketURLRef = useRef(null);
  const connectionTimeoutRef = useRef(null);
  const isConnectingRef = useRef(false); // Prevent multiple simultaneous connections

  const resolveBaseSocketURL = () => {
    if (baseSocketURLRef.current) return baseSocketURLRef.current;
    
    // Check if Socket.IO is disabled for production deployments
    const isSocketIODisabled = process.env.NEXT_PUBLIC_DISABLE_SOCKETIO === 'true';
    
    if (isSocketIODisabled) {
      console.log('🚫 Socket.IO disabled - no URL needed for fallback mode');
      baseSocketURLRef.current = null;
      return null;
    }
    
    // Use environment variables first, then fallback
    const envSocketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    
    if (typeof window !== 'undefined') {
      // Use environment variable or window location for production
      baseSocketURLRef.current = envSocketUrl || window.location.origin;
      console.log('🔗 Using client-side URL:', baseSocketURLRef.current);
    } else {
      // Server-side: use environment variable or localhost fallback for development
      baseSocketURLRef.current = envSocketUrl || 'http://localhost:3000';
      console.log('🔗 Using server-side URL:', baseSocketURLRef.current);
    }
    return baseSocketURLRef.current;
  };

  // Connection health check utility - Fixed endpoint
  const checkConnection = useCallback(async () => {
    const baseURL = resolveBaseSocketURL();
    
    // If Socket.IO is disabled, skip connection check
    if (!baseURL) {
      console.log('🚫 Socket.IO disabled - skipping connection check');
      return true; // Return true to allow fallback mode to proceed
    }
    
    try {
      console.log('🏥 Checking server health at:', baseURL);
      // Check the actual web server, not Socket.IO endpoint
      const response = await fetch(`${baseURL}/api/health`, { 
        method: 'GET',
        mode: 'cors'
      }).catch(() => {
        // Fallback to checking the main page
        return fetch(baseURL, { method: 'GET', mode: 'cors' });
      });
      const isHealthy = response.ok;
      console.log('🏥 Server health check:', isHealthy ? '✅ Healthy' : `❌ Unhealthy (${response.status})`);
      if (!isHealthy) {
        console.error('🏥 Server response:', response.status, response.statusText);
      }
      return isHealthy;
    } catch (error) {
      console.error('🏥 Connection health check failed:', error.message);
      console.error('🚨 This usually means the server is not running or not accessible');
      return false;
    }
  }, []);

  /**
   * Create Peer Connection (moved here to fix hoisting issue)
   * Sets up RTCPeerConnection for a specific participant
   */
  const createPeerConnection = useCallback((socketId) => {
    try {
      console.log(`🤝 Creating peer connection for: ${socketId}`);
      
      const peerConnection = new RTCPeerConnection(rtcConfig);
      
      // Add local tracks to peer connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          peerConnection.addTrack(track, localStreamRef.current);
          console.log(`➕ Added local ${track.kind} track to peer connection for ${socketId}`);
        });
      } else {
        console.warn('⚠️ No local stream available when creating peer connection');
      }

      // Handle incoming remote stream
      peerConnection.ontrack = (event) => {
        console.log(`📡 Received remote track from ${socketId}:`, event.track.kind);
        const [remoteStream] = event.streams;
        
        if (remoteStream) {
          console.log(`📺 Setting remote stream for ${socketId}:`, remoteStream.getTracks().length, 'tracks');
          setRemoteStreams(prev => {
            const newStreams = new Map(prev);
            newStreams.set(socketId, remoteStream);
            console.log(`📊 Total remote streams: ${newStreams.size}`);
            return newStreams;
          });
        } else {
          console.error('❌ No remote stream in track event');
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socketRef.current?.connected) {
          console.log(`🧊 Sending ICE candidate to ${socketId}`);
          socketRef.current.emit('ice-candidate', {
            targetSocketId: socketId,
            candidate: event.candidate,
            meetingId
          });
        } else if (!event.candidate) {
          console.log(`🧊 ICE gathering complete for ${socketId}`);
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log(`🔄 Peer connection state with ${socketId}:`, peerConnection.connectionState);
        
        if (peerConnection.connectionState === 'connected') {
          console.log(`✅ Peer connection established with ${socketId}`);
        } else if (peerConnection.connectionState === 'failed') {
          console.error(`❌ Peer connection failed with ${socketId}, attempting restart`);
          // Attempt to restart ICE
          peerConnection.restartIce();
        } else if (peerConnection.connectionState === 'disconnected') {
          console.warn(`🔌 Peer connection disconnected with ${socketId}`);
          // Remove the remote stream
          setRemoteStreams(prev => {
            const newStreams = new Map(prev);
            newStreams.delete(socketId);
            console.log(`📺 Removed remote stream for ${socketId}`);
            return newStreams;
          });
        }
      };

      // Handle ICE connection state changes
      peerConnection.oniceconnectionstatechange = () => {
        console.log(`🧊 ICE connection state with ${socketId}:`, peerConnection.iceConnectionState);
      };

      peerConnectionsRef.current.set(socketId, peerConnection);
      console.log(`💾 Stored peer connection for ${socketId}. Total connections:`, peerConnectionsRef.current.size);
      return peerConnection;

    } catch (error) {
      console.error('Error creating peer connection:', error);
      throw error;
    }
  }, [meetingId]);

  const setupSocketListeners = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) return;

    if (socket._webrtc_listeners_attached) {
      return; // prevent duplicate listener registration
    }
    socket._webrtc_listeners_attached = true;

    console.log('🔧 Setting up socket listeners (once)');

    socket.on('connect', () => {
      console.log('🔗 Socket connected:', socket.id);
      setConnectionStatus('connected');
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected. Reason:', reason);
      setConnectionStatus('disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket connect_error:', error.message);
      console.error('💡 This often means:');
      console.error('   1. Server is not running (npm run dev)');
      console.error('   2. Port 3000 is blocked or in use');
      console.error('   3. Network connectivity issues');
      setConnectionStatus('failed');
    });

    socket.on('reconnect_attempt', (attempt) => {
      console.log(`♻️ Reconnect attempt ${attempt}`);
      setConnectionStatus('reconnecting');
    });

    socket.on('reconnect_failed', () => {
      console.error('❌ All reconnection attempts failed');
      console.error('💡 Please check server status and refresh the page');
      setConnectionStatus('failed');
    });

    socket.on('reconnect', (attempt) => {
      console.log(`✅ Reconnected after ${attempt} attempts`);
      setConnectionStatus('connected');
      setIsConnected(true);
    });

    socket.on('connection-test', (data) => {
      console.log('✅ Connection test successful:', data);
    });

    // Meeting join success
    socket.on('join-success', ({ participantCount, isHost: hostStatus }) => {
      console.log(`✅ Successfully joined meeting. Participants: ${participantCount}, Host: ${hostStatus}`);
      if (participantCount === 1) {
        console.log('🔍 You are the only participant in this meeting. Open another browser tab/window with the same URL to test multi-participant functionality!');
        
        // Update meeting status to 'started' for the first participant
        updateMeetingStatus('started');
      }
      setMeetingJoined(true);
      setIsHost(hostStatus);
    });

    // Existing participants
    socket.on('existing-participants', (existingParticipants) => {
      console.log('👥 Existing participants received:', existingParticipants.length, existingParticipants);
      if (existingParticipants.length === 0) {
        console.log('📝 No other participants in this meeting yet. Open the same URL in another tab to test!');
      }
      setParticipants(existingParticipants);
      existingParticipants.forEach(async (participant) => {
        console.log(`🤝 Creating peer connection for existing participant: ${participant.userName} (${participant.socketId})`);
        const peerConnection = createPeerConnection(participant.socketId);
        try {
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          socket.emit('webrtc-offer', {
            targetSocketId: participant.socketId,
            offer,
            meetingId
          });
          console.log(`📤 Sent offer to ${participant.userName} (${participant.socketId})`);
        } catch (error) {
          console.error('Error creating offer:', error);
        }
      });
    });

    // User joined
    socket.on('user-joined', (newUser) => {
      console.log('🎉 New user joined the meeting!', newUser.userName, newUser.socketId);
      console.log('📋 Current participant count will be:', participants.length + 1);
      setParticipants(prev => [...prev, newUser]);
    });

    // User left
    socket.on('user-left', ({ socketId, userName }) => {
      console.log('👋 User left the meeting:', userName, socketId);
      console.log('📋 Remaining participant count will be:', participants.length - 1);
      const pc = peerConnectionsRef.current.get(socketId);
      if (pc) { pc.close(); peerConnectionsRef.current.delete(socketId); }
      setParticipants(prev => prev.filter(p => p.socketId !== socketId));
      setRemoteStreams(prev => { const m = new Map(prev); m.delete(socketId); return m; });
    });

    // WebRTC signaling
    socket.on('webrtc-offer', async ({ senderSocketId, offer }) => {
      console.log(`📥 Received offer from ${senderSocketId}`);
      try {
        const pc = createPeerConnection(senderSocketId);
        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc-answer', { targetSocketId: senderSocketId, answer, meetingId });
        console.log(`📤 Sent answer to ${senderSocketId}`);
      } catch (e) { console.error('Error handling offer:', e); }
    });

    socket.on('webrtc-answer', async ({ senderSocketId, answer }) => {
      console.log(`📥 Received answer from ${senderSocketId}`);
      const pc = peerConnectionsRef.current.get(senderSocketId);
      if (pc) {
        try { await pc.setRemoteDescription(answer); } catch (e) { console.error('Set remote desc error:', e); }
      }
    });

    socket.on('ice-candidate', async ({ senderSocketId, candidate }) => {
      const pc = peerConnectionsRef.current.get(senderSocketId);
      if (pc && candidate) {
        try { await pc.addIceCandidate(candidate); } catch (e) { console.error('Add ICE error:', e); }
      }
    });

    // Media toggles
    socket.on('participant-audio-toggle', ({ socketId, isEnabled }) => {
      setParticipants(prev => prev.map(p => p.socketId === socketId ? { ...p, audioEnabled: isEnabled } : p));
    });
    socket.on('participant-video-toggle', ({ socketId, isEnabled }) => {
      setParticipants(prev => prev.map(p => p.socketId === socketId ? { ...p, videoEnabled: isEnabled } : p));
    });

    socket.on('join-error', ({ message }) => {
      setError(message);
      console.error('Join error:', message);
    });
  }, [createPeerConnection, meetingId]);

  const connectSocket = useCallback(async () => {
    // Return early if Socket.IO is disabled
    if (isSocketIODisabled) {
      console.log('🚫 Socket.IO disabled - skipping connection');
      return null;
    }

    // Return existing connection if available
    if (socketRef.current?.connected) {
      console.log('🔄 Using existing socket connection:', socketRef.current.id);
      return socketRef.current;
    }
    
    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current) {
      console.log('🔄 Connection already in progress, skipping...');
      return null;
    }
    
    isConnectingRef.current = true;
    const baseURL = resolveBaseSocketURL();
    
    // If baseURL is null (Socket.IO disabled), return null
    if (!baseURL) {
      console.log('🚫 No Socket.IO URL - fallback mode active');
      isConnectingRef.current = false;
      return null;
    }
    
    console.log(`🔌 Creating new socket connection -> ${baseURL}`);

    try {
      // Clean up previous connection
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      socketRef.current = io(baseURL, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 5000,
        maxReconnectionAttempts: 5,
        timeout: 15000,
        forceNew: true,
        withCredentials: false,
        upgrade: true,
        rememberUpgrade: false,
        autoConnect: true,
        // Additional connection reliability settings
        pingTimeout: 60000,
        pingInterval: 25000,
        randomizationFactor: 0.5
      });
      
      setupSocketListeners();

      return await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          console.warn('⏱️ Socket connection timed out after 15 seconds (continuing without server)');
          isConnectingRef.current = false;
          setConnectionStatus('disconnected');
          resolve(null); // Return null instead of rejecting to allow graceful degradation
        }, 15000);

        socketRef.current.on('connect', () => {
          clearTimeout(timer);
          isConnectingRef.current = false;
          console.log('✅ Socket connected successfully, ID:', socketRef.current.id);
          setConnectionStatus('connected');
          resolve(socketRef.current);
        });
        
        socketRef.current.on('connect_error', (err) => {
          clearTimeout(timer);
          isConnectingRef.current = false;
          console.warn('⚠️ Socket connection error (will continue without server):', err.message);
          setConnectionStatus('disconnected');
          resolve(null); // Return null instead of rejecting to allow graceful degradation
        });

        socketRef.current.on('disconnect', (reason) => {
          console.warn('🔌 Socket disconnected:', reason);
          setConnectionStatus('disconnected');
        });
      });
    } catch (error) {
      isConnectingRef.current = false;
      console.warn('⚠️ Socket connection error (will continue without server):', error);
      setConnectionStatus('disconnected');
      return null; // Return null instead of throwing to allow graceful degradation
    }
  }, [setupSocketListeners, isSocketIODisabled]);

  /**
   * Initialize WebRTC Meeting (simplified and more robust)
   */
  const initializeMeeting = useCallback(async () => {
    if (!meetingId || !user) {
      console.warn('Skipping initializeMeeting: missing meetingId or user');
      return;
    }

    // Skip if Socket.IO is disabled
    if (isSocketIODisabled) {
      console.log('🚫 Socket.IO disabled - skipping meeting initialization');
      return;
    }

    console.log('🚀 Initializing WebRTC meeting...', { meetingId, user: user.userId || user.id });
    setError(null);
    setConnectionStatus('connecting');
    
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`🔄 Connection attempt ${attempts}/${maxAttempts}`);
        
        console.log('🏥 Proceeding with socket connection...');

        // Get media first (faster)
        const stream = await getUserMedia();
        localStreamRef.current = stream;
        setLocalStream(stream);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        
        // Then connect socket with retry logic
        const socket = await connectSocket();
        if (!socket) {
          console.warn('❌ Socket connection failed, but continuing with media setup');
          // Just warn about limited functionality, don't set error state
          setConnectionStatus('disconnected');
          // Don't throw error, continue with local functionality
        } else {
          setIsConnected(true);
          setConnectionStatus('connected');
        }
        
        console.log('✅ Meeting initialization complete');
        return; // Success, exit retry loop
      } catch (e) {
        console.error(`❌ Error in attempt ${attempts}:`, e);
        
        if (attempts < maxAttempts) {
          console.log(`⏳ Retrying in ${attempts * 1000}ms...`);
          await new Promise(resolve => setTimeout(resolve, attempts * 1000));
          // Reset connecting flag for retry
          isConnectingRef.current = false;
        } else {
          console.error('❌ All connection attempts failed');
          setError(`Connection failed after ${maxAttempts} attempts: ${e.message}`);
          setConnectionStatus('failed');
          isConnectingRef.current = false;
        }
      }
    }
  }, [meetingId, user, connectSocket, isSocketIODisabled]);

  /**
   * Get User Media (Camera and Microphone)
   * Uses mobile-optimized constraints and better error handling
   */
  const getUserMedia = async () => {
    try {
      // Check browser support first
      if (!isWebRTCSupported()) {
        throw new Error('WebRTC is not supported in this browser');
      }

      // Check mobile browser compatibility
      const browserCheck = checkMobileBrowserSupport();
      if (!browserCheck.supported) {
        throw new Error(browserCheck.message);
      }

      // Check secure context (HTTPS requirement)
      if (!isSecureContext()) {
        throw new Error('Camera and microphone access requires HTTPS. Please access the site via HTTPS.');
      }

      console.log(`📹 Requesting media access for ${isMobileDevice() ? 'mobile' : 'desktop'} device...`);
      
      // Use the mobile-optimized permission request
      const stream = await requestMediaPermissions();
      
      // Optimize video element for mobile if needed
      if (localVideoRef.current) {
        optimizeVideoForMobile(localVideoRef.current);
      }
      
      console.log('📹 Successfully got user media stream:', stream.getTracks().map(t => `${t.kind}:${t.enabled}`));
      return stream;
      
    } catch (error) {
      console.error('Error getting user media:', error);
      const friendlyMessage = getMediaErrorMessage(error);
      throw new Error(friendlyMessage);
    }
  };

  /**
   * Join Meeting Room
   * Sends join request to signaling server
   */
  const joinMeeting = useCallback(() => {
    if (!socketRef.current || !user) {
      console.warn('⚠️ Cannot join meeting: missing socket or user data');
      return;
    }

    if (!socketRef.current.connected) {
      console.warn('⚠️ Socket not connected, waiting...');
      return;
    }

    console.log(`🎯 Joining meeting: ${meetingId} as ${user.name || user.email}`);
    
    if (socketRef.current?.connected) {
      console.log('📡 Socket ID:', socketRef.current.id);
      socketRef.current.emit('join-meeting', {
        meetingId,
        userId: user.userId || user.id,
        userName: user.name || user.email
      });
    } else {
      console.warn('⚠️ Socket not connected, joining in offline mode');
    }
    
    setMeetingJoined(true);
  }, [meetingId, user, setMeetingJoined]);

  /**
   * Setup Socket.IO Event Listeners
   */
  // (Original large listener block replaced by refactored earlier definition)

  /**
   * Toggle Audio (Mute/Unmute)
   */
  const toggleAudio = useCallback(() => {
    if (!localStreamRef.current) return;

    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioEnabled(audioTrack.enabled);
      
      // Notify other participants
      if (socketRef.current) {
        socketRef.current.emit('toggle-audio', {
          meetingId,
          isEnabled: audioTrack.enabled
        });
      }
      
      console.log(`🎤 Audio ${audioTrack.enabled ? 'enabled' : 'disabled'}`);
    }
  }, [meetingId]);

  /**
   * Toggle Video (Camera On/Off)
   */
  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return;

    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
      
      // Notify other participants
      if (socketRef.current) {
        socketRef.current.emit('toggle-video', {
          meetingId,
          isEnabled: videoTrack.enabled
        });
      }
      
      console.log(`📹 Video ${videoTrack.enabled ? 'enabled' : 'disabled'}`);
    }
  }, [meetingId]);

  /**
   * Start Screen Sharing
   */
  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      screenStreamRef.current = screenStream;
      setIsScreenSharing(true);

      // Replace video track in all peer connections
      const videoTrack = screenStream.getVideoTracks()[0];
      peerConnectionsRef.current.forEach((peerConnection) => {
        const sender = peerConnection.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });

      // Handle screen share end
      videoTrack.onended = () => {
        stopScreenShare();
      };

      // Notify other participants
      if (socketRef.current) {
        socketRef.current.emit('start-screen-share', { meetingId });
      }

      console.log('🖥️ Started screen sharing');
    } catch (error) {
      console.error('Error starting screen share:', error);
      setError('Failed to start screen sharing');
    }
  }, [meetingId]);

  /**
   * Stop Screen Sharing
   */
  const stopScreenShare = useCallback(() => {
    if (!screenStreamRef.current || !localStreamRef.current) return;

    try {
      // Stop screen stream
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
      setIsScreenSharing(false);

      // Replace with camera video track
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      peerConnectionsRef.current.forEach((peerConnection) => {
        const sender = peerConnection.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );
        if (sender && videoTrack) {
          sender.replaceTrack(videoTrack);
        }
      });

      // Notify other participants
      if (socketRef.current) {
        socketRef.current.emit('stop-screen-share', { meetingId });
      }

      console.log('🖥️ Stopped screen sharing');
    } catch (error) {
      console.error('Error stopping screen share:', error);
    }
  }, [meetingId]);

  /**
   * Leave Meeting
   */
  const leaveMeeting = useCallback(() => {
    try {
      // Stop all local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
      }

      // Close all peer connections
      peerConnectionsRef.current.forEach((peerConnection) => {
        peerConnection.close();
      });
      peerConnectionsRef.current.clear();

      // Notify server
      if (socketRef.current) {
        socketRef.current.emit('leave-meeting', { meetingId });
        socketRef.current.disconnect();
      }

      // Reset state
      setLocalStream(null);
      setRemoteStreams(new Map());
      setParticipants([]);
      setMeetingJoined(false);
      setIsConnected(false);
      setConnectionStatus('disconnected');

      console.log('👋 Left meeting');
    } catch (error) {
      console.error('Error leaving meeting:', error);
    }
  }, [meetingId]);

  // Initialize meeting when component mounts
  useEffect(() => {
    console.log('🔄 useWebRTCMeeting initialization check:', {
      meetingId,
      user,
      hasUser: !!user,
      hasMeetingId: !!meetingId,
      isSocketIODisabled
    });
    
    // Skip initialization if Socket.IO is disabled
    if (isSocketIODisabled) {
      console.log('🚫 Socket.IO disabled - skipping useEffect initialization');
      return;
    }
    
    if (meetingId && user) {
      console.log('✅ Initializing meeting with:', { meetingId, userId: user.userId || user.id });
      initializeMeeting();
    } else {
      console.log('❌ Missing requirements for meeting initialization');
    }

    return () => {
      // Cleanup on unmount
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
      }
      peerConnectionsRef.current.forEach((pc) => pc.close());
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [meetingId, user, initializeMeeting, isSocketIODisabled]);

  // Join meeting after initialization
  useEffect(() => {
    if (isConnected && !meetingJoined && socketRef.current?.connected) {
      console.log('🎯 Ready to join meeting - socket connected and media initialized');
      joinMeeting();
    }
  }, [isConnected, meetingJoined, joinMeeting]);

  // Transcription functions
  const startTranscription = useCallback(() => {
    // Prevent starting if intentionally stopped or meeting not joined
    if (!meetingJoined || transcriptionIntentionallyStoppedRef.current) {
      console.log('🎤 Skipping transcription start - meeting not joined or intentionally stopped');
      return;
    }

    // Prevent overlapping starts
    if (recognitionStartingRef.current) {
      console.log('🎤 Transcription start already in progress, skipping');
      return;
    }

    // If already have an active recognition instance, don't create another
    if (recognitionRef.current) {
      console.log('🎤 Recognition already active, skipping start');
      return;
    }

    // Circuit breaker check
    if (circuitBreakerRef.current) {
      console.log('🚨 Circuit breaker active - cannot start transcription');
      return;
    }

    console.log('🎤 startTranscription invoked. isTranscribing:', isTranscribing, 'intentionalStop:', transcriptionIntentionallyStoppedRef.current);

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('❌ Speech recognition not supported in this browser');
      return;
    }

    recognitionStartingRef.current = true; // Set guard

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      // Adaptive parameters: in degraded mode reduce features to improve stability
      const degraded = degradedModeRef.current;
      recognition.continuous = !degraded; // sometimes disabling continuous helps with network issues
      recognition.interimResults = !degraded; // reduce payload when degraded
      recognition.lang = 'en-US';

      let localRestartScheduled = false;
      let recognitionEnded = false; // Track if this instance has ended

      const scheduleRestart = (reason, delay = 800) => {
        if (transcriptionIntentionallyStoppedRef.current || !meetingJoined || recognitionEnded) return;
        if (localRestartScheduled) return;
        
        // Circuit breaker: if too many network errors, stop trying for a while
        if (circuitBreakerRef.current) {
          console.log('🚨 Circuit breaker active - pausing transcription attempts');
          return;
        }
        
        localRestartScheduled = true;
        const attempt = transcriptionRestartAttemptsRef.current + 1;
        transcriptionRestartAttemptsRef.current = attempt;
        
        // Exponential backoff capped at 10s
        const backoff = Math.min(delay * attempt, 10000);
        console.log(`🔄 Scheduling transcription restart (#${attempt}) in ${backoff}ms due to: ${reason}`);
        setTimeout(() => {
          localRestartScheduled = false;
          if (!transcriptionIntentionallyStoppedRef.current && meetingJoined && !circuitBreakerRef.current && recognitionEnded) {
            startTranscription();
          }
        }, backoff);
      };

      recognition.onstart = () => {
        recognitionStartingRef.current = false;
        transcriptionRestartAttemptsRef.current = 0; // reset attempts
        lastSuccessfulStartRef.current = Date.now();
        circuitBreakerRef.current = false; // reset circuit breaker on success
        
        if (!isTranscribing) setIsTranscribing(true); // keep UI stable
        if (networkErrorCountRef.current > 0) {
          console.log(`✅ Transcription active (recovered after ${networkErrorCountRef.current} network issues)${degradedModeRef.current ? ' [DEGRADED MODE]' : ''}`);
        } else {
          console.log(`✅ Transcription active${degradedModeRef.current ? ' [DEGRADED MODE]' : ''}`);
        }
        
        // Reset network counters slowly after stability
        setTimeout(() => {
          if (networkErrorCountRef.current > 0) networkErrorCountRef.current = Math.max(0, networkErrorCountRef.current - 1);
          // Exit degraded mode after extended stability
          if (degradedModeRef.current && networkErrorCountRef.current === 0) {
            setTimeout(() => {
              degradedModeRef.current = false;
              console.log('🎉 Exiting degraded mode - transcription stability restored');
            }, 30000);
          }
        }, 15000);
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
        recognitionStartingRef.current = false;
        
        // Don't log errors for 'no-speech' as it's normal when no one is speaking
        if (event.error !== 'no-speech') {
          console.error('❌ Speech recognition error:', event.error);
        }
        
        if (event.error === 'not-allowed') {
          console.error('⚠️ Microphone permission denied - stopping.');
          transcriptionIntentionallyStoppedRef.current = true;
          setIsTranscribing(false);
          return;
        }
        // Treat aborted/no-speech/network as transient
        if (['aborted', 'network', 'no-speech', 'audio-capture'].includes(event.error)) {
          if (event.error === 'network') {
            const now = Date.now();
            if (now - lastNetworkErrorRef.current < 30000) {
              networkErrorCountRef.current += 1;
            } else {
              networkErrorCountRef.current = 1; // reset window
            }
            lastNetworkErrorRef.current = now;
            console.warn(`⚠️ Transient recognition issue: network (count=${networkErrorCountRef.current})`);
            
            // Circuit breaker: if too many consecutive network errors, pause for a while
            if (networkErrorCountRef.current >= 8) {
              circuitBreakerRef.current = true;
              console.warn('🚨 Too many network errors - activating circuit breaker for 60 seconds');
              setIsTranscribing(false); // Show user that transcription is paused
              setTimeout(() => {
                circuitBreakerRef.current = false;
                networkErrorCountRef.current = 0;
                console.log('🔄 Circuit breaker reset - attempting transcription restart');
                if (!transcriptionIntentionallyStoppedRef.current && meetingJoined) {
                  startTranscription();
                }
              }, 60000);
              return;
            }
            
            // Enter degraded mode after 4 consecutive network errors
            if (networkErrorCountRef.current >= 4 && !degradedModeRef.current) {
              degradedModeRef.current = true;
              console.warn('⚠️ Entering degraded transcription mode to improve stability');
            }
          } else if (event.error !== 'no-speech') {
            // Only warn for errors that aren't 'no-speech' (which is normal)
            console.warn('⚠️ Transient recognition issue:', event.error);
          }
          // Only schedule restart if this recognition instance hasn't ended yet
          if (!recognitionEnded) {
            // Adaptive base delay
            let baseDelay = 600;
            if (event.error === 'network') {
              baseDelay = 800 + Math.min(networkErrorCountRef.current * 400, 4000); // increase with count
            }
            scheduleRestart(event.error, baseDelay);
          }
        } else {
          if (!recognitionEnded) {
            scheduleRestart(event.error, 1200);
          }
        }
      };

      recognition.onend = () => {
        recognitionStartingRef.current = false;
        recognitionEnded = true; // Mark this instance as ended
        console.log('🔚 Recognition lifecycle ended');
        
        // Clear the reference if it's this instance
        if (recognitionRef.current === recognition) {
          recognitionRef.current = null;
        }
        
        if (!transcriptionIntentionallyStoppedRef.current && meetingJoined) {
          // Only schedule restart after a longer delay and don't flip UI
          setTimeout(() => {
            if (!transcriptionIntentionallyStoppedRef.current && meetingJoined && !recognitionRef.current) {
              scheduleRestart('ended', degradedModeRef.current ? 2000 : 1500);
            }
          }, 100);
        } else {
          setIsTranscribing(false);
        }
      };

      recognitionRef.current = recognition;
      transcriptionIntentionallyStoppedRef.current = false;
      console.log(`🎤 Starting SpeechRecognition instance${degradedModeRef.current ? ' (DEGRADED MODE)' : ''}...`);
      recognition.start();
    } catch (error) {
      recognitionStartingRef.current = false;
      console.error('❌ Error initializing speech recognition:', error);
      // Try again with backoff if not intentional
      if (!transcriptionIntentionallyStoppedRef.current && meetingJoined) {
        const attempt = transcriptionRestartAttemptsRef.current + 1;
        transcriptionRestartAttemptsRef.current = attempt;
        const backoff = Math.min(2000 * attempt, 15000);
        setTimeout(() => startTranscription(), backoff);
      } else {
        setIsTranscribing(false);
      }
    }
  }, [user, saveTranscript, isTranscribing, meetingJoined]);  const stopTranscription = useCallback(() => {
    console.log('🛑 Stopping transcription intentionally');
    transcriptionIntentionallyStoppedRef.current = true;
  transcriptionRestartAttemptsRef.current = 0;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsTranscribing(false);
  }, []);

  // Auto-start transcription when meeting is joined
  useEffect(() => {
    if (meetingJoined && !isTranscribing) {
      console.log('🎤 Auto-starting transcription after meeting join...');
      console.log('Meeting joined:', meetingJoined, 'Is transcribing:', isTranscribing);
      
      setTimeout(() => {
        console.log('🎤 Attempting to start transcription now...');
        startTranscription();
      }, 2000); // Increased delay to ensure everything is set up and user interaction is complete
    }
  }, [meetingJoined, isTranscribing, startTranscription]);

  // Cleanup transcription when meeting ends or component unmounts
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        console.log('🧹 Cleaning up transcription on unmount');
        transcriptionIntentionallyStoppedRef.current = true;
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      if (transcriptionKeepAliveTimerRef.current) {
        clearInterval(transcriptionKeepAliveTimerRef.current);
      }
    };
  }, []);

  // Stop transcription when leaving meeting
  useEffect(() => {
    if (!meetingJoined && isTranscribing) {
      console.log('🛑 Stopping transcription because meeting ended');
      stopTranscription();
    }
  }, [meetingJoined, isTranscribing, stopTranscription]);

  // Keep-alive watchdog: ensure recognition stays running
  useEffect(() => {
    if (meetingJoined && isTranscribing && !transcriptionIntentionallyStoppedRef.current) {
      if (!transcriptionKeepAliveTimerRef.current) {
        transcriptionKeepAliveTimerRef.current = setInterval(() => {
          const active = !!recognitionRef.current;
          if (!active && meetingJoined && !transcriptionIntentionallyStoppedRef.current) {
            console.log('🛡️ Keep-alive restarting transcription (recognition missing)');
            startTranscription();
          }
        }, 5000);
      }
    } else {
      if (transcriptionKeepAliveTimerRef.current) {
        clearInterval(transcriptionKeepAliveTimerRef.current);
        transcriptionKeepAliveTimerRef.current = null;
      }
    }
  }, [meetingJoined, isTranscribing, startTranscription]);

  // Manual retry function for connection issues
  const retryConnection = useCallback(async () => {
    console.log('🔄 Manual connection retry initiated...');
    socketConnectAttemptsRef.current = 0; // Reset attempts
    setError(null);
    setConnectionStatus('connecting');
    
    try {
      await connectSocket();
      console.log('✅ Manual retry successful');
    } catch (error) {
      console.error('❌ Manual retry failed:', error);
      setError(`Connection retry failed: ${error.message}`);
      setConnectionStatus('failed');
    }
  }, [connectSocket]);

  return {
    // State
    isConnected,
    meetingJoined,
    localStream,
    remoteStreams,
    participants,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    isHost,
    error,
    connectionStatus,
    isTranscribing,
    transcripts,
    
    // Refs
    localVideoRef,
    socketRef, // Expose socket for transcription
    
    // Actions
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    leaveMeeting,
    initializeMeeting,
    retryConnection, // Manual retry function
    checkConnection,   // Health check function
    startTranscription,
    stopTranscription
  };
};

export default useWebRTCMeeting;
