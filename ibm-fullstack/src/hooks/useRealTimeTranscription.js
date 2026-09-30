/**
 * Real-time Meeting Transcription Hook
 * Manages Watson STT connection and transcript storage for meetings
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { WatsonSTTConnection } from '../lib/watsonSTT';

const useRealTimeTranscription = (meetingId, user, isAudioEnabled, localStream) => {
  // Transcription state
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcripts, setTranscripts] = useState([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [transcriptionError, setTranscriptionError] = useState(null);
  const [isSTTConnected, setIsSTTConnected] = useState(false);
  
  // Refs
  const sttConnectionRef = useRef(null);
  const transcriptsRef = useRef([]);
  
  // Socket ref for broadcasting transcripts
  const socketRef = useRef(null);

  /**
   * Initialize STT connection
   */
  const initializeSTT = useCallback(async () => {
    try {
      console.log('🎤 Initializing STT connection...');
      setTranscriptionError(null);
      
      const sttConnection = new WatsonSTTConnection({
        onTranscript: (transcriptData) => {
          const { transcript, confidence, isFinal, timestamp } = transcriptData;
          
          if (transcript) {
            if (isFinal) {
              // Final transcript - add to permanent collection
              const finalTranscript = {
                id: Date.now().toString(),
                userId: user?.userId || user?.id,
                userName: user?.name || user?.email || 'Unknown',
                text: transcript,
                confidence,
                timestamp,
                isFinal: true
              };
              
              setTranscripts(prev => {
                const updated = [...prev, finalTranscript];
                transcriptsRef.current = updated;
                return updated;
              });
              
              // Broadcast to other participants
              if (socketRef.current?.connected) {
                socketRef.current.emit('transcript', {
                  meetingId,
                  transcript: finalTranscript
                });
              }
              
              // Clear current transcript
              setCurrentTranscript('');
              
            } else {
              // Interim transcript - show in real-time
              setCurrentTranscript(transcript);
            }
          }
        },
        
        onError: (error) => {
          console.error('Watson STT Error:', error);
          const errorMessage = error.message || 'Speech recognition error';
          
          // Handle specific Watson STT errors
          if (errorMessage.includes('unable to transcode')) {
            setTranscriptionError('Audio format not supported. Please check your microphone settings.');
          } else if (errorMessage.includes('Session timed out')) {
            setTranscriptionError('Speech recognition session expired. Reconnecting...');
            // Auto-retry after timeout
            setTimeout(() => {
              if (!isTranscribing) {
                initializeSTT();
              }
            }, 3000);
          } else if (errorMessage.includes('authentication')) {
            setTranscriptionError('Watson STT authentication failed. Please check configuration.');
          } else {
            setTranscriptionError(errorMessage);
          }
          
          setIsSTTConnected(false);
        },
        
        onOpen: () => {
          console.log('✅ STT connected successfully');
          setIsSTTConnected(true);
          setTranscriptionError(null);
        },
        
        onClose: () => {
          console.log('🔌 STT connection closed');
          setIsSTTConnected(false);
        },
        
        config: {
          content_type: 'audio/l16;rate=16000;channels=1',
          interim_results: true,
          smart_formatting: true,
          timestamps: true,
          profanity_filter: false,
          inactivity_timeout: -1,
          word_confidence: true
        }
      });
      
      sttConnectionRef.current = sttConnection;
      await sttConnection.connect();
      
    } catch (error) {
      console.error('Failed to initialize STT:', error);
      setTranscriptionError(error.message);
    }
  }, [meetingId, user]);

  /**
   * Start transcription
   */
  const startTranscription = useCallback(async () => {
    if (!localStream || !isAudioEnabled) {
      console.warn('Cannot start transcription: no audio stream or audio disabled');
      return;
    }
    
    try {
      console.log('🎙️ Starting real-time transcription...');
      
      if (!sttConnectionRef.current || !isSTTConnected) {
        await initializeSTT();
      }
      
      if (sttConnectionRef.current) {
        await sttConnectionRef.current.startTranscription(localStream);
        setIsTranscribing(true);
        console.log('✅ Transcription started');
      }
      
    } catch (error) {
      console.error('Failed to start transcription:', error);
      setTranscriptionError(error.message);
    }
  }, [localStream, isAudioEnabled, isSTTConnected, initializeSTT]);

  /**
   * Stop transcription
   */
  const stopTranscription = useCallback(() => {
    console.log('🛑 Stopping transcription...');
    
    if (sttConnectionRef.current) {
      sttConnectionRef.current.stopTranscription();
    }
    
    setIsTranscribing(false);
    setCurrentTranscript('');
  }, []);

  /**
   * Handle incoming transcripts from other participants
   */
  const handleRemoteTranscript = useCallback((transcriptData) => {
    console.log('📝 Received remote transcript:', transcriptData);
    
    setTranscripts(prev => {
      const updated = [...prev, transcriptData.transcript];
      transcriptsRef.current = updated;
      return updated;
    });
  }, []);

  /**
   * Set socket reference for broadcasting
   */
  const setSocket = useCallback((socket) => {
    socketRef.current = socket;
    
    if (socket) {
      // Listen for transcripts from other participants
      socket.on('transcript', handleRemoteTranscript);
      
      // Clean up listener on socket change
      return () => {
        socket.off('transcript', handleRemoteTranscript);
      };
    }
  }, [handleRemoteTranscript]);

  /**
   * Generate meeting summary using AI (Backend API)
   */
  const generateMeetingSummary = useCallback(async () => {
    try {
      if (transcriptsRef.current.length === 0) {
        throw new Error('No transcripts available for summary');
      }
      
      console.log('🤖 Generating meeting summary via backend API...');
      
      const response = await fetch('/api/meetings/summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meetingId,
          transcripts: transcriptsRef.current,
          meetingTitle: `Meeting ${meetingId}`
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate summary');
      }
      
      const data = await response.json();
      console.log('✅ Meeting summary generated successfully');
      
      return {
        summary: data.summary,
        transcriptCount: data.transcriptCount,
        participants: data.participants,
        generatedAt: data.generatedAt,
        meetingId: data.meetingId
      };
      
    } catch (error) {
      console.error('❌ Failed to generate meeting summary:', error);
      throw error;
    }
  }, [meetingId]);

  /**
   * Export transcripts
   */
  const exportTranscripts = useCallback((format = 'json') => {
    const data = {
      meetingId,
      transcripts: transcriptsRef.current,
      exportedAt: new Date().toISOString(),
      participants: [...new Set(transcriptsRef.current.map(t => t.userName))]
    };
    
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { 
        type: 'application/json' 
      });
      return blob;
    }
    
    if (format === 'txt') {
      const textContent = transcriptsRef.current
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(t => {
          const time = new Date(t.timestamp).toLocaleTimeString();
          return `[${time}] ${t.userName}: ${t.text}`;
        })
        .join('\n');
      
      const blob = new Blob([textContent], { type: 'text/plain' });
      return blob;
    }
    
    return null;
  }, [meetingId]);

  /**
   * Clear all transcripts
   */
  const clearTranscripts = useCallback(() => {
    setTranscripts([]);
    transcriptsRef.current = [];
    setCurrentTranscript('');
  }, []);

  // Auto-start transcription when conditions are met
  useEffect(() => {
    if (localStream && isAudioEnabled && !isTranscribing) {
      // Auto-start transcription after a short delay
      const timer = setTimeout(() => {
        startTranscription();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [localStream, isAudioEnabled, isTranscribing, startTranscription]);

  // Auto-stop transcription when audio is disabled
  useEffect(() => {
    if (!isAudioEnabled && isTranscribing) {
      stopTranscription();
    }
  }, [isAudioEnabled, isTranscribing, stopTranscription]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sttConnectionRef.current) {
        sttConnectionRef.current.disconnect();
      }
    };
  }, []);

  return {
    // State
    isTranscribing,
    transcripts,
    currentTranscript,
    transcriptionError,
    isSTTConnected,
    
    // Actions
    startTranscription,
    stopTranscription,
    generateMeetingSummary,
    exportTranscripts,
    clearTranscripts,
    setSocket,
    
    // Utils
    transcriptCount: transcripts.length,
    participants: [...new Set(transcripts.map(t => t.userName))]
  };
};

export default useRealTimeTranscription;
