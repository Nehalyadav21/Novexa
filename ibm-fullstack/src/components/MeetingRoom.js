/**
 * MeetingRoom Component
 * 
 * Google Meet-like video conferencing interface with:
 * 1. WebRTC video/audio streams for multiple participants
 * 2. Meeting controls (mute, camera, screen share, leave)
 * 3. Participant list and meeting info
 * 4. Responsive design for different screen sizes
 */

// Calculate optimal grid layout based on participant count
'use client'
const calculateGridLayout = (participantCount) => {
  if (participantCount === 1) return 'single-view';
  if (participantCount === 2) return 'grid grid-cols-2 grid-rows-1';
  if (participantCount <= 4) return 'grid grid-cols-2 grid-rows-2';
  if (participantCount <= 6) return 'grid grid-cols-3 grid-rows-2';
  if (participantCount <= 9) return 'grid grid-cols-3 grid-rows-3';
  if (participantCount <= 12) return 'grid grid-cols-4 grid-rows-3';
  return 'grid grid-cols-4 grid-rows-4'; // Maximum 16 participants visible
};

/**
 * MeetingRoom Component
 * 
 * Handles video conferencing with:
 * 1. WebRTC video/audio streams for multiple participants
 * 2. Meeting controls (mute, camera, screen share, leave)
 * 3. Participant list and meeting info
 * 4. Responsive design for different screen sizes
 */


import React, { useEffect, useState, useRef } from 'react';
import { Inter } from 'next/font/google';
import { Particles } from '@/components/ui/ThemeComponents';
import { COLORS } from '@/lib/theme';
import {
  FiMic,
  FiMicOff,
  FiVideo,
  FiVideoOff,
  FiMonitor,
  FiPhone,
  FiUsers,
  FiCopy,
  FiSettings,
  FiMessageSquare,
  FiFileText,
  FiDownload,
  FiUserPlus,
  FiX
} from 'react-icons/fi';
import useWebRTCMeeting from '../hooks/useWebRTCMeeting';
import { useDirectWebRTC } from '../hooks/useDirectWebRTC';
import TranscriptionPanel from './TranscriptionPanel';
import { createTasksFromMeeting } from '../utils/aiTaskAssignment';

const inter = Inter({ subsets: ['latin'] });

