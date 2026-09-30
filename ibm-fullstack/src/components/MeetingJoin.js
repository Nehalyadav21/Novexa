/**
 * Meeting Join Page
 * 
 * Landing page for joining or creating meetings
 * Features:
 * 1. Create new meeting with auto-generated ID
 * 2. Join existing meeting with ID
 * 3. User setup (name, camera/mic test)
 * 4. Meeting preview before joining
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Inter } from 'next/font/google';
import { Particles } from '@/components/ui/ThemeComponents';
import { COLORS } from '@/lib/theme';
import {
  FiVideo,
  FiVideoOff,
  FiMic,
  FiMicOff,
  FiSettings,
  FiCopy,
  FiPlay,
  FiPlus,
  FiCalendar,
  FiX,
  FiClock
} from 'react-icons/fi';

const inter = Inter({ subsets: ['latin'] });

const MeetingJoin = ({ onJoinMeeting, onCreateMeeting, initialMeetingId, initialUser }) => {
  // Form state
  const [userName, setUserName] = useState(initialUser?.name || '');
  const [meetingName, setMeetingName] = useState('');
  const [meetingId, setMeetingId] = useState(initialMeetingId || '');
  const [meetingPassword, setMeetingPassword] = useState('');
  const [createMeetingPassword, setCreateMeetingPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(!!initialMeetingId); // Show join form if meeting ID is provided
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  
  // Schedule meeting state
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduledMeetingName, setScheduledMeetingName] = useState('');
  const [scheduledMeetingPassword, setScheduledMeetingPassword] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [companyMembers, setCompanyMembers] = useState([]);
  const [isScheduling, setIsScheduling] = useState(false);
  
  // Media state
  const [localStream, setLocalStream] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [mediaError, setMediaError] = useState(null);
  const [isMediaLoading, setIsMediaLoading] = useState(false);
  
  // UI state
  const [notifications, setNotifications] = useState([]);
  
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);

  // Initialize media on component mount
  useEffect(() => {
    initializeMedia();
    
    // Get user name from localStorage if available
    const savedUserName = localStorage.getItem('meetingUserName');
    if (savedUserName) {
      setUserName(savedUserName);
    }

    return () => {
      // Cleanup media on unmount
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Update video element when stream changes
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  /**
   * Initialize Camera and Microphone
   */
  const initializeMedia = async () => {
    try {
      setIsMediaLoading(true);
      setMediaError(null);

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
      localStreamRef.current = stream;
      setLocalStream(stream);
      
      console.log('📹 Media initialized successfully');
    } catch (error) {
      console.error('Media initialization error:', error);
      setMediaError(error.message);
      showNotification('Camera/microphone access denied. Please check permissions.', 'error');
    } finally {
      setIsMediaLoading(false);
    }
  };

  /**
   * Toggle Video
   */
  const toggleVideo = () => {
    if (!localStreamRef.current) return;

    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
    }
  };

  /**
   * Toggle Audio
   */
  const toggleAudio = () => {
    if (!localStreamRef.current) return;

    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioEnabled(audioTrack.enabled);
    }
  };

  /**
   * Show Notification
   */
  const showNotification = (message, type = 'info') => {
    const notification = { id: Date.now(), message, type };
    setNotifications(prev => [...prev, notification]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  /**
   * Create New Meeting
   */
  const handleCreateMeeting = async () => {
    if (!userName.trim()) {
      showNotification('Please enter your name', 'error');
      return;
    }

    if (!meetingName.trim()) {
      showNotification('Please enter a meeting name', 'error');
      return;
    }

    if (!createMeetingPassword.trim()) {
      showNotification('Please set a password for the meeting', 'error');
      return;
    }

    try {
      setIsCreating(true);
      
      // Save user name
      localStorage.setItem('meetingUserName', userName);
      
      // Generate unique meeting ID
      const newMeetingId = Math.random().toString(36).substring(2, 15) + 
                          Math.random().toString(36).substring(2, 15);
      
      const user = {
        userId: Date.now().toString(),
        name: userName,
        email: userName.includes('@') ? userName : `${userName}@example.com`,
        meetingName: meetingName.trim(),
        password: createMeetingPassword.trim()
      };

      // Stop local media before joining
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }

      if (onCreateMeeting) {
        onCreateMeeting(newMeetingId, user);
      }
      
      showNotification(`Meeting "${meetingName}" created! ID: ${newMeetingId}`, 'success');
    } catch (error) {
      console.error('Error creating meeting:', error);
      showNotification('Failed to create meeting', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Join Existing Meeting
   */
  const handleJoinMeeting = async () => {
    if (!userName.trim()) {
      showNotification('Please enter your name', 'error');
      return;
    }
    
    if (!meetingId.trim()) {
      showNotification('Please enter meeting ID', 'error');
      return;
    }

    try {
      // First try to join the meeting (this will validate password if required)
      const joinResponse = await fetch(`/api/meetings/${meetingId.trim()}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: meetingPassword
        })
      });

      if (!joinResponse.ok) {
        const error = await joinResponse.json();
        showNotification(error.error || 'Failed to join meeting', 'error');
        return;
      }

      // Save user name
      localStorage.setItem('meetingUserName', userName);
      
      const user = {
        userId: Date.now().toString(),
        name: userName,
        email: userName.includes('@') ? userName : `${userName}@example.com`
      };

      // Stop local media before joining
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }

      if (onJoinMeeting) {
        onJoinMeeting(meetingId.trim(), user, meetingPassword);
      }
    } catch (error) {
      console.error('Error joining meeting:', error);
      showNotification('Failed to join meeting. Please check your connection and try again.', 'error');
    }
  };

  /**
   * Fetch company members for scheduling
   */
  const fetchCompanyMembers = async () => {
    try {
      const response = await fetch('/api/company/members');
      if (response.ok) {
        const members = await response.json();
        setCompanyMembers(members);
      }
    } catch (error) {
      console.error('Error fetching company members:', error);
    }
  };

  /**
   * Handle opening schedule modal
   */
  const handleOpenScheduleForm = () => {
    setShowScheduleForm(true);
    fetchCompanyMembers();
    
    // Set default date to today
    const today = new Date();
    const defaultDate = today.toISOString().split('T')[0];
    setScheduleDate(defaultDate);
    
    // Set default time to next hour
    const nextHour = new Date(today.getTime() + 60 * 60 * 1000);
    const defaultTime = nextHour.toTimeString().slice(0, 5);
    setScheduleTime(defaultTime);
  };

  /**
   * Toggle participant selection
   */
  const toggleParticipantSelection = (memberId) => {
    setSelectedParticipants(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  /**
   * Schedule Meeting
   */
  const handleScheduleMeeting = async () => {
    if (!userName.trim() || !scheduledMeetingName.trim() || !scheduleDate || !scheduleTime || !scheduledMeetingPassword.trim()) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    if (selectedParticipants.length === 0) {
      showNotification('Please select at least one participant', 'error');
      return;
    }

    try {
      setIsScheduling(true);

      // Combine date and time into a single datetime
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`);
      
      if (scheduledAt <= new Date()) {
        showNotification('Please select a future date and time', 'error');
        return;
      }

      const response = await fetch('/api/meetings/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: scheduledMeetingName.trim(),
          password: scheduledMeetingPassword.trim(),
          scheduledAt: scheduledAt.toISOString(),
          participants: selectedParticipants.map(id => String(id)),
          hostName: userName.trim()
        }),
      });

      if (response.ok) {
        const result = await response.json();
        showNotification(`Meeting "${scheduledMeetingName}" scheduled successfully! Meeting ID: ${result.meetingId}`, 'success');
        
        // Reset form
        setShowScheduleForm(false);
        setScheduledMeetingName('');
        setScheduledMeetingPassword('');
        setSelectedParticipants([]);
        setScheduleDate('');
        setScheduleTime('');
      } else {
        const error = await response.json();
        showNotification(error.error || 'Failed to schedule meeting', 'error');
      }
    } catch (error) {
      console.error('Error scheduling meeting:', error);
      showNotification('Failed to schedule meeting', 'error');
    } finally {
      setIsScheduling(false);
    }
  };

  /**
   * Copy Meeting ID
   */
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showNotification('Copied to clipboard!');
  };

  return (
    <div className={`min-h-screen overflow-hidden ${inter.className}`} style={{ backgroundColor: COLORS.background }}>
      <Particles />
      
      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 rounded-xl shadow-lg max-w-sm border backdrop-blur-md ${
              notification.type === 'error' 
                ? 'bg-red-900/80 text-red-200 border-red-700' 
                : notification.type === 'success'
                ? 'bg-green-900/80 text-green-200 border-green-700'
                : 'bg-gray-800/80 text-gray-200 border-gray-600'
            }`}
          >
            {notification.message}
          </div>
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Left Side - Video Preview */}
          <div className="space-y-6">
            <div className="bg-gray-800/50 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden border border-gray-700">
              <div className="relative aspect-video bg-gradient-to-br from-gray-800 to-gray-900">
                {isMediaLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: COLORS.accent }}></div>
                      <p className="text-white">Initializing camera...</p>
                    </div>
                  </div>
                ) : mediaError ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <FiVideoOff className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-300 mb-4">Camera not available</p>
                      <button
                        onClick={initializeMedia}
                        className="px-4 py-2 rounded-lg transition-all duration-200 transform hover:scale-105"
                        style={{ 
                          background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})`,
                          color: 'white'
                        }}
                      >
                        Try again
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      style={{ transform: 'scaleX(-1)' }}
                    />
                    {!isVideoEnabled && (
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4 mx-auto" 
                               style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}>
                            <span className="text-2xl font-bold text-white">
                              {userName ? userName.charAt(0).toUpperCase() : 'U'}
                            </span>
                          </div>
                          <p className="text-gray-300">Camera is off</p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              
              {/* Media Controls */}
              <div className="p-6 bg-gray-800/70 backdrop-blur-sm flex justify-center space-x-4">
                <button
                  onClick={toggleAudio}
                  className={`p-4 rounded-full transition-all duration-200 shadow-lg transform hover:scale-105 ${
                    isAudioEnabled 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                      : 'bg-red-600 hover:bg-red-500 text-white'
                  }`}
                  title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
                  disabled={isMediaLoading || mediaError}
                >
                  {isAudioEnabled ? <FiMic className="w-6 h-6" /> : <FiMicOff className="w-6 h-6" />}
                </button>
                
                <button
                  onClick={toggleVideo}
                  className={`p-4 rounded-full transition-all duration-200 shadow-lg transform hover:scale-105 ${
                    isVideoEnabled 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                      : 'bg-red-600 hover:bg-red-500 text-white'
                  }`}
                  title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                  disabled={isMediaLoading || mediaError}
                >
                  {isVideoEnabled ? <FiVideo className="w-6 h-6" /> : <FiVideoOff className="w-6 h-6" />}
                </button>
                
                <button
                  onClick={initializeMedia}
                  className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 transition-all duration-200 shadow-lg transform hover:scale-105"
                  title="Refresh media"
                  disabled={isMediaLoading}
                >
                  <FiSettings className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* User Information */}
            <div className="bg-gray-800/50 backdrop-blur-md rounded-2xl shadow-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Your Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:border-transparent outline-none transition-all"
                    style={{ focusRingColor: COLORS.accent }}
                    onKeyPress={(e) => e.key === 'Enter' && !showJoinForm && handleCreateMeeting()}
                  />
                </div>
                
                {!showJoinForm && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Meeting Name *
                      </label>
                      <input
                        type="text"
                        value={meetingName}
                        onChange={(e) => setMeetingName(e.target.value)}
                        placeholder="Enter meeting name (e.g., Daily Standup)"
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:border-transparent outline-none transition-all"
                        style={{ focusRingColor: COLORS.accent }}
                        onKeyPress={(e) => e.key === 'Enter' && handleCreateMeeting()}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Meeting Password *
                      </label>
                      <input
                        type="password"
                        value={createMeetingPassword}
                        onChange={(e) => setCreateMeetingPassword(e.target.value)}
                        placeholder="Set a password for this meeting"
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:border-transparent outline-none transition-all"
                        style={{ focusRingColor: COLORS.accent }}
                        onKeyPress={(e) => e.key === 'Enter' && handleCreateMeeting()}
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        This password will be required for anyone joining the meeting
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Side - Meeting Options */}
          <div className="space-y-6">
            {!showJoinForm ? (
              // Main options
              <div className="space-y-6">
                <div className="bg-gray-800/50 backdrop-blur-md rounded-2xl shadow-xl p-8 border border-gray-700">
                  <div className="text-center mb-6">
                    <div className="rounded-full p-4 w-16 h-16 mx-auto mb-4" 
                         style={{ background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.secondary})` }}>
                      <FiPlay className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Start a New Meeting</h2>
                    <p className="text-gray-300">Create an instant meeting with AI transcription</p>
                  </div>
                  
                  <button
                    onClick={handleCreateMeeting}
                    disabled={isCreating || !userName.trim() || !meetingName.trim() || !createMeetingPassword.trim()}
                    className="w-full py-4 px-6 rounded-xl font-semibold flex items-center justify-center space-x-3 transition-all duration-200 shadow-lg transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 text-white"
                    style={{ 
                      background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.secondary})`,
                      opacity: (isCreating || !userName.trim() || !meetingName.trim() || !createMeetingPassword.trim()) ? 0.5 : 1
                    }}
                  >
                    {isCreating ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Creating Meeting...</span>
                      </>
                    ) : (
                      <>
                        <FiPlay className="w-5 h-5" />
                        <span>Start Meeting Now</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-gray-800/50 backdrop-blur-md rounded-2xl shadow-xl p-8 border border-gray-700">
                  <div className="text-center mb-6">
                    <div className="rounded-full p-4 w-16 h-16 mx-auto mb-4" 
                         style={{ background: `linear-gradient(135deg, ${COLORS.secondary}, ${COLORS.violet})` }}>
                      <FiPlus className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Join a Meeting</h2>
                    <p className="text-gray-300">Enter a meeting ID to join an existing meeting</p>
                  </div>
                  
                  <button
                    onClick={() => setShowJoinForm(true)}
                    className="w-full py-4 px-6 rounded-xl font-semibold flex items-center justify-center space-x-3 transition-all duration-200 shadow-lg transform hover:scale-105 text-white"
                    style={{ background: `linear-gradient(135deg, ${COLORS.secondary}, ${COLORS.violet})` }}
                  >
                    <FiPlus className="w-5 h-5" />
                    <span>Join with Meeting ID</span>
                  </button>
                </div>

                <div className="bg-gray-800/50 backdrop-blur-md rounded-2xl shadow-xl p-8 border border-gray-700">
                  <div className="text-center mb-6">
                    <div className="rounded-full p-4 w-16 h-16 mx-auto mb-4" 
                         style={{ background: `linear-gradient(135deg, ${COLORS.secondary}, ${COLORS.accent})` }}>
                      <FiCalendar className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Schedule a Meeting</h2>
                    <p className="text-gray-300">Plan a meeting for later with participant invites</p>
                  </div>
                  
                  <button
                    onClick={handleOpenScheduleForm}
                    className="w-full py-4 px-6 rounded-xl font-semibold flex items-center justify-center space-x-3 transition-all duration-200 shadow-lg transform hover:scale-105 text-white"
                    style={{ background: `linear-gradient(135deg, ${COLORS.secondary}, ${COLORS.accent})` }}
                  >
                    <FiCalendar className="w-5 h-5" />
                    <span>Schedule Meeting</span>
                  </button>
                </div>

                {/* Quick Actions */}
                <div className="bg-gray-800/50 backdrop-blur-md rounded-2xl shadow-xl p-8 border border-gray-700">
                  <div className="flex flex-col space-y-4">
                    <button
                      onClick={() => {
                        setIsCreating(true);
                        setShowJoinForm(false);
                        setShowScheduleForm(false);
                      }}
                      className="w-full px-6 py-4 rounded-xl font-semibold flex items-center justify-center shadow-lg transition-all duration-200 transform hover:scale-105 text-white"
                      style={{ background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.secondary})` }}
                    >
                      <FiPlay className="w-5 h-5 mr-2" />
                      Start Instant Meeting
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowJoinForm(true);
                        setIsCreating(false);
                        setShowScheduleForm(false);
                      }}
                      className="w-full px-6 py-4 rounded-xl font-semibold flex items-center justify-center shadow-lg transition-all duration-200 transform hover:scale-105 text-white"
                      style={{ background: `linear-gradient(135deg, ${COLORS.secondary}, ${COLORS.violet})` }}
                    >
                      <FiPlus className="w-5 h-5 mr-2" />
                      Join Meeting
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowScheduleForm(true);
                        setShowJoinForm(false);
                        setIsCreating(false);
                        handleOpenScheduleForm();
                      }}
                      className="w-full px-6 py-4 rounded-xl font-semibold flex items-center justify-center shadow-lg transition-all duration-200 transform hover:scale-105 text-white"
                      style={{ background: `linear-gradient(135deg, ${COLORS.violet}, ${COLORS.accent})` }}
                    >
                      <FiCalendar className="w-5 h-5 mr-2" />
                      Schedule Meeting
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // Join form
              <div className="bg-gray-800/50 backdrop-blur-md rounded-2xl shadow-xl p-8 border border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Join a Meeting</h2>
                  <button
                    onClick={() => setShowJoinForm(false)}
                    className="text-gray-400 hover:text-gray-300 text-2xl font-bold transition-colors"
                  >
                    ×
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Meeting ID *
                    </label>
                    <input
                      type="text"
                      value={meetingId}
                      onChange={(e) => setMeetingId(e.target.value)}
                      placeholder="Enter meeting ID"
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:border-transparent outline-none font-mono text-lg transition-all"
                      style={{ focusRingColor: COLORS.accent }}
                      onKeyPress={(e) => e.key === 'Enter' && handleJoinMeeting()}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Meeting Password
                    </label>
                    <input
                      type="password"
                      value={meetingPassword}
                      onChange={(e) => setMeetingPassword(e.target.value)}
                      placeholder="Enter password (if required)"
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:border-transparent outline-none transition-all"
                      style={{ focusRingColor: COLORS.accent }}
                      onKeyPress={(e) => e.key === 'Enter' && handleJoinMeeting()}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Only required if the meeting is password protected
                    </p>
                  </div>
                  
                  <button
                    onClick={handleJoinMeeting}
                    disabled={!userName.trim() || !meetingId.trim()}
                    className="w-full py-4 px-6 rounded-xl font-semibold transition-all duration-200 shadow-lg transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 text-white"
                    style={{ 
                      background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.secondary})`,
                      opacity: (!userName.trim() || !meetingId.trim()) ? 0.5 : 1
                    }}
                  >
                    Join Meeting
                  </button>
                </div>
              </div>
            )}

            {/* Schedule Meeting Modal */}
            {showScheduleForm && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto border border-gray-700">
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-2xl font-bold text-white">Schedule a Meeting</h3>
                      <button
                        onClick={() => setShowScheduleForm(false)}
                        className="text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        <FiX className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Meeting Name *
                          </label>
                          <input
                            type="text"
                            value={scheduledMeetingName}
                            onChange={(e) => setScheduledMeetingName(e.target.value)}
                            placeholder="Enter meeting name"
                            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:border-transparent outline-none transition-all"
                            style={{ focusRingColor: COLORS.accent }}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Meeting Password *
                          </label>
                          <input
                            type="password"
                            value={scheduledMeetingPassword}
                            onChange={(e) => setScheduledMeetingPassword(e.target.value)}
                            placeholder="Set meeting password"
                            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:border-transparent outline-none transition-all"
                            style={{ focusRingColor: COLORS.accent }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Date *
                          </label>
                          <input
                            type="date"
                            value={scheduleDate}
                            onChange={(e) => setScheduleDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white focus:ring-2 focus:border-transparent outline-none transition-all"
                            style={{ focusRingColor: COLORS.accent }}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Time *
                          </label>
                          <input
                            type="time"
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white focus:ring-2 focus:border-transparent outline-none transition-all"
                            style={{ focusRingColor: COLORS.accent }}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">
                          Invite Participants *
                        </label>
                        <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-600 rounded-xl p-4 bg-gray-700/30">
                          {Array.isArray(companyMembers) && companyMembers.length === 0 ? (
                            <p className="text-gray-400 text-center py-4">Loading company members...</p>
                          ) : (
                            (Array.isArray(companyMembers) ? companyMembers : []).map((member) => (
                              <div
                                key={member._id || member.id}
                                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                                  selectedParticipants.includes(member._id || member.id)
                                    ? 'bg-orange-900/30 border-orange-500 ring-2 ring-orange-500'
                                    : 'bg-gray-700/50 border-gray-600 hover:bg-gray-600/50'
                                }`}
                                onClick={() => toggleParticipantSelection(member._id || member.id)}
                                style={{ minHeight: '56px' }}
                              >
                                <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3" 
                                     style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}>
                                  <span className="text-white text-sm font-medium">
                                    {member.userName?.charAt(0).toUpperCase() || '?'}
                                  </span>
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-white">{member.userName || member.name || 'Unknown'}</p>
                                  <p className="text-sm text-gray-400">{member.email || ''}</p>
                                </div>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ml-2 ${
                                  selectedParticipants.includes(member._id || member.id)
                                    ? 'border-orange-500' 
                                    : 'border-gray-500 bg-gray-700'
                                }`}
                                style={{ backgroundColor: selectedParticipants.includes(member._id || member.id) ? COLORS.accent : undefined }}
                                >
                                  {selectedParticipants.includes(member._id || member.id) && (
                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          Selected: {selectedParticipants.length} participant{selectedParticipants.length !== 1 ? 's' : ''}
                        </p>
                      </div>

                      <div className="flex justify-end space-x-4 pt-4 border-t border-gray-600">
                        <button
                          onClick={() => setShowScheduleForm(false)}
                          className="px-6 py-3 text-gray-400 hover:text-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleScheduleMeeting}
                          disabled={!userName.trim() || !scheduledMeetingName.trim() || !scheduleDate || !scheduleTime || !scheduledMeetingPassword.trim() || selectedParticipants.length === 0 || isScheduling}
                          className="px-6 py-3 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-white"
                          style={{ background: `linear-gradient(135deg, ${COLORS.secondary}, ${COLORS.accent})` }}
                        >
                          {isScheduling ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Scheduling...</span>
                            </>
                          ) : (
                            <>
                              <FiCalendar className="w-5 h-5" />
                              <span>Schedule Meeting</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingJoin;
