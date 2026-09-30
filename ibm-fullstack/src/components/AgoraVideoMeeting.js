'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  FiMic,
  FiMicOff,
  FiVideo,
  FiVideoOff,
  FiMonitor,
  FiPhone,
  FiUsers,
  FiMessageSquare,
  FiCopy,
  FiSettings
} from 'react-icons/fi';
import useAgoraVideoMeeting from '../hooks/useAgoraVideoMeeting';

/**
 * Agora Video Meeting Component with Real-time Transcription
 * Uses Agora Web SDK for video calling and IBM Watsonx for STT
 */
const AgoraVideoMeeting = ({ meetingId, user, onLeaveMeeting, agoraConfig }) => {
  const {
    client,
    localAudioTrack,
    localVideoTrack,
    remoteUsers,
    isJoined,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    participants,
    transcripts,
    isTranscribing,
    error,
    initializeAndJoin,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    leaveMeeting,
    generateMeetingSummary,
    setError
  } = useAgoraVideoMeeting(meetingId, user, agoraConfig);

  // UI state
  const [showParticipants, setShowParticipants] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [meetingDuration, setMeetingDuration] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  // Video refs
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef(new Map());

  /**
   * Show toast notification
   */
  const showToast = (message, type = 'success') => {
    const notification = {
      id: Date.now(),
      message,
      type
    };
    setNotifications(prev => [...prev, notification]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  /**
   * Initialize meeting when component mounts
   */
  useEffect(() => {
    const initMeeting = async () => {
      if (!agoraConfig?.appId) {
        setError('Agora App ID is required. Please check your configuration.');
        return;
      }
      
      setIsInitializing(true);
      try {
        await initializeAndJoin();
        showToast('Successfully joined the meeting');
      } catch (error) {
        console.error('Failed to initialize meeting:', error);
        showToast(`Failed to join meeting: ${error.message}`, 'error');
      } finally {
        setIsInitializing(false);
      }
    };

    if (meetingId && user && !isJoined) {
      initMeeting();
    }
  }, [meetingId, user, isJoined, agoraConfig, initializeAndJoin]);

  /**
   * Track meeting duration
   */
  useEffect(() => {
    let interval;
    if (isJoined) {
      interval = setInterval(() => {
        setMeetingDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isJoined]);

  /**
   * Auto-hide controls
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [showControls]);

  /**
   * Play local video track
   */
  useEffect(() => {
    if (localVideoTrack && localVideoRef.current) {
      localVideoTrack.play(localVideoRef.current);
    }
  }, [localVideoTrack]);

  /**
   * Play remote video tracks
   */
  useEffect(() => {
    remoteUsers.forEach((user, uid) => {
      if (user.videoTrack && user.hasVideo) {
        const videoElement = remoteVideoRefs.current.get(uid);
        if (videoElement) {
          user.videoTrack.play(videoElement);
        }
      }
    });
  }, [remoteUsers]);

  /**
   * Format duration
   */
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Handle leaving meeting with summary
   */
  const handleLeaveMeeting = async () => {
    try {
      setIsInitializing(true);
      
      // Generate summary before leaving
      const summary = await generateMeetingSummary();
      
      // Leave the meeting
      await leaveMeeting();
      
      // Notify parent component
      if (onLeaveMeeting) {
        onLeaveMeeting(summary);
      }
    } catch (error) {
      console.error('Error leaving meeting:', error);
      await leaveMeeting();
      if (onLeaveMeeting) {
        onLeaveMeeting(null);
      }
    } finally {
      setIsInitializing(false);
    }
  };

  /**
   * Copy meeting ID
   */
  const copyMeetingId = () => {
    navigator.clipboard.writeText(meetingId);
    showToast('Meeting ID copied to clipboard');
  };

  /**
   * Remote Video Component
   */
  const RemoteVideo = ({ uid, user: remoteUser }) => {
    const videoRef = useRef(null);
    
    useEffect(() => {
      remoteVideoRefs.current.set(uid, videoRef.current);
      return () => {
        remoteVideoRefs.current.delete(uid);
      };
    }, [uid]);

    const participant = participants.find(p => p.uid === uid);

    return (
      <div className="relative bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-600">
        <div 
          ref={videoRef}
          className="w-full h-full bg-gray-800 flex items-center justify-center"
        >
          {!remoteUser?.hasVideo && (
            <div className="text-white text-center">
              <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl font-bold">
                  {(participant?.userName || `User ${uid}`).charAt(0).toUpperCase()}
                </span>
              </div>
              <p className="text-sm">{participant?.userName || `User ${uid}`}</p>
            </div>
          )}
        </div>
        
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm">
          {participant?.userName || `User ${uid}`}
          {!remoteUser?.hasAudio && (
            <FiMicOff className="inline ml-1 text-red-400" />
          )}
        </div>
      </div>
    );
  };

  // Loading state
  if (isInitializing) {
    return (
      <div className="h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
          <p className="mt-4 text-lg">
            {isJoined ? 'Leaving meeting...' : 'Joining meeting...'}
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Initializing Agora Web SDK...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="bg-red-900 border border-red-700 text-white p-6 rounded-lg max-w-md">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="ml-3 text-xl font-bold">Meeting Error</h2>
          </div>
          <p className="mb-4">{error}</p>
          <div className="flex space-x-3">
            <button
              onClick={() => setError(null)}
              className="bg-red-700 hover:bg-red-800 px-4 py-2 rounded"
            >
              Retry
            </button>
            <button
              onClick={() => onLeaveMeeting && onLeaveMeeting(null)}
              className="bg-gray-700 hover:bg-gray-800 px-4 py-2 rounded"
            >
              Exit
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="h-screen bg-gray-900 text-white relative overflow-hidden"
      onMouseMove={() => setShowControls(true)}
    >
      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg shadow-lg transition-all ${
              notification.type === 'error' 
                ? 'bg-red-900 border border-red-700 text-red-100' 
                : 'bg-green-900 border border-green-700 text-green-100'
            }`}
          >
            {notification.message}
          </div>
        ))}
      </div>

      {/* Meeting Header */}
      <div 
        className={`absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-black bg-opacity-50 z-10 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center space-x-4">
          <span className="text-lg font-bold">Agora Meeting</span>
          <span className="bg-green-600 px-3 py-1 rounded-full text-sm">
            {formatDuration(meetingDuration)}
          </span>
          {isTranscribing && (
            <div className="bg-red-600 px-3 py-1 rounded-full text-sm flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-300 rounded-full animate-pulse"></div>
              <span>Live Transcription</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={copyMeetingId}
            className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded transition-colors"
            title="Copy Meeting ID"
          >
            <FiCopy />
          </button>
          <span className="text-sm opacity-80 font-mono">
            ID: {meetingId.slice(-8)}
          </span>
        </div>
      </div>

      {/* Video Grid */}
      <div className="h-full pt-16 pb-20">
        {remoteUsers.size === 0 ? (
          // Solo view - just local user
          <div className="h-full flex items-center justify-center">
            <div className="relative w-4/5 max-w-4xl aspect-video bg-gray-800 rounded-lg overflow-hidden border-2 border-blue-500">
              <div 
                ref={localVideoRef}
                className="w-full h-full bg-gray-900 flex items-center justify-center"
              >
                {!isVideoEnabled && (
                  <div className="text-white text-center">
                    <div className="w-24 h-24 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-4xl font-bold">
                        {(user.name || user.email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xl">{user.name || user.email}</p>
                    <p className="text-sm text-gray-400">Camera is off</p>
                  </div>
                )}
              </div>
              <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 px-3 py-2 rounded">
                <span className="font-semibold">{user.name || user.email} (You)</span>
                {!isAudioEnabled && (
                  <FiMicOff className="inline ml-2 text-red-400" />
                )}
              </div>
            </div>
          </div>
        ) : (
          // Grid view with multiple participants
          <div 
            className={`h-full grid gap-4 p-4 ${
              remoteUsers.size === 1 ? 'grid-cols-2' :
              remoteUsers.size <= 4 ? 'grid-cols-2 grid-rows-2' :
              remoteUsers.size <= 9 ? 'grid-cols-3 grid-rows-3' :
              'grid-cols-4 grid-rows-3'
            }`}
          >
            {/* Local video */}
            <div className="relative bg-gray-800 rounded-lg overflow-hidden border-2 border-blue-500">
              <div 
                ref={localVideoRef}
                className="w-full h-full bg-gray-900 flex items-center justify-center"
              >
                {!isVideoEnabled && (
                  <div className="text-white text-center">
                    <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-lg font-bold">
                        {(user.name || user.email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm">{user.name || user.email}</p>
                  </div>
                )}
              </div>
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 px-2 py-1 rounded text-sm">
                {user.name || user.email} (You)
                {!isAudioEnabled && (
                  <FiMicOff className="inline ml-1 text-red-400" />
                )}
              </div>
            </div>

            {/* Remote videos */}
            {Array.from(remoteUsers.entries()).map(([uid, remoteUser]) => (
              <RemoteVideo
                key={uid}
                uid={uid}
                user={remoteUser}
              />
            ))}
          </div>
        )}
      </div>

      {/* Meeting Controls */}
      <div 
        className={`absolute bottom-0 left-0 right-0 p-6 flex justify-center bg-black bg-opacity-50 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center space-x-4">
          {/* Audio toggle */}
          <button
            onClick={toggleAudio}
            className={`p-4 rounded-full transition-all transform hover:scale-105 ${
              isAudioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
            }`}
            title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
          >
            {isAudioEnabled ? <FiMic size={20} /> : <FiMicOff size={20} />}
          </button>

          {/* Video toggle */}
          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full transition-all transform hover:scale-105 ${
              isVideoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
            }`}
            title={isVideoEnabled ? 'Stop camera' : 'Start camera'}
          >
            {isVideoEnabled ? <FiVideo size={20} /> : <FiVideoOff size={20} />}
          </button>

          {/* Screen share */}
          <button
            onClick={isScreenSharing ? stopScreenShare : startScreenShare}
            className={`p-4 rounded-full transition-all transform hover:scale-105 ${
              isScreenSharing ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title={isScreenSharing ? 'Stop screen sharing' : 'Share screen'}
          >
            <FiMonitor size={20} />
          </button>

          {/* Participants */}
          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-all transform hover:scale-105 relative"
            title="View participants"
          >
            <FiUsers size={20} />
            {participants.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-xs rounded-full w-6 h-6 flex items-center justify-center">
                {participants.length + 1}
              </span>
            )}
          </button>

          {/* Transcript */}
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-all transform hover:scale-105 relative"
            title="View live transcript"
          >
            <FiMessageSquare size={20} />
            {transcripts.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-green-600 text-xs rounded-full w-6 h-6 flex items-center justify-center">
                {transcripts.length}
              </span>
            )}
          </button>

          {/* Leave meeting */}
          <button
            onClick={handleLeaveMeeting}
            className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-all transform hover:scale-105"
            title="Leave meeting"
          >
            <FiPhone size={20} className="transform rotate-[135deg]" />
          </button>
        </div>
      </div>

      {/* Participants Sidebar */}
      {showParticipants && (
        <div className="absolute top-0 right-0 w-80 h-full bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto z-20">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              Participants ({participants.length + 1})
            </h3>
            <button
              onClick={() => setShowParticipants(false)}
              className="text-gray-400 hover:text-white text-xl"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-3">
            {/* Current user */}
            <div className="flex items-center p-3 bg-blue-900 rounded-lg">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                <span className="font-bold">
                  {(user.name || user.email).charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-semibold">{user.name || user.email}</p>
                <p className="text-sm text-blue-300">You (Host)</p>
              </div>
              <div className="flex flex-col space-y-1">
                <span className={`px-2 py-1 text-xs rounded ${
                  isAudioEnabled ? 'bg-green-600' : 'bg-red-600'
                }`}>
                  {isAudioEnabled ? '🎤' : '🔇'}
                </span>
                <span className={`px-2 py-1 text-xs rounded ${
                  isVideoEnabled ? 'bg-green-600' : 'bg-red-600'
                }`}>
                  {isVideoEnabled ? '📹' : '📷'}
                </span>
              </div>
            </div>

            {/* Remote participants */}
            {participants.map((participant) => {
              const remoteUser = remoteUsers.get(participant.uid);
              return (
                <div key={participant.uid} className="flex items-center p-3 bg-gray-700 rounded-lg">
                  <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center mr-3">
                    <span className="font-bold">
                      {(participant.userName || participant.name || participant.email || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{participant.userName}</p>
                    <p className="text-sm text-gray-400">Participant</p>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className={`px-2 py-1 text-xs rounded ${
                      remoteUser?.hasAudio ? 'bg-green-600' : 'bg-red-600'
                    }`}>
                      {remoteUser?.hasAudio ? '🎤' : '🔇'}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded ${
                      remoteUser?.hasVideo ? 'bg-green-600' : 'bg-red-600'
                    }`}>
                      {remoteUser?.hasVideo ? '📹' : '📷'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transcript Sidebar */}
      {showTranscript && (
        <div className="absolute top-0 right-0 w-96 h-full bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto z-20">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-semibold">Live Transcript</h3>
              {isTranscribing && (
                <span className="bg-red-600 px-2 py-1 rounded text-xs animate-pulse">
                  Recording
                </span>
              )}
            </div>
            <button
              onClick={() => setShowTranscript(false)}
              className="text-gray-400 hover:text-white text-xl"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-3 h-full pb-20">
            {transcripts.length === 0 ? (
              <div className="text-center text-gray-400 mt-8">
                <FiMessageSquare size={48} className="mx-auto mb-4 opacity-50" />
                <p className="mb-2">No transcripts yet</p>
                <p className="text-sm">Start speaking to see live captions powered by IBM Watsonx</p>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto">
                {transcripts.map((transcript, index) => (
                  <div key={transcript.id} className="p-3 bg-gray-700 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-sm text-blue-300">
                        {transcript.speakerName}
                      </span>
                      <span className="text-xs text-gray-400">
                        {transcript.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed">{transcript.transcript}</p>
                    {transcript.confidence && (
                      <div className="mt-2 flex items-center">
                        <div className="flex-1 bg-gray-600 rounded-full h-1">
                          <div 
                            className="bg-green-500 h-1 rounded-full"
                            style={{ width: `${transcript.confidence * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500 ml-2">
                          {Math.round(transcript.confidence * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AgoraVideoMeeting;
