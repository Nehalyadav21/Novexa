/**
 * useWebRTCMeeting Hook - Fixed Version
 * 
 * This React hook manages WebRTC video meeting functionality with:
 * 1. Socket.IO signaling for WebRTC coordination
 * 2. RTCPeerConnection management for multiple participants
 * 3. Local/remote stream handling
 * 4. Meeting controls (audio/video/screen sharing)
 * 5. User media access and management
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const useWebRTCMeeting = (meetingId, user) => {
  // State management
  const [isConnected, setIsConnected] = useState(false);
  const [meetingJoined, setMeetingJoined] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [participants, setParticipants] = useState([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  // Refs for maintaining references across renders
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());
  const localVideoRef = useRef(null);

  // RTCPeerConnection configuration
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ],
    iceCandidatePoolSize: 10
  };

  /**
   * Get User Media (Camera and Microphone)
   */
  const getUserMedia = async () => {
    try {
      const constraints = {
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('📹 Got user media stream:', stream.getTracks().map(t => t.kind));
      return stream;
    } catch (error) {
      console.error('Error getting user media:', error);
      throw new Error(`Camera/microphone access denied: ${error.message}`);
    }
  };

  /**
   * Create Peer Connection for a specific participant
   */
  const createPeerConnection = useCallback(async (socketId) => {
    try {
      console.log(`🤝 Creating peer connection for: ${socketId}`);
      
      const peerConnection = new RTCPeerConnection(rtcConfig);
      
      // Add local tracks to peer connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          peerConnection.addTrack(track, localStreamRef.current);
          console.log(`📤 Added track: ${track.kind}`);
        });
      }

      // Handle incoming tracks from remote peer
      peerConnection.ontrack = (event) => {
        console.log(`📥 Received track from: ${socketId}`, event.track.kind);
        
        setRemoteStreams(prev => {
          const newStreams = new Map(prev);
          newStreams.set(socketId, event.streams[0]);
          return newStreams;
        });
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          console.log(`🧊 Sending ICE candidate to: ${socketId}`);
          socketRef.current.emit('webrtc-ice-candidate', {
            candidate: event.candidate,
            toSocketId: socketId
          });
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log(`🔗 Connection state for ${socketId}:`, peerConnection.connectionState);
        
        if (peerConnection.connectionState === 'connected') {
          console.log(`✅ Connected to: ${socketId}`);
        } else if (peerConnection.connectionState === 'failed') {
          console.log(`❌ Connection failed to: ${socketId}`);
          // Try to restart ICE
          peerConnection.restartIce();
        }
      };

      peerConnectionsRef.current.set(socketId, peerConnection);
      return peerConnection;
    } catch (error) {
      console.error('Error creating peer connection:', error);
      throw error;
    }
  }, []);

  /**
   * Setup Socket.IO Event Listeners
   */
  const setupSocketListeners = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) return;

    console.log('🔧 Setting up socket listeners');

    // Connection events
    socket.on('connect', () => {
      console.log('🔗 Socket connected:', socket.id);
      setConnectionStatus('connected');
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setConnectionStatus('disconnected');
    });

    // Meeting events
    socket.on('user-joined', ({ userId, userName, socketId }) => {
      console.log(`👤 User joined: ${userName} (${userId})`);
      
      setParticipants(prev => {
        const existing = prev.find(p => p.socketId === socketId);
        if (existing) return prev;
        
        return [...prev, { 
          userId, 
          userName, 
          socketId,
          isHost: false,
          isAudioEnabled: true,
          isVideoEnabled: true
        }];
      });

      // Create peer connection for new user
      if (localStreamRef.current) {
        createPeerConnection(socketId);
      }
    });

    socket.on('user-left', ({ userId, socketId }) => {
      console.log(`👋 User left: ${userId}`);
      
      setParticipants(prev => prev.filter(p => p.socketId !== socketId));
      setRemoteStreams(prev => {
        const newStreams = new Map(prev);
        newStreams.delete(socketId);
        return newStreams;
      });

      // Close and remove peer connection
      const peerConnection = peerConnectionsRef.current.get(socketId);
      if (peerConnection) {
        peerConnection.close();
        peerConnectionsRef.current.delete(socketId);
      }
    });

    // WebRTC signaling events
    socket.on('webrtc-offer', async ({ offer, fromSocketId }) => {
      console.log(`📡 Received offer from: ${fromSocketId}`);
      
      try {
        const peerConnection = await createPeerConnection(fromSocketId);
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        socket.emit('webrtc-answer', {
          answer,
          toSocketId: fromSocketId
        });
        
        console.log(`📤 Sent answer to: ${fromSocketId}`);
      } catch (error) {
        console.error('Error handling offer:', error);
      }
    });

    socket.on('webrtc-answer', async ({ answer, fromSocketId }) => {
      console.log(`📡 Received answer from: ${fromSocketId}`);
      
      try {
        const peerConnection = peerConnectionsRef.current.get(fromSocketId);
        if (peerConnection) {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
          console.log(`✅ Set remote description for: ${fromSocketId}`);
        }
      } catch (error) {
        console.error('Error handling answer:', error);
      }
    });

    socket.on('webrtc-ice-candidate', async ({ candidate, fromSocketId }) => {
      console.log(`🧊 Received ICE candidate from: ${fromSocketId}`);
      
      try {
        const peerConnection = peerConnectionsRef.current.get(fromSocketId);
        if (peerConnection) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          console.log(`✅ Added ICE candidate for: ${fromSocketId}`);
        }
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    });

    console.log('✅ Socket listeners setup complete');
  }, [createPeerConnection]);

  /**
   * Initialize Meeting - Setup socket and get media
   */
  const initializeMeeting = useCallback(async () => {
    try {
      setError(null);
      setConnectionStatus('connecting');
      console.log('🚀 Initializing WebRTC meeting...');

      // Get user media first
      const stream = await getUserMedia();
      localStreamRef.current = stream;
      setLocalStream(stream);

      // Initialize socket connection
      if (!socketRef.current) {
        console.log('🔌 Creating new socket connection...');
        const { io } = await import('socket.io-client');
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
        
        socketRef.current = io(socketUrl, {
          transports: ['websocket', 'polling'],
          timeout: 10000,
          forceNew: true
        });
        
        setupSocketListeners();
        
        // Wait for socket to connect
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Socket connection timeout'));
          }, 10000);
          
          socketRef.current.on('connect', () => {
            console.log('✅ Socket connected successfully:', socketRef.current.id);
            clearTimeout(timeout);
            resolve();
          });
          
          socketRef.current.on('connect_error', (error) => {
            console.error('❌ Socket connection failed:', error);
            clearTimeout(timeout);
            reject(error);
          });
        });
      }

      setIsConnected(true);
      setConnectionStatus('connected');
      console.log('✅ Meeting initialization complete');

    } catch (error) {
      console.error('❌ Meeting initialization failed:', error);
      setError(error.message);
      setConnectionStatus('failed');
    }
  }, [setupSocketListeners]);

  /**
   * Join Meeting
   */
  const joinMeeting = useCallback(() => {
    if (!socketRef.current?.connected || !user) {
      console.warn('⚠️ Cannot join meeting - socket not connected or no user');
      return;
    }

    console.log(`🎯 Joining meeting: ${meetingId} as ${user.name || user.email}`);
    
    socketRef.current.emit('join-meeting', {
      meetingId,
      userId: user.userId || user.id,
      userName: user.name || user.email
    });
    
    setMeetingJoined(true);
  }, [meetingId, user]);

  // Control functions
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        console.log(`🎤 Audio ${audioTrack.enabled ? 'enabled' : 'disabled'}`);
      }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        console.log(`📹 Video ${videoTrack.enabled ? 'enabled' : 'disabled'}`);
      }
    }
  }, []);

  const leaveMeeting = useCallback(() => {
    try {
      console.log('👋 Leaving meeting...');
      
      if (socketRef.current) {
        socketRef.current.emit('leave-meeting', { meetingId });
        socketRef.current.disconnect();
      }

      // Stop all tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
      }

      // Close all peer connections
      peerConnectionsRef.current.forEach(pc => pc.close());
      peerConnectionsRef.current.clear();

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
      hasMeetingId: !!meetingId
    });
    
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
  }, [meetingId, user, initializeMeeting]);

  // Join meeting after initialization
  useEffect(() => {
    if (isConnected && !meetingJoined && socketRef.current?.connected) {
      console.log('🎯 Ready to join meeting - socket connected and media initialized');
      joinMeeting();
    }
  }, [isConnected, meetingJoined, joinMeeting]);

  // Set local video ref when stream is available
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

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
    
    // Refs
    localVideoRef,
    
    // Functions
    toggleAudio,
    toggleVideo,
    leaveMeeting,
    joinMeeting
  };
};

export default useWebRTCMeeting;