const MeetingRoom = ({ meetingId, user, meetingPassword = '', onLeaveMeeting }) => {
  const [meetingStatus, setMeetingStatus] = useState('checking'); // 'checking', 'active', 'ended', 'not-found'
  
  // Check if Socket.IO is disabled for production
  const isSocketIODisabled = process.env.NEXT_PUBLIC_DISABLE_SOCKETIO === 'true';
  
  // Always call both hooks (React rules), use appropriate one
  const socketWebRTC = useWebRTCMeeting(meetingId, user);
  const directWebRTC = useDirectWebRTC(meetingId, user, meetingPassword);
  
  // Choose which implementation to use
  const webrtcHook = isSocketIODisabled ? directWebRTC : socketWebRTC;
  
  const {
    isConnected,
    meetingJoined = webrtcHook.isConnected, // Direct WebRTC uses isConnected instead
    localStream,
    remoteStreams,
    participants,
    isAudioEnabled = socketWebRTC.isAudioEnabled || !directWebRTC.isMuted,
    isVideoEnabled = socketWebRTC.isVideoEnabled || !directWebRTC.isVideoOff,
    isScreenSharing = socketWebRTC.isScreenSharing || false,
    isHost = socketWebRTC.isHost || true,
    error = socketWebRTC.error || directWebRTC.error,
    connectionStatus = socketWebRTC.connectionStatus || directWebRTC.connectionStatus,
    isTranscribing = socketWebRTC.isTranscribing || false,
    transcripts = socketWebRTC.transcripts || [],
    localVideoRef = socketWebRTC.localVideoRef || directWebRTC.localVideoRef,
    socketRef = socketWebRTC.socketRef || { current: null },
    toggleAudio = isSocketIODisabled ? directWebRTC.toggleMute : socketWebRTC.toggleAudio,
    toggleVideo = isSocketIODisabled ? directWebRTC.toggleVideo : socketWebRTC.toggleVideo,
    startScreenShare = socketWebRTC.startScreenShare || (() => console.log('Screen sharing not available')),
    stopScreenShare = socketWebRTC.stopScreenShare || (() => console.log('Screen sharing not available')),
    leaveMeeting = isSocketIODisabled ? directWebRTC.leaveMeeting : socketWebRTC.leaveMeeting,
    startTranscription = socketWebRTC.startTranscription || (() => console.log('Transcription not available')),
    stopTranscription = socketWebRTC.stopTranscription || (() => console.log('Transcription not available'))
  } = webrtcHook;

  // UI State
  const [showParticipants, setShowParticipants] = useState(false);
  const [showTranscription, setShowTranscription] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [meetingDuration, setMeetingDuration] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [meetingSummary, setMeetingSummary] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [companyMembers, setCompanyMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const autoEndTimeoutRef = useRef(null);
  const [autoTasksEnabled, setAutoTasksEnabled] = useState(true);
  const [extractedTasks, setExtractedTasks] = useState([]);

  // Debug logs for participants and streams
  useEffect(() => {
    console.log('🎭 MeetingRoom - Participants updated:', participants.length, participants);
    console.log('📺 MeetingRoom - Remote streams updated:', remoteStreams.size, Array.from(remoteStreams.keys()));
    console.log('🔍 MeetingRoom - Participants structure:', participants.map(p => ({ userId: p.userId, socketId: p.socketId, userName: p.userName })));
  }, [participants, remoteStreams]);

  // Join meeting when MeetingRoom is rendered (user has gone through join form)
  useEffect(() => {
    if (isSocketIODisabled && directWebRTC.isReady && meetingStatus === 'active' && !directWebRTC.isConnected && !directWebRTC.error) {
      console.log('🚀 Joining meeting with Direct WebRTC (user passed join form)...');
      directWebRTC.joinMeeting().catch(err => {
        console.error('Failed to join meeting:', err);
        // Don't set error immediately if it's unauthorized - this might redirect to join page
        if (err.message === 'Unauthorized') {
          console.log('🔄 Unauthorized error - redirecting to join page for password collection');
          if (onLeaveMeeting) {
            onLeaveMeeting();
          }
        }
      });
    }
  }, [isSocketIODisabled, directWebRTC.isReady, meetingStatus, directWebRTC.isConnected, directWebRTC.error, directWebRTC.joinMeeting, onLeaveMeeting]);

  // Meeting timer
  useEffect(() => {
    let interval;
    if (meetingJoined) {
      interval = setInterval(() => {
        setMeetingDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [meetingJoined]);

  // Check meeting status on load
  useEffect(() => {
    const checkMeetingStatus = async () => {
      try {
        const response = await fetch(`/api/meetings/${meetingId}/status`);
        if (response.ok) {
          const { status, endedAt } = await response.json();
          if (status === 'ended') {
            setMeetingStatus('ended');
            return;
          }
        }
        setMeetingStatus('active');
      } catch (error) {
        console.error('Error checking meeting status:', error);
        setMeetingStatus('active'); // Allow access if check fails
      }
    };

    if (meetingId) {
      checkMeetingStatus();
    }
  }, [meetingId]);

  // Auto-hide controls after 3 seconds of inactivity (longer on mobile)
  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const timeout = isMobile ? 5000 : 3000; // Longer timeout on mobile for better UX
    
    const timer = setTimeout(() => {
      setShowControls(false);
    }, timeout);

    return () => clearTimeout(timer);
  }, [showControls]);

  // Show notification
  const showNotification = (message, type = 'info') => {
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

  // Debug logging for participants and streams
  useEffect(() => {
    console.log('🎭 MeetingRoom - Participants updated:', participants.length, participants);
    console.log('📺 MeetingRoom - Remote streams updated:', remoteStreams.size, Array.from(remoteStreams.keys()));
  }, [participants, remoteStreams]);

  // Auto-end meeting if no participants for 5 minutes
  useEffect(() => {
    // Clear existing timeout
    if (autoEndTimeoutRef.current) {
      clearTimeout(autoEndTimeoutRef.current);
      autoEndTimeoutRef.current = null;
    }

    // Only start auto-end timer if meeting is active and has no participants
    if (meetingStatus === 'active' && participants.length === 0) {
      console.log('🔚 Starting auto-end timer - no participants in meeting');
      
      autoEndTimeoutRef.current = setTimeout(async () => {
        console.log('🔚 Auto-ending meeting due to no participants for 5 minutes');
        showNotification('Meeting ended automatically - no participants for 5 minutes', 'info');
        
        // End the meeting with task extraction
        await handleLeaveMeeting();
        
        // Navigate back to dashboard
        window.location.href = '/dashboard';
      }, 5 * 60 * 1000); // 5 minutes
    } else if (participants.length > 0) {
      console.log('🔚 Participants present - canceling auto-end timer');
    }

    // Cleanup on unmount
    return () => {
      if (autoEndTimeoutRef.current) {
        clearTimeout(autoEndTimeoutRef.current);
        autoEndTimeoutRef.current = null;
      }
    };
  }, [participants.length, meetingStatus, leaveMeeting, showNotification]);


  // Format meeting duration
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Placeholder functions for transcription features
  const generateMeetingSummary = async () => {
    try {
      // Check if we have transcripts to summarize
      if (!transcripts || transcripts.length === 0) {
        showNotification('No transcripts available to summarize', 'error');
        return;
      }

      setSummaryLoading(true);
      showNotification('Generating meeting summary...', 'info');

      const response = await fetch(`/api/meetings/${meetingId}/summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcripts: transcripts,
          meetingTitle: `Meeting ${meetingId}`
        })
      });
      
      if (response.ok) {
        const { summary } = await response.json();
        console.log('Meeting summary generated:', summary);
        setMeetingSummary(summary);
        setShowSummary(true);
        showNotification('Meeting summary generated successfully!', 'success');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate summary');
      }
    } catch (error) {
      console.error('Failed to generate summary:', error);
      showNotification(`Summary generation failed: ${error.message}`, 'error');
    } finally {
      setSummaryLoading(false);
    }
  };

  const exportTranscripts = () => {
    if (transcripts.length === 0) {
      alert('No transcripts to export');
      return;
    }
    
    const transcriptText = transcripts
      .map(t => `[${new Date(t.timestamp).toLocaleTimeString()}] ${t.speaker}: ${t.text}`)
      .join('\n');
    
    const blob = new Blob([transcriptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-${meetingId}-transcript.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearTranscripts = () => {
    // This would need to be implemented in the useWebRTCMeeting hook
    console.log('Clear transcripts not implemented yet');
  };

  // Copy meeting ID to clipboard
  const copyMeetingId = () => {
    navigator.clipboard.writeText(meetingId);
    showNotification('Meeting ID copied to clipboard');
  };

  // Handle leaving meeting with auto task assignment
  const handleLeaveMeeting = async () => {
    console.log('🔍 === AUTOMATIC TASK EXTRACTION DEBUG ===');
    console.log('🔍 handleLeaveMeeting called - checking conditions...');
    console.log('🔍 autoTasksEnabled:', autoTasksEnabled);
    console.log('🔍 transcripts exists:', !!transcripts);
    console.log('🔍 transcripts length:', transcripts?.length);
    console.log('🔍 transcripts content:', transcripts);
    console.log('🔍 participants exists:', !!participants);
    console.log('🔍 participants length:', participants?.length);
    console.log('🔍 participants content:', participants);
    
    // Extract tasks from transcripts BEFORE leaving the meeting
    if (autoTasksEnabled && transcripts && transcripts.length > 0) {
      try {
        console.log('🔍 Starting automatic task extraction...');
        
        showNotification('Analyzing meeting transcript for tasks...', 'info');

        // Combine all transcripts into one text
        const fullTranscript = transcripts
          .map(t => `${t.speaker}: ${t.text}`)
          .join('\n');

        console.log('📝 Combined transcript for automatic extraction:', fullTranscript);
        console.log('📝 Full transcript length:', fullTranscript.length);

        // Create tasks from meeting transcript
        const tasks = await createTasksFromMeeting(meetingId, fullTranscript, participants);
        
        console.log('📋 Automatically extracted tasks result:', tasks);
        console.log('📋 Tasks type:', typeof tasks);
        console.log('📋 Tasks length:', tasks?.length);
        
        if (tasks && tasks.length > 0) {
          setExtractedTasks(tasks);
          showNotification(`Generated ${tasks.length} task(s) from meeting transcript`, 'success');
          console.log('✅ Automatic task extraction successful!');
        } else {
          showNotification('No tasks detected in meeting transcript', 'info');
          console.log('⚠️ No tasks found in automatic extraction');
        }
      } catch (error) {
        console.error('❌ Error extracting tasks:', error);
        showNotification('Failed to extract tasks from transcript', 'error');
      }
    } else {
      console.log('⚠️ Task extraction skipped:', {
        autoTasksEnabled,
        transcriptsExists: !!transcripts,
        transcriptsLength: transcripts?.length || 0
      });
    }

    // Now leave the meeting (this will trigger socket disconnect)
    console.log('🔍 Now calling leaveMeeting...');
    leaveMeeting();
    if (onLeaveMeeting) {
      onLeaveMeeting();
    }
  };

  // Manual task extraction from live transcript
  const handleExtractTasks = async () => {
    console.log('🔍 === MANUAL TASK EXTRACTION DEBUG ===');
    console.log('🔍 Transcripts exist:', !!transcripts);
    console.log('🔍 Transcripts length:', transcripts?.length);
    console.log('🔍 Raw transcripts:', transcripts);
    console.log('🔍 Participants exist:', !!participants);
    console.log('🔍 Participants length:', participants?.length);
    console.log('🔍 Raw participants:', participants);
    
    if (!transcripts || transcripts.length === 0) {
      console.log('❌ No transcript available for manual task extraction');
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'warning',
        message: 'No transcript available for task extraction'
      }]);
      return;
    }

    try {
      console.log('🔍 Starting manual task extraction...');
      
      showNotification('Analyzing meeting transcript for tasks...', 'info');

      // Combine all transcripts into one text
      const fullTranscript = transcripts
        .map(t => `${t.speaker}: ${t.text}`)
        .join('\n');

      console.log('📝 Combined transcript for manual extraction:', fullTranscript);
      console.log('📝 Full transcript length:', fullTranscript.length);

      // Create tasks from meeting transcript
      const tasks = await createTasksFromMeeting(meetingId, fullTranscript, participants);
      
      console.log('📋 Manually extracted tasks result:', tasks);
      console.log('📋 Tasks type:', typeof tasks);
      console.log('📋 Tasks length:', tasks?.length);
      
      if (tasks && tasks.length > 0) {
        setExtractedTasks(prev => [...prev, ...tasks]);
        showNotification(`Generated ${tasks.length} task(s) from current transcript`, 'success');
        console.log('✅ Manual task extraction successful!');
      } else {
        showNotification('No tasks detected in current transcript', 'info');
        console.log('⚠️ No tasks found in manual extraction');
      }
    } catch (error) {
      console.error('❌ Error in manual task extraction:', error);
      showNotification('Failed to extract tasks from transcript', 'error');
    }
  };

  // Fetch company members for inviting
  const fetchCompanyMembers = async () => {
    try {
      const response = await fetch('/api/company/members');
      if (response.ok) {
        const data = await response.json();
        // The API returns { success: true, members: [...] }
        const members = Array.isArray(data.members) ? data.members : [];
        console.log('Fetched company members:', members);
        // Filter out current user and extract user info from the nested structure
        const filteredMembers = members
          .filter(member => member.user && member.user._id !== user.id)
          .map(member => ({
            _id: member.user._id,
            name: member.user.name,
            email: member.user.email,
            role: member.role,
            isOwner: member.isOwner
          }));
        setCompanyMembers(filteredMembers);
      } else {
        console.error('Failed to fetch company members:', response.statusText);
        setCompanyMembers([]);
      }
    } catch (error) {
      console.error('Error fetching company members:', error);
      setCompanyMembers([]); // Set empty array on error
    }
  };

  // Handle opening invite modal
  const handleOpenInviteModal = () => {
    setShowInviteModal(true);
    fetchCompanyMembers();
  };

  // Handle inviting members to meeting
  const handleInviteMembers = async () => {
    if (selectedMembers.length === 0) {
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'warning',
        message: 'Please select members to invite'
      }]);
      return;
    }

    setInviteLoading(true);
    try {
      const response = await fetch(`/api/meetings/${meetingId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitedMembers: selectedMembers
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setNotifications(prev => [...prev, {
          id: Date.now(),
          type: 'success',
          message: data.message || `Invited ${selectedMembers.length} member(s) to the meeting`
        }]);
        setShowInviteModal(false);
        setSelectedMembers([]);
      } else {
        console.error('API Error:', data);
        throw new Error(data.error || 'Failed to invite members');
      }
    } catch (error) {
      console.error('Error inviting members:', error);
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        message: error.message || 'Failed to invite members. Please try again.'
      }]);
    } finally {
      setInviteLoading(false);
    }
  };

  // Toggle member selection
  const toggleMemberSelection = (memberId) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  /**
   * Remote Video Component with IBM Design
   */
  const RemoteVideo = ({ stream, participant }) => {
    const videoRef = React.useRef();
    
    useEffect(() => {
      console.log(`📺 RemoteVideo effect - stream:`, !!stream, 'participant:', participant?.userName || 'unknown');
      if (videoRef.current && stream) {
        console.log(`🎯 Assigning stream to video element for ${participant?.userName || 'unknown'}`);
        videoRef.current.srcObject = stream;
        
        // Debug: Log when video starts playing
        const onLoadedMetadata = () => {
          console.log(`▶️ Video metadata loaded for ${participant?.userName || 'unknown'}`);
        };
        const onPlaying = () => {
          console.log(`🎬 Video started playing for ${participant?.userName || 'unknown'}`);
        };
        
        videoRef.current.addEventListener('loadedmetadata', onLoadedMetadata);
        videoRef.current.addEventListener('playing', onPlaying);
        
        return () => {
          if (videoRef.current) {
            videoRef.current.removeEventListener('loadedmetadata', onLoadedMetadata);
            videoRef.current.removeEventListener('playing', onPlaying);
          }
        };
      }
    }, [stream, participant]);

    return (
      <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg sm:rounded-2xl overflow-hidden border border-gray-700 shadow-lg sm:shadow-2xl min-h-0 w-full h-full">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={false} // Don't mute remote videos - users should hear other participants
          webkit-playsinline="true"
          className="w-full h-full object-cover"
        />
        
        {/* Participant info overlay - Mobile Optimized */}
        <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 bg-black bg-opacity-60 backdrop-blur-sm text-white px-2 sm:px-3 py-1 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm flex items-center space-x-1 sm:space-x-2 border border-white border-opacity-20">
          <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold">
              {(participant?.userName || 'P').charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="font-medium">{participant?.userName || 'Participant'}</span>
          {!participant?.audioEnabled && (
            <FiMicOff className="text-red-400 w-3 h-3" />
          )}
        </div>
        
        {/* Host badge - Mobile Optimized */}
        {participant?.isHost && (
          <div className="absolute top-2 sm:top-3 left-2 sm:left-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-1 sm:px-2 py-0.5 sm:py-1 rounded sm:rounded-lg text-xs font-medium shadow-lg">
            Host
          </div>
        )}
        
        {/* Connection status - Mobile Optimized */}
        <div className="absolute top-2 sm:top-3 right-2 sm:right-3">
          <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full shadow-lg ${
            stream ? 'bg-green-500' : 'bg-red-500'
          }`} />
        </div>
        
        {/* Video off state - Mobile Optimized */}
        {!stream && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full flex items-center justify-center mb-2 mx-auto shadow-lg">
                <span className="text-lg sm:text-xl font-bold text-white">
                  {(participant?.userName || 'P').charAt(0).toUpperCase()}
                </span>
              </div>
              <p className="text-gray-400 text-xs sm:text-sm">Camera is off</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  /**
   * Connection Status Display
   */
  if (!isConnected && connectionStatus === 'connecting') {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="mb-8">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
              <span className="text-blue-600 font-bold text-2xl">IBM</span>
            </div>
            <h1 className="text-2xl font-semibold mb-2">Novexa Meeting</h1>
          </div>
          
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-blue-500 rounded-full animate-pulse"></div>
            </div>
          </div>
          
          <h2 className="text-xl font-semibold mb-2">Connecting to meeting...</h2>
          <p className="text-gray-300">Setting up camera, microphone, and AI transcription</p>
          
          {/* Connection status indicator */}
          <div className="mt-4 p-3 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-500 border-opacity-30">
            <p className="text-sm text-blue-200">
              Status: <span className="font-medium">{connectionStatus}</span>
            </p>
          </div>
          
          <div className="mt-6 flex items-center justify-center space-x-4 text-sm text-gray-400">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span>Secure Connection</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              <span>AI Ready</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (connectionStatus === 'reconnecting') {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="mb-8">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
              <span className="text-blue-600 font-bold text-2xl">IBM</span>
            </div>
            <h1 className="text-2xl font-semibold mb-2">Novexa Meeting</h1>
          </div>
          
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-500 border-t-transparent mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-yellow-500 rounded-full animate-pulse"></div>
            </div>
          </div>
          
          <h2 className="text-xl font-semibold mb-2">Reconnecting...</h2>
          <p className="text-gray-300">Restoring connection to the meeting</p>
          
          <div className="mt-4 p-3 bg-yellow-900 bg-opacity-30 rounded-lg border border-yellow-500 border-opacity-30">
            <p className="text-sm text-yellow-200">
              Connection temporarily lost. Attempting to reconnect...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="mb-8">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
              <span className="text-blue-600 font-bold text-2xl">IBM</span>
            </div>
            <h1 className="text-2xl font-semibold mb-2">Novexa Meeting</h1>
          </div>
          
          <div className="bg-red-500 bg-opacity-20 border border-red-400 p-6 rounded-2xl backdrop-blur-sm">
            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl">!</span>
            </div>
            <h2 className="text-xl font-bold mb-3 text-red-200">Connection Error</h2>
            <p className="mb-4 text-red-100">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-white text-red-600 px-6 py-3 rounded-xl hover:bg-gray-100 transition-colors font-medium shadow-lg"
            >
              Try Again
            </button>
          </div>
          
          <p className="text-gray-400 text-sm mt-4">
            If the problem persists, please check your internet connection and try again.
          </p>
        </div>
      </div>
    );
  }

  const totalParticipants = participants.length + 1; // +1 for local user
  
  // Calculate grid layout based on participant count
  const gridLayoutClass = calculateGridLayout(totalParticipants);
  const maxVisibleParticipants = totalParticipants === 1 ? 1 : 
    totalParticipants === 2 ? 2 :
    totalParticipants <= 4 ? 4 :
    totalParticipants <= 6 ? 6 :
    totalParticipants <= 9 ? 9 :
    totalParticipants <= 12 ? 12 : 16;

  // If meeting is ended, show access denied message
  if (meetingStatus === 'ended') {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiPhone className="w-12 h-12 transform rotate-[135deg]" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Meeting Ended</h1>
          <p className="text-gray-300 mb-6">
            This meeting has ended and is no longer accessible. All participants have left the meeting.
          </p>
          <button
            onClick={() => window.location.href = '/meetings'}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors"
          >
            View Meeting History
          </button>
        </div>
      </div>
    );
  }

  // Show loading while checking status
  if (meetingStatus === 'checking') {
    return (
      <div className="h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-300">Checking meeting status...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`h-screen overflow-hidden text-white relative ${inter.className}`}
      style={{ backgroundColor: COLORS.background }}
      onMouseMove={() => setShowControls(true)}
      onTouchStart={() => setShowControls(true)} // Show controls on touch for mobile
      onTouchMove={() => setShowControls(true)}
    >
      <Particles />
      
      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-3 rounded-lg shadow-lg max-w-sm backdrop-blur-md border ${
              notification.type === 'error' 
                ? 'bg-red-900/80 text-red-200 border-red-700' 
                : 'bg-gray-800/80 text-gray-200 border-gray-600'
            }`}
          >
            {notification.message}
          </div>
        ))}
      </div>

      {/* Connection Status Indicator */}
      {connectionStatus !== 'connected' && (
        <div className="fixed top-20 right-4 z-50">
          <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg shadow-lg border text-sm backdrop-blur-md ${
            connectionStatus === 'reconnecting' 
              ? 'bg-yellow-900/80 text-yellow-200 border-yellow-700' 
              : connectionStatus === 'failed'
              ? 'bg-red-900/80 text-red-200 border-red-700'
              : 'bg-gray-800/80 text-gray-200 border-gray-600'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'reconnecting' 
                ? 'bg-yellow-400 animate-pulse' 
                : connectionStatus === 'failed'
                ? 'bg-red-400'
                : 'bg-gray-400 animate-pulse'
            }`}></div>
            <span className="font-medium">
              {connectionStatus === 'reconnecting' && 'Reconnecting...'}
              {connectionStatus === 'failed' && 'Connection Failed'}
              {connectionStatus === 'connecting' && 'Connecting...'}
              {connectionStatus === 'disconnected' && 'Disconnected'}
            </span>
          </div>
        </div>
      )}

      {/* Video Grid */}
      <div className={`h-screen flex flex-col transition-all duration-300 ${
        showTranscription ? 'pr-[400px]' : ''
      }`}>
        {/* Main video area - Full height minus controls */}
        <div className="flex-1 p-3 sm:p-6 min-h-0">
          {totalParticipants === 1 ? (
            // Solo view - just local video - Mobile Optimized
            <div className="h-full flex items-center justify-center">
              <div className="relative w-full max-w-4xl aspect-video bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl sm:rounded-2xl overflow-hidden shadow-xl sm:shadow-2xl border border-gray-700">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  webkit-playsinline="true"
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
                
                {/* Elegant overlay - Mobile Optimized */}
                <div className="absolute bottom-3 sm:bottom-6 left-3 sm:left-6 bg-black/60 backdrop-blur-sm px-2 sm:px-4 py-1 sm:py-2 rounded-lg sm:rounded-xl border border-white/20">
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center" 
                         style={{ background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.secondary})` }}>
                      <span className="text-white text-xs sm:text-sm font-bold">
                        {(user?.name || user?.email || 'You').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-white font-medium text-xs sm:text-sm">{user?.name || user?.email || 'You'}</span>
                    {!isAudioEnabled && <FiMicOff className="text-red-400 w-3 h-3 sm:w-4 sm:h-4" />}
                  </div>
                </div>
                
                {!isVideoEnabled && (
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mb-4 mx-auto shadow-lg" 
                           style={{ background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.secondary})` }}>
                        <span className="text-xl sm:text-2xl font-bold text-white">
                          {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm sm:text-lg">Camera is off</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Grid view for multiple participants - Optimized for fit without scrolling
            <div className={`h-full gap-2 sm:gap-4 auto-rows-fr ${gridLayoutClass}`}>
              {/* Local video - Mobile Optimized */}
              <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg sm:rounded-2xl overflow-hidden border border-blue-500 sm:border-2 shadow-lg sm:shadow-2xl min-h-0">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  webkit-playsinline="true"
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
                
                {/* You badge - Mobile Optimized */}
                <div className="absolute top-2 sm:top-3 left-2 sm:left-3 bg-blue-600 bg-opacity-90 backdrop-blur-sm px-1 sm:px-2 py-0.5 sm:py-1 rounded sm:rounded-lg text-xs font-medium border border-blue-400">
                  You
                </div>
                
                <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 bg-black bg-opacity-60 backdrop-blur-sm text-white px-2 sm:px-3 py-1 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm flex items-center space-x-1 sm:space-x-2 border border-white border-opacity-20">
                  <span className="font-medium">You</span>
                  {!isAudioEnabled && <FiMicOff className="text-red-400 w-3 h-3" />}
                </div>
                
                {!isVideoEnabled && (
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-lg sm:text-xl font-bold text-white">
                        {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Remote videos - Limited to what fits in grid */}
              {Array.from(remoteStreams.entries())
                .slice(0, maxVisibleParticipants - 1) // Reserve space for local video
                .map(([userId, stream]) => {
                  // Find participant by userId (not socketId) since remoteStreams keys are userId
                  const participant = participants.find(p => p.userId === userId);
                  console.log(`🎥 Rendering remote video for userId: ${userId}, found participant:`, participant?.userName);
                  return (
                    <RemoteVideo
                      key={userId}
                      stream={stream}
                      participant={participant}
                    />
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Google Meet Style Controls Bar - Mobile Optimized */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-gray-800/50 backdrop-blur-md shadow-lg transition-opacity duration-300 border-t border-gray-700 z-30 pointer-events-auto ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => {}} // Let the useEffect timer handle hiding
      >
        <div className="flex justify-center p-2 sm:p-3">
          <div className="flex items-center space-x-2 sm:space-x-3 bg-gray-800/70 backdrop-blur-sm rounded-full px-3 sm:px-6 py-2 sm:py-3 shadow-lg border border-gray-600 pointer-events-auto">
            {/* Audio Toggle */}
            <button
              onClick={toggleAudio}
              className={`p-2 sm:p-3 rounded-full transition-all duration-200 touch-manipulation transform hover:scale-105 pointer-events-auto ${
                isAudioEnabled 
                  ? 'bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-gray-300' 
                  : 'bg-red-600 hover:bg-red-500 active:bg-red-700 text-white'
              }`}
              title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
            >
              {isAudioEnabled ? <FiMic className="w-4 h-4 sm:w-5 sm:h-5" /> : <FiMicOff className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>

            {/* Video Toggle */}
            <button
              onClick={toggleVideo}
              className={`p-2 sm:p-3 rounded-full transition-all duration-200 touch-manipulation transform hover:scale-105 pointer-events-auto ${
                isVideoEnabled 
                  ? 'bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-gray-300' 
                  : 'bg-red-600 hover:bg-red-500 active:bg-red-700 text-white'
              }`}
              title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              {isVideoEnabled ? <FiVideo className="w-4 h-4 sm:w-5 sm:h-5" /> : <FiVideoOff className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>

            {/* Screen Share - Hidden on mobile */}
            <button
              onClick={isScreenSharing ? stopScreenShare : startScreenShare}
              className={`hidden sm:block p-2 sm:p-3 rounded-full transition-all duration-200 touch-manipulation transform hover:scale-105 pointer-events-auto ${
                isScreenSharing 
                  ? 'text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-gray-300'
              }`}
              style={isScreenSharing ? { background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.secondary})` } : undefined}
              title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
            >
              <FiMonitor className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Transcription Toggle */}
            <button
              onClick={() => setShowTranscription(!showTranscription)}
              className={`p-2 sm:p-3 rounded-full transition-all duration-200 touch-manipulation transform hover:scale-105 pointer-events-auto ${
                showTranscription || isTranscribing
                  ? 'text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-gray-300'
              }`}
              style={(showTranscription || isTranscribing) ? { background: `linear-gradient(135deg, ${COLORS.secondary}, ${COLORS.accent})` } : undefined}
              title="Toggle transcription panel"
            >
              <FiFileText className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Participants */}
            <button
              onClick={() => setShowParticipants(!showParticipants)}
              className={`p-2 sm:p-3 rounded-full transition-all duration-200 touch-manipulation transform hover:scale-105 relative pointer-events-auto ${
                showParticipants
                  ? 'text-white'
                  : 'bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-gray-300'
              }`}
              style={showParticipants ? { background: `linear-gradient(135deg, ${COLORS.secondary}, ${COLORS.violet})` } : undefined}
              title="Show participants"
            >
              <FiUsers className="w-4 h-4 sm:w-5 sm:h-5" />
              {totalParticipants > 1 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center font-bold text-[10px] sm:text-xs">
                  {totalParticipants}
                </span>
              )}
            </button>

            {/* Invite Members (only for host, hidden on small screens) */}
            {isHost && (
              <button
                onClick={handleOpenInviteModal}
                className="hidden sm:block p-2 sm:p-3 rounded-full bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-gray-300 transition-all duration-200 touch-manipulation transform hover:scale-105 pointer-events-auto"
                title="Invite members to meeting"
              >
                <FiUserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}

            {/* Copy Meeting ID */}
            <button
              onClick={copyMeetingId}
              className="p-2 sm:p-3 rounded-full bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-gray-300 transition-all duration-200 touch-manipulation transform hover:scale-105 pointer-events-auto"
              title="Copy meeting ID"
            >
              <FiCopy className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Leave Meeting */}
            <button
              onClick={() => {
                console.log('🔴 Leave Meeting button clicked!');
                handleLeaveMeeting();
              }}
              className="p-2 sm:p-3 rounded-full bg-red-600 hover:bg-red-500 active:bg-red-700 transition-all duration-200 text-white ml-2 sm:ml-4 touch-manipulation transform hover:scale-105 pointer-events-auto"
              title="Leave meeting"
            >
              <FiPhone className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Participants Sidebar */}
      {showParticipants && (
        <div className="absolute top-0 right-0 w-80 h-full bg-gray-800/90 backdrop-blur-md border-l border-gray-700 z-20">
          <div className="p-4 border-b border-gray-700">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Participants ({totalParticipants})</h3>
              <button
                onClick={() => setShowParticipants(false)}
                className="text-gray-400 hover:text-white text-xl transition-colors"
              >
                ×
              </button>
            </div>
          </div>
          
          <div className="p-4 space-y-3 overflow-y-auto h-full">
            {/* Current user */}
            <div className="flex items-center p-3 bg-blue-900 rounded-lg">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                <span className="text-sm font-bold">
                  {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-semibold">{user?.name || user?.email || 'You'}</p>
                <p className="text-sm text-gray-300">You{isHost ? ' (Host)' : ''}</p>
              </div>
              <div className="flex space-x-1">
                <div className={`p-1 rounded ${isAudioEnabled ? 'bg-green-600' : 'bg-red-600'}`}>
                  {isAudioEnabled ? <FiMic className="w-3 h-3" /> : <FiMicOff className="w-3 h-3" />}
                </div>
                <div className={`p-1 rounded ${isVideoEnabled ? 'bg-green-600' : 'bg-red-600'}`}>
                  {isVideoEnabled ? <FiVideo className="w-3 h-3" /> : <FiVideoOff className="w-3 h-3" />}
                </div>
              </div>
            </div>

            {/* Other participants */}
            {participants.map((participant) => (
              <div key={participant.socketId} className="flex items-center p-3 bg-gray-700 rounded-lg">
                <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center mr-3">
                  <span className="text-sm font-bold">
                    {(participant.userName || participant.name || participant.email || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{participant.userName || participant.name || participant.email || 'Unknown User'}</p>
                  <p className="text-sm text-gray-300">
                    {participant.isHost ? 'Host' : 'Participant'}
                  </p>
                </div>
                <div className="flex space-x-1">
                  <div className={`p-1 rounded ${participant.audioEnabled ? 'bg-green-600' : 'bg-red-600'}`}>
                    {participant.audioEnabled ? <FiMic className="w-3 h-3" /> : <FiMicOff className="w-3 h-3" />}
                  </div>
                  <div className={`p-1 rounded ${participant.videoEnabled ? 'bg-green-600' : 'bg-red-600'}`}>
                    {participant.videoEnabled ? <FiVideo className="w-3 h-3" /> : <FiVideoOff className="w-3 h-3" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transcription Panel */}
      {showTranscription && (
        <div className="absolute top-0 right-0 h-full z-20">
          <TranscriptionPanel
            transcripts={transcripts}
            currentTranscript={''} // Web Speech API doesn't provide interim results in our implementation
            isTranscribing={isTranscribing}
            isSTTConnected={true} // Web Speech API is always "connected" if supported
            transcriptionError={null} // Handle errors in the hook if needed
            participants={participants} // Use meeting participants
            onStartTranscription={startTranscription}
            onStopTranscription={stopTranscription}
            onGenerateSummary={generateMeetingSummary}
            onExportTranscripts={exportTranscripts}
            onClearTranscripts={clearTranscripts}
            onExtractTasks={handleExtractTasks}
            onClose={() => setShowTranscription(false)}
          />
        </div>
      )}

      {/* Meeting Summary Panel */}
      {showSummary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Meeting Summary</h2>
                  <p className="text-blue-100">AI-Generated Summary for Meeting {meetingId}</p>
                </div>
                <button
                  onClick={() => setShowSummary(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {summaryLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Generating summary...</p>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6">
                  <div className="prose prose-lg max-w-none">
                    <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                      {meetingSummary}
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between items-center">
                    <p className="text-sm text-gray-500">
                      Generated at {new Date().toLocaleString()}
                    </p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(meetingSummary);
                        showNotification('Summary copied to clipboard!', 'success');
                      }}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                      Copy Summary
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Invite Members Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 border border-gray-700">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white">Invite Members to Meeting</h3>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-300 mb-4">
                  Select company members to invite to this meeting:
                </p>
                
                <div className="max-h-64 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                  {companyMembers.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No company members available</p>
                  ) : (
                    companyMembers.map((member) => (
                      <div
                        key={member._id}
                        className={`flex items-center p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                          selectedMembers.includes(member._id)
                            ? 'bg-gradient-to-r from-orange-500/20 to-pink-500/20 border border-orange-400/50'
                            : 'bg-gray-800/50 border border-gray-700 hover:bg-gray-700/50 hover:border-gray-600'
                        }`}
                        onClick={() => toggleMemberSelection(member._id)}
                      >
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center mr-3 text-white font-medium shadow-lg"
                          style={{ background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.secondary})` }}
                        >
                          <span className="text-sm">
                            {(member.userName || member.name || member.email || 'U').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-white">{member.userName || member.name || member.email || 'Unknown User'}</p>
                          <p className="text-sm text-gray-400">{member.email || 'No email'}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                          selectedMembers.includes(member._id)
                            ? 'border-orange-400 bg-gradient-to-r from-orange-400 to-pink-500'
                            : 'border-gray-500 hover:border-gray-400'
                        }`}>
                          {selectedMembers.includes(member._id) && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="px-6 py-2.5 text-gray-300 hover:text-white transition-colors rounded-lg hover:bg-gray-800 border border-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInviteMembers}
                  disabled={selectedMembers.length === 0 || inviteLoading}
                  className="px-6 py-2.5 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-medium shadow-lg transform hover:scale-105"
                  style={{ background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.secondary})` }}
                >
                  {inviteLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Inviting...</span>
                    </>
                  ) : (
                    <>
                      <FiUserPlus className="w-4 h-4" />
                      <span>Invite {selectedMembers.length} Member{selectedMembers.length !== 1 ? 's' : ''}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingRoom;
