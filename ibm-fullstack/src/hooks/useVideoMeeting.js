'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import SimplePeer from 'simple-peer';

const useVideoMeeting = (meetingId, user) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [participants, setParticipants] = useState([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [transcripts, setTranscripts] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [meetingStarted, setMeetingStarted] = useState(false);
  const [error, setError] = useState(null);

  const socketRef = useRef(null);
  const peersRef = useRef(new Map());
  const localVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const transcriptionIntervalRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    if (!meetingId || !user) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';
    
    socketRef.current = io(socketUrl, {
      transports: ['websocket', 'polling']
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected to signaling server');
      socket.emit('join-meeting', {
        meetingId,
        userId: user.userId,
        userName: user.name || user.email,
        email: user.email
      });
    });

    socket.on('meeting-participants', (currentParticipants) => {
      console.log('Current participants:', currentParticipants);
      setParticipants(currentParticipants);
    });

    socket.on('user-joined-meeting', (newParticipant) => {
      console.log('New participant joined:', newParticipant);
      setParticipants(prev => [...prev, newParticipant]);
      
      // Initiate WebRTC connection as caller
      if (localStream) {
        createPeerConnection(newParticipant.socketId, true);
      }
    });

    socket.on('user-left-meeting', (leftParticipant) => {
      console.log('Participant left:', leftParticipant);
      setParticipants(prev => prev.filter(p => p.socketId !== leftParticipant.socketId));
      
      // Clean up peer connection
      const peer = peersRef.current.get(leftParticipant.socketId);
      if (peer) {
        peer.destroy();
        peersRef.current.delete(leftParticipant.socketId);
      }
      
      // Remove remote stream
      setRemoteStreams(prev => {
        const newStreams = new Map(prev);
        newStreams.delete(leftParticipant.socketId);
        return newStreams;
      });
    });

    // WebRTC signaling handlers
    socket.on('webrtc-offer', async ({ offer, senderSocketId }) => {
      console.log('Received offer from:', senderSocketId);
      await createPeerConnection(senderSocketId, false, offer);
    });

    socket.on('webrtc-answer', ({ answer, senderSocketId }) => {
      console.log('Received answer from:', senderSocketId);
      const peer = peersRef.current.get(senderSocketId);
      if (peer) {
        peer.signal(answer);
      }
    });

    socket.on('webrtc-ice-candidate', ({ candidate, senderSocketId }) => {
      console.log('Received ICE candidate from:', senderSocketId);
      const peer = peersRef.current.get(senderSocketId);
      if (peer) {
        peer.signal(candidate);
      }
    });

    // Transcript handlers
    socket.on('new-transcript', (transcriptEntry) => {
      setTranscripts(prev => [...prev, transcriptEntry]);
    });

    return () => {
      if (socket.connected) {
        socket.emit('leave-meeting', { meetingId, userId: user.userId });
        socket.disconnect();
      }
    };
  }, [meetingId, user]);

  // Create peer connection for WebRTC
  const createPeerConnection = useCallback(async (socketId, isInitiator, incomingOffer = null) => {
    try {
      const peer = new SimplePeer({
        initiator: isInitiator,
        trickle: false,
        stream: localStream
      });

      peersRef.current.set(socketId, peer);

      peer.on('signal', (data) => {
        if (data.type === 'offer') {
          socketRef.current.emit('webrtc-offer', {
            offer: data,
            targetSocketId: socketId
          });
        } else if (data.type === 'answer') {
          socketRef.current.emit('webrtc-answer', {
            answer: data,
            targetSocketId: socketId
          });
        } else {
          socketRef.current.emit('webrtc-ice-candidate', {
            candidate: data,
            targetSocketId: socketId
          });
        }
      });

      peer.on('stream', (remoteStream) => {
        console.log('Received remote stream from:', socketId);
        setRemoteStreams(prev => {
          const newStreams = new Map(prev);
          newStreams.set(socketId, remoteStream);
          return newStreams;
        });
      });

      peer.on('error', (err) => {
        console.error('Peer connection error:', err);
        setError(`Connection error with participant: ${err.message}`);
      });

      peer.on('close', () => {
        console.log('Peer connection closed:', socketId);
        peersRef.current.delete(socketId);
        setRemoteStreams(prev => {
          const newStreams = new Map(prev);
          newStreams.delete(socketId);
          return newStreams;
        });
      });

      // If we received an offer, signal it to the peer
      if (incomingOffer) {
        peer.signal(incomingOffer);
      }

    } catch (error) {
      console.error('Error creating peer connection:', error);
      setError(`Failed to create connection: ${error.message}`);
    }
  }, [localStream]);

  // Initialize local media stream
  const initializeMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });

      setLocalStream(stream);
      setMeetingStarted(true);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Start audio recording for transcription
      startAudioRecording(stream);

      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      setError('Unable to access camera/microphone. Please check permissions.');
      throw error;
    }
  }, []);

  // Start audio recording for real-time transcription
  const startAudioRecording = useCallback((stream) => {
    try {
      const audioStream = new MediaStream([stream.getAudioTracks()[0]]);
      mediaRecorderRef.current = new MediaRecorder(audioStream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          await sendAudioForTranscription(audioBlob);
          audioChunksRef.current = [];
        }
      };

      // Record in chunks for real-time transcription
      const recordInterval = setInterval(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          setTimeout(() => {
            if (mediaRecorderRef.current && isAudioEnabled && meetingStarted) {
              mediaRecorderRef.current.start();
            }
          }, 100);
        }
      }, 3000); // Send audio every 3 seconds

      transcriptionIntervalRef.current = recordInterval;
      
      if (isAudioEnabled) {
        mediaRecorderRef.current.start();
        setIsRecording(true);
      }

    } catch (error) {
      console.error('Error starting audio recording:', error);
    }
  }, [isAudioEnabled, meetingStarted]);

  // Send audio to Watson STT API
  const sendAudioForTranscription = useCallback(async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');

      const response = await fetch('/api/stt', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.transcript) {
        const transcriptEntry = {
          speakerName: user.name || user.email,
          transcript: result.transcript,
          timestamp: new Date(),
          confidence: result.confidence,
          socketId: socketRef.current?.id
        };

        // Emit transcript to other participants
        socketRef.current?.emit('transcript-result', {
          meetingId,
          ...transcriptEntry
        });

        // Add to local transcripts
        setTranscripts(prev => [...prev, transcriptEntry]);
      }
    } catch (error) {
      console.error('Error transcribing audio:', error);
    }
  }, [meetingId, user]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);

        // Control audio recording based on audio state
        if (audioTrack.enabled && !isRecording) {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
            mediaRecorderRef.current.start();
            setIsRecording(true);
          }
        } else if (!audioTrack.enabled && isRecording) {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
          }
        }

        socketRef.current?.emit('toggle-audio', {
          meetingId,
          isEnabled: audioTrack.enabled
        });
      }
    }
  }, [localStream, isRecording, meetingId]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);

        socketRef.current?.emit('toggle-video', {
          meetingId,
          isEnabled: videoTrack.enabled
        });
      }
    }
  }, [localStream, meetingId]);

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
        const sender = peer._pc?.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });

      // Update local stream
      const newStream = new MediaStream([
        videoTrack,
        ...localStream.getAudioTracks()
      ]);
      setLocalStream(newStream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream;
      }

      setIsScreenSharing(true);

      videoTrack.onended = () => {
        stopScreenShare();
      };

    } catch (error) {
      console.error('Error starting screen share:', error);
      setError('Failed to start screen sharing');
    }
  }, [localStream]);

  // Stop screen sharing
  const stopScreenShare = useCallback(async () => {
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      const videoTrack = videoStream.getVideoTracks()[0];

      // Replace screen share track with camera track
      peersRef.current.forEach((peer) => {
        const sender = peer._pc?.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });

      // Update local stream
      const newStream = new MediaStream([
        videoTrack,
        ...localStream.getAudioTracks()
      ]);
      setLocalStream(newStream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream;
      }

      setIsScreenSharing(false);

    } catch (error) {
      console.error('Error stopping screen share:', error);
    }
  }, [localStream]);

  // Leave meeting
  const leaveMeeting = useCallback(() => {
    // Stop all media tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    // Close all peer connections
    peersRef.current.forEach(peer => peer.destroy());
    peersRef.current.clear();

    // Stop audio recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    if (transcriptionIntervalRef.current) {
      clearInterval(transcriptionIntervalRef.current);
    }

    // Notify server
    if (socketRef.current) {
      socketRef.current.emit('leave-meeting', {
        meetingId,
        userId: user.userId
      });
      socketRef.current.disconnect();
    }

    // Reset states
    setLocalStream(null);
    setRemoteStreams(new Map());
    setParticipants([]);
    setMeetingStarted(false);
    setIsRecording(false);
    setError(null);
  }, [localStream, meetingId, user]);

  // Generate meeting summary when meeting ends
  const generateMeetingSummary = useCallback(async () => {
    if (transcripts.length === 0) return null;

    try {
      const response = await fetch('/api/meetings/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          meetingId,
          transcripts
        })
      });

      const result = await response.json();
      return result.summary;
    } catch (error) {
      console.error('Error generating meeting summary:', error);
      return null;
    }
  }, [meetingId, transcripts]);

  return {
    // State
    localStream,
    remoteStreams,
    participants,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    transcripts,
    isRecording,
    meetingStarted,
    error,
    localVideoRef,

    // Actions
    initializeMedia,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    leaveMeeting,
    generateMeetingSummary,
    setError
  };
};

export default useVideoMeeting;
