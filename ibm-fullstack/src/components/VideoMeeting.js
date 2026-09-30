'use client';

import React, { useEffect, useState } from 'react';
import {
  FiMic,
  FiMicOff,
  FiVideo,
  FiVideoOff,
  FiMonitor,
  FiPhone,
  FiUsers,
  FiMessageSquare,
  FiCopy
} from 'react-icons/fi';
import useVideoMeeting from '../hooks/useVideoMeeting';

const VideoMeeting = ({ meetingId, user, onLeaveMeeting }) => {
  const {
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
    initializeMedia,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    leaveMeeting,
    generateMeetingSummary,
    setError
  } = useVideoMeeting(meetingId, user);

  const [showParticipants, setShowParticipants] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [meetingDuration, setMeetingDuration] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);
  const [notifications, setNotifications] = useState([]);

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

  // Initialize meeting when component mounts
  useEffect(() => {
    const initMeeting = async () => {
      setIsInitializing(true);
      try {
        await initializeMedia();
      } catch (error) {
        console.error('Failed to initialize meeting:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    if (meetingId && user && !meetingStarted) {
      initMeeting();
    }
  }, [meetingId, user, meetingStarted, initializeMedia]);

  // Track meeting duration
  useEffect(() => {
    let interval;
    if (meetingStarted) {
      interval = setInterval(() => {
        setMeetingDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [meetingStarted]);

  // Auto-hide controls
  useEffect(() => {
    const timer = setTimeout(() => {
      if (showControls) {
        setShowControls(false);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [showControls]);

  // Format duration
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle leaving meeting
  const handleLeaveMeeting = async () => {
    try {
      // Generate summary before leaving
      const summary = await generateMeetingSummary();
      
      // Leave the meeting
      leaveMeeting();
      
      // Notify parent component
      if (onLeaveMeeting) {
        onLeaveMeeting(summary);
      }
    } catch (error) {
      console.error('Error leaving meeting:', error);
      leaveMeeting();
      if (onLeaveMeeting) {
        onLeaveMeeting(null);
      }
    }
  };

  // Copy meeting ID
  const copyMeetingId = () => {
    navigator.clipboard.writeText(meetingId);
    showToast('Meeting ID copied');
  };

  // Render remote video
  const RemoteVideo = ({ streamData, socketId }) => {
    const videoRef = React.useRef();
    
    useEffect(() => {
      if (videoRef.current && streamData) {
        videoRef.current.srcObject = streamData;
      }
    }, [streamData]);

    const participant = participants.find(p => p.socketId === socketId);

    return (
      <div className="relative bg-black rounded-md overflow-hidden border-2 border-gray-700">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={false}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded-md text-sm">
          {participant?.userName || 'Participant'}
        </div>
      </div>
    );
  };

  if (isInitializing) {
    return (
      <div className="h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
          <p className="mt-4 text-lg">Joining meeting...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="bg-red-800 text-white p-6 rounded-lg max-w-md">
          <h2 className="text-xl font-bold mb-2">Meeting Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="h-screen bg-gray-900 text-white relative"
      onMouseMove={() => setShowControls(true)}
    >
      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 rounded-md shadow-lg ${
              notification.type === 'error' 
                ? 'bg-red-50 border border-red-200 text-red-800' 
                : 'bg-green-50 border border-green-200 text-green-800'
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
          <span className="text-lg font-bold">Meeting</span>
          <span className="bg-green-600 px-2 py-1 rounded text-sm">
            {formatDuration(meetingDuration)}
          </span>
          {isRecording && (
            <div className="bg-red-600 px-2 py-1 rounded text-sm flex items-center space-x-1">
              <div className="w-2 h-2 bg-red-300 rounded-full"></div>
              <span>Live Transcript</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={copyMeetingId}
            className="p-1 text-white hover:bg-white hover:bg-opacity-20 rounded"
            title="Copy Meeting ID"
          >
            <FiCopy />
          </button>
          <span className="text-sm opacity-80">ID: {meetingId.slice(-8)}</span>
        </div>
      </div>

      {/* Video Grid */}
      <div className="h-full pt-16 pb-20">
        {remoteStreams.size === 0 ? (
          // Solo view
          <div className="h-full flex items-center justify-center">
            <div className="relative w-4/5 max-w-4xl aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
              <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 px-3 py-2 rounded-md">
                <span>{user.name || user.email} (You)</span>
              </div>
            </div>
          </div>
        ) : (
          // Grid view
          <div 
            className={`h-full grid gap-4 p-4 ${
              remoteStreams.size === 1 ? 'grid-cols-2' :
              remoteStreams.size <= 4 ? 'grid-cols-2 grid-rows-2' :
              'grid-cols-3 grid-rows-3'
            }`}
          >
            {/* Local video */}
            <div className="relative bg-black rounded-md overflow-hidden border-2 border-blue-500">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 px-2 py-1 rounded-md text-sm">
                {user.name || user.email} (You)
              </div>
            </div>

            {/* Remote videos */}
            {Array.from(remoteStreams.entries()).map(([socketId, stream]) => (
              <RemoteVideo
                key={socketId}
                streamData={stream}
                socketId={socketId}
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
            className={`p-3 rounded-full ${
              isAudioEnabled ? 'bg-gray-600' : 'bg-red-600'
            } hover:bg-opacity-80 transition-colors`}
            title={isAudioEnabled ? 'Mute' : 'Unmute'}
          >
            {isAudioEnabled ? <FiMic /> : <FiMicOff />}
          </button>

          {/* Video toggle */}
          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full ${
              isVideoEnabled ? 'bg-gray-600' : 'bg-red-600'
            } hover:bg-opacity-80 transition-colors`}
            title={isVideoEnabled ? 'Stop camera' : 'Start camera'}
          >
            {isVideoEnabled ? <FiVideo /> : <FiVideoOff />}
          </button>

          {/* Screen share */}
          <button
            onClick={isScreenSharing ? stopScreenShare : startScreenShare}
            className={`p-3 rounded-full ${
              isScreenSharing ? 'bg-blue-600' : 'bg-gray-600'
            } hover:bg-opacity-80 transition-colors`}
            title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          >
            <FiMonitor />
          </button>

          {/* Participants */}
          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className="p-3 rounded-full bg-gray-600 hover:bg-opacity-80 transition-colors relative"
            title="Participants"
          >
            <FiUsers />
            {participants.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {participants.length + 1}
              </span>
            )}
          </button>

          {/* Transcript */}
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="p-3 rounded-full bg-gray-600 hover:bg-opacity-80 transition-colors relative"
            title="Live transcript"
          >
            <FiMessageSquare />
            {transcripts.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-green-600 text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {transcripts.length}
              </span>
            )}
          </button>

          {/* Leave meeting */}
          <button
            onClick={handleLeaveMeeting}
            className="p-3 rounded-full bg-red-600 hover:bg-red-700 transition-colors transform rotate-[225deg]"
            title="Leave meeting"
          >
            <FiPhone />
          </button>
        </div>
      </div>

      {/* Participants Sidebar */}
      {showParticipants && (
        <div className="absolute top-0 right-0 w-80 h-full bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Participants ({participants.length + 1})</h3>
            <button
              onClick={() => setShowParticipants(false)}
              className="text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-3">
            {/* Current user */}
            <div className="flex items-center p-3 bg-blue-800 rounded-md">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm text-gray-800 mr-3">
                {(user.name || user.email).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-bold">{user.name || user.email}</p>
                <p className="text-sm opacity-80">You</p>
              </div>
              <div className="flex space-x-1">
                <span className={`px-2 py-1 text-xs rounded ${
                  isAudioEnabled ? 'bg-green-600' : 'bg-red-600'
                }`}>
                  {isAudioEnabled ? 'Audio' : 'Muted'}
                </span>
                <span className={`px-2 py-1 text-xs rounded ${
                  isVideoEnabled ? 'bg-green-600' : 'bg-red-600'
                }`}>
                  {isVideoEnabled ? 'Video' : 'Off'}
                </span>
              </div>
            </div>

            {/* Other participants */}
            {participants.map((participant) => (
              <div key={participant.socketId} className="flex items-center p-3 bg-gray-700 rounded-md">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm text-gray-800 mr-3">
                  {(participant.userName || participant.name || participant.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-bold">{participant.userName}</p>
                  <p className="text-sm opacity-80">{participant.email}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transcript Sidebar */}
      {showTranscript && (
        <div className="absolute top-0 right-0 w-96 h-full bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-semibold">Live Transcript</h3>
              {isRecording && (
                <span className="bg-red-600 px-2 py-1 rounded text-xs">Recording</span>
              )}
            </div>
            <button
              onClick={() => setShowTranscript(false)}
              className="text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-3 h-full">
            {transcripts.length === 0 ? (
              <p className="text-gray-400 text-center mt-8">
                No transcripts yet. Start speaking to see live captions.
              </p>
            ) : (
              <div className="space-y-3 overflow-y-auto">
                {transcripts.map((transcript, index) => (
                  <div key={index} className="p-3 bg-gray-700 rounded-md">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-sm text-blue-300">
                        {transcript.speakerName}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(transcript.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm">{transcript.transcript}</p>
                    {transcript.confidence && (
                      <p className="text-xs text-gray-500 mt-1">
                        Confidence: {Math.round(transcript.confidence * 100)}%
                      </p>
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

export default VideoMeeting;
