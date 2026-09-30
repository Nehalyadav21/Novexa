'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import io from 'socket.io-client';

/**
 * Custom hook for Agora video meeting with real-time transcription
 * Integrates Agora Web SDK with IBM Watsonx STT for live captions
 */
const useAgoraVideoMeeting = (meetingId, user, agoraConfig) => {
  // Agora client and tracks
  const [client, setClient] = useState(null);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState(new Map());
  
  // Meeting state
  const [isJoined, setIsJoined] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participants, setParticipants] = useState([]);
  
  // Transcription state
  const [transcripts, setTranscripts] = useState([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [socket, setSocket] = useState(null);
  
  // Audio processing for STT
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const processorRef = useRef(null);
  const audioChunksRef = useRef([]);
  
  // Error handling
  const [error, setError] = useState(null);
  
  // WebSocket connection for audio streaming
  useEffect(() => {
    if (meetingId && user) {
      const socketConnection = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
        query: { meetingId, userId: user.userId, userName: user.name || user.email },
        transports: ['websocket', 'polling']
      });
      
      socketConnection.on('connect', () => {
        console.log('Socket connected for transcription');
      });
      
      socketConnection.on('transcript-update', (data) => {
        setTranscripts(prev => [...prev, {
          id: Date.now(),
          speakerName: data.speakerName,
          transcript: data.transcript,
          confidence: data.confidence,
          timestamp: new Date(data.timestamp)
        }]);
      });
      
      socketConnection.on('participant-joined', (participant) => {
        setParticipants(prev => [...prev.filter(p => p.uid !== participant.uid), participant]);
      });
      
      socketConnection.on('participant-left', (participantUid) => {
        setParticipants(prev => prev.filter(p => p.uid !== participantUid));
      });
      
      setSocket(socketConnection);
      
      return () => {
        socketConnection.disconnect();
      };
    }
  }, [meetingId, user]);

  /**
   * Initialize Agora client and join channel
   */
  const initializeAndJoin = useCallback(async () => {
    try {
      // Create Agora client
      const agoraClient = AgoraRTC.createClient({ 
        mode: 'rtc', 
        codec: 'vp8' 
      });
      
      // Set up event handlers
      agoraClient.on('user-published', async (agoraUser, mediaType) => {
        await agoraClient.subscribe(agoraUser, mediaType);
        
        if (mediaType === 'video') {
          setRemoteUsers(prev => {
            const updated = new Map(prev);
            updated.set(agoraUser.uid, { 
              ...updated.get(agoraUser.uid), 
              videoTrack: agoraUser.videoTrack,
              hasVideo: true
            });
            return updated;
          });
        }
        
        if (mediaType === 'audio') {
          agoraUser.audioTrack.play();
          setRemoteUsers(prev => {
            const updated = new Map(prev);
            updated.set(agoraUser.uid, { 
              ...updated.get(agoraUser.uid), 
              audioTrack: agoraUser.audioTrack,
              hasAudio: true
            });
            return updated;
          });
        }
      });
      
      agoraClient.on('user-unpublished', (agoraUser, mediaType) => {
        if (mediaType === 'video') {
          setRemoteUsers(prev => {
            const updated = new Map(prev);
            const user = updated.get(agoraUser.uid);
            if (user) {
              updated.set(agoraUser.uid, { ...user, videoTrack: null, hasVideo: false });
            }
            return updated;
          });
        }
        
        if (mediaType === 'audio') {
          setRemoteUsers(prev => {
            const updated = new Map(prev);
            const user = updated.get(agoraUser.uid);
            if (user) {
              updated.set(agoraUser.uid, { ...user, audioTrack: null, hasAudio: false });
            }
            return updated;
          });
        }
      });
      
      agoraClient.on('user-joined', (agoraUser) => {
        setRemoteUsers(prev => {
          const updated = new Map(prev);
          updated.set(agoraUser.uid, {
            uid: agoraUser.uid,
            videoTrack: null,
            audioTrack: null,
            hasVideo: false,
            hasAudio: false
          });
          return updated;
        });
        
        // Notify backend about new participant
        if (socket) {
          socket.emit('participant-joined', {
            uid: agoraUser.uid,
            meetingId,
            userName: `User ${agoraUser.uid}` // In real app, get from participant mapping
          });
        }
      });
      
      agoraClient.on('user-left', (agoraUser) => {
        setRemoteUsers(prev => {
          const updated = new Map(prev);
          updated.delete(agoraUser.uid);
          return updated;
        });
        
        // Notify backend about participant leaving
        if (socket) {
          socket.emit('participant-left', {
            uid: agoraUser.uid,
            meetingId
          });
        }
      });
      
      // Join channel with token
      const uid = await agoraClient.join(
        agoraConfig.appId,
        meetingId,
        agoraConfig.token || null, // Use null for testing, generate token for production
        user.userId
      );
      
      console.log('Joined Agora channel with UID:', uid);
      
      // Create local tracks
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
      
      // Publish tracks
      await agoraClient.publish([audioTrack, videoTrack]);
      
      setClient(agoraClient);
      setLocalAudioTrack(audioTrack);
      setLocalVideoTrack(videoTrack);
      setIsJoined(true);
      
      // Start audio processing for STT
      await startAudioProcessing(audioTrack);
      
      // Notify backend about joining
      if (socket) {
        socket.emit('participant-joined', {
          uid: uid,
          meetingId,
          userName: user.name || user.email
        });
      }
      
    } catch (error) {
      console.error('Failed to initialize Agora:', error);
      setError(`Failed to join meeting: ${error.message}`);
    }
  }, [agoraConfig, meetingId, user, socket]);

  /**
   * Start audio processing for real-time transcription
   */
  const startAudioProcessing = useCallback(async (audioTrack) => {
    try {
      // Get MediaStream from Agora audio track
      const mediaStream = audioTrack.getMediaStreamTrack();
      const stream = new MediaStream([mediaStream]);
      
      // Create Web Audio API context
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      
      // Create script processor for audio chunks
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (event) => {
        if (!isTranscribing) return;
        
        const inputData = event.inputBuffer.getChannelData(0);
        const audioChunk = new Float32Array(inputData);
        
        // Convert to 16-bit PCM
        const pcmData = new Int16Array(audioChunk.length);
        for (let i = 0; i < audioChunk.length; i++) {
          pcmData[i] = Math.max(-32768, Math.min(32767, audioChunk[i] * 32768));
        }
        
        // Send audio chunk to backend via WebSocket
        if (socket && socket.connected) {
          socket.emit('audio-chunk', {
            meetingId,
            participantId: user.userId,
            participantName: user.name || user.email,
            audioData: Array.from(pcmData),
            timestamp: Date.now()
          });
        }
      };
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      audioContextRef.current = audioContext;
      mediaStreamRef.current = stream;
      processorRef.current = processor;
      
      setIsTranscribing(true);
      
    } catch (error) {
      console.error('Failed to start audio processing:', error);
    }
  }, [socket, meetingId, user, isTranscribing]);

  /**
   * Stop audio processing
   */
  const stopAudioProcessing = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setIsTranscribing(false);
  }, []);

  /**
   * Toggle microphone on/off
   */
  const toggleAudio = useCallback(async () => {
    if (localAudioTrack) {
      await localAudioTrack.setEnabled(!isAudioEnabled);
      setIsAudioEnabled(!isAudioEnabled);
      
      // Also control transcription
      if (!isAudioEnabled) {
        setIsTranscribing(true);
      } else {
        setIsTranscribing(false);
      }
    }
  }, [localAudioTrack, isAudioEnabled]);

  /**
   * Toggle camera on/off
   */
  const toggleVideo = useCallback(async () => {
    if (localVideoTrack) {
      await localVideoTrack.setEnabled(!isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
    }
  }, [localVideoTrack, isVideoEnabled]);

  /**
   * Start screen sharing
   */
  const startScreenShare = useCallback(async () => {
    try {
      if (client && localVideoTrack) {
        // Stop camera
        await client.unpublish(localVideoTrack);
        localVideoTrack.stop();
        localVideoTrack.close();
        
        // Create screen track
        const screenTrack = await AgoraRTC.createScreenVideoTrack();
        await client.publish(screenTrack);
        
        setLocalVideoTrack(screenTrack);
        setIsScreenSharing(true);
        
        // Handle screen share end
        screenTrack.on('track-ended', async () => {
          await stopScreenShare();
        });
      }
    } catch (error) {
      console.error('Failed to start screen share:', error);
      setError('Failed to start screen sharing');
    }
  }, [client, localVideoTrack]);

  /**
   * Stop screen sharing
   */
  const stopScreenShare = useCallback(async () => {
    try {
      if (client && localVideoTrack && isScreenSharing) {
        // Stop screen track
        await client.unpublish(localVideoTrack);
        localVideoTrack.stop();
        localVideoTrack.close();
        
        // Create new camera track
        const cameraTrack = await AgoraRTC.createCameraVideoTrack();
        await client.publish(cameraTrack);
        
        setLocalVideoTrack(cameraTrack);
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error('Failed to stop screen share:', error);
    }
  }, [client, localVideoTrack, isScreenSharing]);

  /**
   * Leave meeting and cleanup
   */
  const leaveMeeting = useCallback(async () => {
    try {
      // Stop audio processing
      stopAudioProcessing();
      
      // Clean up tracks
      if (localAudioTrack) {
        localAudioTrack.stop();
        localAudioTrack.close();
      }
      if (localVideoTrack) {
        localVideoTrack.stop();
        localVideoTrack.close();
      }
      
      // Leave channel
      if (client) {
        await client.leave();
      }
      
      // Disconnect socket
      if (socket) {
        socket.emit('participant-left', {
          uid: user.userId,
          meetingId
        });
        socket.disconnect();
      }
      
      // Reset state
      setIsJoined(false);
      setClient(null);
      setLocalAudioTrack(null);
      setLocalVideoTrack(null);
      setRemoteUsers(new Map());
      setParticipants([]);
      
    } catch (error) {
      console.error('Error leaving meeting:', error);
    }
  }, [client, localAudioTrack, localVideoTrack, socket, stopAudioProcessing, user, meetingId]);

  /**
   * Generate meeting summary using IBM Watsonx
   */
  const generateMeetingSummary = useCallback(async () => {
    try {
      const response = await fetch('/api/meetings/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId,
          transcripts: transcripts.map(t => ({
            speaker: t.speakerName,
            text: t.transcript,
            timestamp: t.timestamp
          }))
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.summary;
      } else {
        throw new Error('Failed to generate summary');
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      return null;
    }
  }, [meetingId, transcripts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveMeeting();
    };
  }, [leaveMeeting]);

  return {
    // Agora state
    client,
    localAudioTrack,
    localVideoTrack,
    remoteUsers,
    isJoined,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    
    // Meeting state
    participants,
    transcripts,
    isTranscribing,
    error,
    
    // Actions
    initializeAndJoin,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    leaveMeeting,
    generateMeetingSummary,
    
    // Utils
    setError
  };
};

export default useAgoraVideoMeeting;
