import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useVideoConference } from '@/hooks/useVideoConference';
import { useDirectVoiceTranscription } from '@/hooks/useDirectVoiceTranscription';

export default function VideoConference({ meeting, onLeaveMeeting }) {
  const { data: session } = useSession();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [isTranscriptVisible, setIsTranscriptVisible] = useState(true);
  const [transcripts, setTranscripts] = useState([]);
  const messagesEndRef = useRef(null);

  const {
    localStream,
    remoteStreams,
    participants,
    chatMessages,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    isConnected,
    localVideoRef,
    initializeMedia,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    sendChatMessage,
    sendTranscript,
    leaveMeeting
  } = useVideoConference(meeting.meetingId, session?.user?.id, session?.user?.name);

  const {
    isRecording: isTranscriptionRecording,
    isTranscribing,
    transcribedText,
    startDirectRecording,
    stopDirectRecording
  } = useDirectVoiceTranscription();

  // Initialize media when component mounts
  useEffect(() => {
    if (session?.user?.id && meeting.meetingId) {
      initializeMedia(
        meeting.settings?.videoEnabled ?? true,
        meeting.settings?.audioEnabled ?? true
      ).catch(error => {
        console.error('Failed to initialize media:', error);
        alert('Failed to access camera/microphone. Please check permissions.');
      });
    }
  }, [session?.user?.id, meeting.meetingId, initializeMedia]);

  // Auto-start transcription when audio is enabled and transcription is enabled
  useEffect(() => {
    if (isAudioEnabled && meeting.settings?.transcriptionEnabled && !isTranscriptionRecording) {
      startDirectRecording();
    } else if ((!isAudioEnabled || !meeting.settings?.transcriptionEnabled) && isTranscriptionRecording) {
      stopDirectRecording();
    }
  }, [isAudioEnabled, meeting.settings?.transcriptionEnabled, isTranscriptionRecording, startDirectRecording, stopDirectRecording]);

  // Handle transcribed text
  useEffect(() => {
    if (transcribedText) {
      // Add to local transcripts
      const newTranscript = {
        userId: session.user.id,
        userName: session.user.name,
        text: transcribedText,
        timestamp: new Date(),
        confidence: 0.8
      };
      setTranscripts(prev => [...prev, newTranscript]);

      // Send to other participants and save to database
      sendTranscript(transcribedText, 0.8);
      saveTranscript(transcribedText, 0.8);
    }
  }, [transcribedText, session?.user, sendTranscript]);

  // Auto-scroll chat and transcripts
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, transcripts]);

  const saveTranscript = async (text, confidence) => {
    try {
      await fetch(`/api/meetings/${meeting._id}/transcript`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, confidence })
      });
    } catch (error) {
      console.error('Failed to save transcript:', error);
    }
  };

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      sendChatMessage(chatMessage);
      setChatMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleLeaveMeeting = async () => {
    // Stop transcription if running
    if (isTranscriptionRecording) {
      stopDirectRecording();
    }
    
    // Leave the meeting
    leaveMeeting();
    
    // Check if this is the last participant and trigger auto-summarization
    if (participants.length === 0) {
      try {
        // End the meeting and trigger summarization
        await fetch(`/api/meetings/${meeting._id}/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        console.log('Meeting ended and summarization triggered');
      } catch (error) {
        console.error('Failed to end meeting:', error);
      }
    }
    
    onLeaveMeeting();
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex h-screen bg-[#202124]">
      {/* Main Video Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-[#202124] p-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-medium text-white">{meeting.title}</h1>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>{participants.length + 1} in call</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {meeting.settings?.transcriptionEnabled && (
              <div className="flex items-center gap-2 bg-[#3c4043] px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-white">Live transcription</span>
              </div>
            )}
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="p-2 hover:bg-[#3c4043] rounded-full text-gray-300 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Video Grid */}
        <div className="flex-1 p-6">
          <div className={`grid gap-3 h-full ${
            remoteStreams.size === 0 ? 'grid-cols-1' :
            remoteStreams.size === 1 ? 'grid-cols-2' :
            remoteStreams.size <= 4 ? 'grid-cols-2 grid-rows-2' :
            'grid-cols-3'
          }`}>
            {/* Local Video */}
            <div className="relative bg-[#3c4043] rounded-lg overflow-hidden shadow-lg">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 left-3 bg-black bg-opacity-70 px-3 py-1 rounded-full text-white text-sm font-medium">
                You
              </div>
              <div className="absolute top-3 right-3 flex gap-2">
                {!isAudioEnabled && (
                  <div className="bg-red-600 p-2 rounded-full">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                    </svg>
                  </div>
                )}
                {!isVideoEnabled && (
                  <div className="bg-red-600 p-2 rounded-full">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82l2 2H16v7.17l2 2V18.5l4 4 1.41-1.41L3.41 2.09 2 3.5l4.05 4.05C6.02 7.52 6 7.75 6 8v8c0 .55.45 1 1 1h10c.21 0 .39-.08.55-.18l2.28 2.28L21 17.69V6.5z"/>
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* Remote Videos */}
            {Array.from(remoteStreams.entries()).map(([socketId, stream]) => {
              const participant = participants.find(p => p.socketId === socketId);
              return (
                <div key={socketId} className="relative bg-[#3c4043] rounded-lg overflow-hidden shadow-lg">
                  <video
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                    ref={(video) => {
                      if (video) video.srcObject = stream;
                    }}
                  />
                  <div className="absolute bottom-3 left-3 bg-black bg-opacity-70 px-3 py-1 rounded-full text-white text-sm font-medium">
                    {participant?.userName || 'Unknown User'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Controls */}
        <div className="bg-[#202124] p-4">
          <div className="flex justify-center items-center gap-3">
            {/* Audio Toggle */}
            <button
              onClick={toggleAudio}
              className={`p-4 rounded-full transition-all duration-200 ${
                isAudioEnabled 
                  ? 'bg-gray-600 hover:bg-gray-700' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
              title={isAudioEnabled ? 'Mute' : 'Unmute'}
            >
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                {isAudioEnabled ? (
                  <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                ) : (
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                )}
              </svg>
            </button>

            {/* Video Toggle */}
            <button
              onClick={toggleVideo}
              className={`p-3 rounded-full transition-colors ${
                isVideoEnabled 
                  ? 'bg-gray-600 hover:bg-gray-700' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
              title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                {isVideoEnabled ? (
                  <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                ) : (
                  <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82l2 2H16v7.17l2 2V18.5l4 4 1.41-1.41L3.41 2.09 2 3.5l4.05 4.05C6.02 7.52 6 7.75 6 8v8c0 .55.45 1 1 1h10c.21 0 .39-.08.55-.18l2.28 2.28L21 17.69V6.5z"/>
                )}
              </svg>
            </button>

            {/* Screen Share */}
            <button
              onClick={isScreenSharing ? stopScreenShare : startScreenShare}
              className={`p-3 rounded-full transition-colors ${
                isScreenSharing 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-gray-600 hover:bg-gray-700'
              }`}
              title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
            >
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/>
              </svg>
            </button>

            {/* Live Transcription */}
            {meeting.settings?.transcriptionEnabled && (
              <button
                onClick={isTranscriptionRecording ? stopDirectRecording : startDirectRecording}
                className={`p-3 rounded-full transition-colors ${
                  isTranscriptionRecording 
                    ? 'bg-purple-600 hover:bg-purple-700 animate-pulse' 
                    : isTranscribing
                    ? 'bg-blue-600 animate-pulse'
                    : 'bg-gray-600 hover:bg-gray-700'
                }`}
                title={
                  isTranscriptionRecording 
                    ? 'Stop transcription' 
                    : isTranscribing 
                    ? 'Transcribing...' 
                    : 'Start live transcription'
                }
              >
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z M9 9v2h2V9H9zm4 0v2h2V9h-2z"/>
                </svg>
              </button>
            )}

            {/* Chat Toggle */}
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="p-3 rounded-full bg-gray-600 hover:bg-gray-700 transition-colors relative"
              title="Toggle chat"
            >
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
              </svg>
              {chatMessages.length > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {chatMessages.length > 9 ? '9+' : chatMessages.length}
                </div>
              )}
            </button>

            {/* Leave Meeting */}
            <button
              onClick={handleLeaveMeeting}
              className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-all duration-200"
              title="Leave meeting"
            >
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 13v-2H7V8l-5 4 5 4v-3z M20 3h-9c-1.11 0-2 .89-2 2v4h2V5h9v14h-9v-4H9v4c0 1.11.89 2 2 2h9c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Chat Panel - Only shows chat, transcription runs silently in background */}
      {isChatOpen && (
        <div className="w-80 bg-[#1f1f1f] border-l border-gray-600 flex flex-col">
          <div className="p-4 border-b border-gray-600">
            <h3 className="text-lg font-medium text-white">In-call messages</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 ? (
              <p className="text-gray-400 text-center text-sm">Messages can only be seen by people in the call and are deleted when the call ends.</p>
            ) : (
              chatMessages.map((message, index) => (
                <div key={index} className="break-words">
                  <div className="text-xs text-gray-400 mb-1">
                    {message.userName} • {formatTime(message.timestamp)}
                  </div>
                  <div className="text-white bg-[#3c4043] rounded-lg p-3">
                    {message.message}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-gray-600">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Send a message to everyone"
                className="flex-1 bg-[#3c4043] border-0 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={!chatMessage.trim()}
                className="px-4 py-2 bg-[#1a73e8] text-white rounded-lg hover:bg-[#1557b0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
