import { useState, useRef, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import SimplePeer from 'simple-peer';

export const useVideoConference = (meetingId, userId, userName) => {
  const [socket, setSocket] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [peers, setPeers] = useState(new Map());
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  const localVideoRef = useRef(null);
  const peersRef = useRef(new Map());
  const audioContextRef = useRef(null);
  const audioAnalyserRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    if (!meetingId || !userId) return;

    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
      transports: ['websocket', 'polling']
    });
    
    socketInstance.on('connect', () => {
      console.log('Connected to socket server');
      setIsConnected(true);
      socketInstance.emit('join-user', { userId, userName, email: `${userName}@company.com` });
      socketInstance.emit('join-meeting', { meetingId, userId, userName, email: `${userName}@company.com` });
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    // Handle new user joining
    socketInstance.on('user-joined-meeting', ({ userId: newUserId, userName: newUserName, socketId }) => {
      console.log('User joined:', newUserName);
      setParticipants(prev => [...prev.filter(p => p.userId !== newUserId), {
        userId: newUserId,
        userName: newUserName,
        socketId,
        status: 'joined'
      }]);
      
      // Create peer connection for new user
      if (localStream) {
        createPeerConnection(socketId, newUserId, true, socketInstance);
      }
    });

    // Handle meeting participants list
    socketInstance.on('meeting-participants', (participantsList) => {
      console.log('Received participants list:', participantsList);
      setParticipants(participantsList);
      
      // Create peer connections for existing participants
      if (localStream) {
        participantsList.forEach(participant => {
          createPeerConnection(participant.socketId, participant.userId, true, socketInstance);
        });
      }
    });

    // Handle user leaving
    socketInstance.on('user-left-meeting', ({ userId: leftUserId, socketId }) => {
      console.log('User left meeting:', leftUserId);
      setParticipants(prev => prev.filter(p => p.userId !== leftUserId));
      setRemoteStreams(prev => {
        const newStreams = new Map(prev);
        newStreams.delete(socketId);
        return newStreams;
      });
      
      // Close peer connection
      const peer = peersRef.current.get(socketId);
      if (peer) {
        peer.destroy();
        peersRef.current.delete(socketId);
      }
    });

    // WebRTC signaling
    socketInstance.on('webrtc-offer', ({ offer, senderSocketId }) => {
      createPeerConnection(senderSocketId, null, false, socketInstance, offer);
    });

    socketInstance.on('webrtc-answer', ({ answer, senderSocketId }) => {
      const peer = peersRef.current.get(senderSocketId);
      if (peer) {
        peer.signal(answer);
      }
    });

    socketInstance.on('webrtc-ice-candidate', ({ candidate, senderSocketId }) => {
      const peer = peersRef.current.get(senderSocketId);
      if (peer) {
        peer.signal(candidate);
      }
    });

    // Chat messages
    socketInstance.on('chat-message', ({ userId: senderId, userName: senderName, message, timestamp }) => {
      setChatMessages(prev => [...prev, {
        userId: senderId,
        userName: senderName,
        message,
        timestamp: new Date(timestamp)
      }]);
    });

    // Transcript received
    socketInstance.on('transcript-received', ({ userId: senderId, userName: senderName, text, confidence, timestamp }) => {
      console.log('Transcript received:', { senderName, text });
      // You can handle this in the UI component
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [meetingId, userId, userName]);

  // Initialize local media stream
  const initializeMedia = useCallback(async (video = true, audio = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video ? { width: 1280, height: 720 } : false,
        audio: audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false
      });

      setLocalStream(stream);
      setIsVideoEnabled(video);
      setIsAudioEnabled(audio);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Initialize audio context for transcription
      if (audio && stream.getAudioTracks().length > 0) {
        try {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
          audioAnalyserRef.current = audioContextRef.current.createAnalyser();
          const source = audioContextRef.current.createMediaStreamSource(stream);
          source.connect(audioAnalyserRef.current);
        } catch (audioError) {
          console.warn('Failed to initialize audio context:', audioError);
        }
      }

      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback((socketId, remoteUserId, initiator, socketInstance, offer = null) => {
    if (!localStream || !socketInstance) return;

    const peer = new SimplePeer({
      initiator,
      trickle: false,
      stream: localStream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    });

    peer.on('signal', (data) => {
      if (data.type === 'offer') {
        socketInstance.emit('webrtc-offer', {
          offer: data,
          targetSocketId: socketId
        });
      } else if (data.type === 'answer') {
        socketInstance.emit('webrtc-answer', {
          answer: data,
          targetSocketId: socketId
        });
      } else if (data.candidate) {
        socketInstance.emit('webrtc-ice-candidate', {
          candidate: data,
          targetSocketId: socketId
        });
      }
    });

    peer.on('stream', (remoteStream) => {
      console.log('Received remote stream from:', socketId);
      setRemoteStreams(prev => new Map(prev.set(socketId, remoteStream)));
    });

    peer.on('error', (err) => {
      console.error('Peer connection error:', err);
    });

    peer.on('close', () => {
      console.log('Peer connection closed:', socketId);
      setRemoteStreams(prev => {
        const newStreams = new Map(prev);
        newStreams.delete(socketId);
        return newStreams;
      });
    });

    if (offer) {
      peer.signal(offer);
    }

    peersRef.current.set(socketId, peer);
    setPeers(new Map(peersRef.current));
  }, [localStream, meetingId]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, [localStream]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, [localStream]);

  // Start screen sharing
  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      // Replace video track in all peer connections
      const videoTrack = screenStream.getVideoTracks()[0];
      
      peersRef.current.forEach((peer) => {
        const sender = peer._pc.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });

      // Update local stream
      const currentLocalStream = localStream;
      if (currentLocalStream) {
        const currentVideoTrack = currentLocalStream.getVideoTracks()[0];
        if (currentVideoTrack) {
          currentLocalStream.removeTrack(currentVideoTrack);
        }
        currentLocalStream.addTrack(videoTrack);
      }

      setIsScreenSharing(true);

      // Notify other participants
      if (socket) {
        socket.emit('start-screen-share', { meetingId, userId, userName });
      }

      // Handle screen share end
      videoTrack.onended = () => {
        stopScreenShare();
      };

    } catch (error) {
      console.error('Error starting screen share:', error);
    }
  }, [localStream, socket, meetingId, userId, userName]);

  // Stop screen sharing
  const stopScreenShare = useCallback(async () => {
    try {
      // Get camera stream again
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: false // Keep existing audio
      });

      const videoTrack = cameraStream.getVideoTracks()[0];

      // Replace video track in all peer connections
      peersRef.current.forEach((peer) => {
        const sender = peer._pc.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });

      // Update local stream
      if (localStream) {
        const currentVideoTrack = localStream.getVideoTracks()[0];
        if (currentVideoTrack) {
          localStream.removeTrack(currentVideoTrack);
        }
        localStream.addTrack(videoTrack);
      }

      setIsScreenSharing(false);

      // Notify other participants
      if (socket) {
        socket.emit('stop-screen-share', { meetingId, userId, userName });
      }

    } catch (error) {
      console.error('Error stopping screen share:', error);
    }
  }, [localStream, socket, meetingId, userId, userName]);

  // Send chat message
  const sendChatMessage = useCallback((message) => {
    if (socket && message.trim()) {
      socket.emit('meeting-chat', {
        meetingId,
        userId,
        userName,
        message: message.trim()
      });
      
      // Add to local messages
      setChatMessages(prev => [...prev, {
        userId,
        userName,
        message: message.trim(),
        timestamp: new Date()
      }]);
    }
  }, [socket, meetingId, userId, userName]);

  // Send audio transcript
  const sendTranscript = useCallback((text, confidence = 0) => {
    if (socket && text.trim()) {
      socket.emit('audio-transcript', {
        meetingId,
        userId,
        userName,
        text: text.trim(),
        confidence
      });
    }
  }, [socket, meetingId, userId, userName]);

  // Leave meeting
  const leaveMeeting = useCallback(() => {
    if (socket) {
      socket.emit('leave-meeting', { meetingId, userId, userName });
    }

    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    // Close all peer connections
    peersRef.current.forEach(peer => peer.destroy());
    peersRef.current.clear();

    // Clean up audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    setLocalStream(null);
    setRemoteStreams(new Map());
    setPeers(new Map());
    setParticipants([]);
  }, [socket, meetingId, userId, userName, localStream]);

  return {
    // State
    localStream,
    remoteStreams,
    peers,
    participants,
    chatMessages,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    isConnected,

    // Refs
    localVideoRef,

    // Actions
    initializeMedia,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    sendChatMessage,
    sendTranscript,
    leaveMeeting
  };
};
