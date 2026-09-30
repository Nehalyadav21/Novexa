'use client';

import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { FiVideo, FiUsers, FiClock, FiSettings } from 'react-icons/fi';

/**
 * Enhanced Meeting Hub with Agora Web SDK Integration
 * Supports both traditional WebRTC and Agora video meetings
 */
const AgoraMeetingHub = ({ user, onJoinMeeting, onJoinAgoraMeeting }) => {
  const [meetings, setMeetings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showAgoraConfig, setShowAgoraConfig] = useState(false);
  
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    description: '',
    type: 'agora', // 'agora' or 'webrtc'
    meetingId: ''
  });
  
  const [joinMeetingId, setJoinMeetingId] = useState('');
  
  // Agora configuration
  const [agoraConfig, setAgoraConfig] = useState({
    appId: process.env.NEXT_PUBLIC_AGORA_APP_ID || '',
    token: '', // Optional - use null for testing
    configured: false
  });

  // Load meetings and users on component mount
  useEffect(() => {
    loadMeetings();
    loadAvailableUsers();
    checkAgoraConfiguration();
  }, []);

  /**
   * Check if Agora is properly configured
   */
  const checkAgoraConfiguration = () => {
    const configured = !!(process.env.NEXT_PUBLIC_AGORA_APP_ID || agoraConfig.appId);
    setAgoraConfig(prev => ({ ...prev, configured }));
  };

  const loadMeetings = async () => {
    try {
      const response = await fetch('/api/meetings');
      if (response.ok) {
        const data = await response.json();
        setMeetings(data.meetings || []);
      }
    } catch (error) {
      console.error('Error loading meetings:', error);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setAvailableUsers(data.users?.filter(u => u._id !== user.userId) || []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleCreateMeeting = async () => {
    if (!newMeeting.title.trim()) {
      alert('Meeting title is required');
      return;
    }

    if (newMeeting.type === 'agora' && !agoraConfig.configured) {
      alert('Agora App ID is required for Agora meetings. Please configure it first.');
      setShowAgoraConfig(true);
      return;
    }

    setIsLoading(true);
    try {
      const meetingId = uuidv4();
      
      const meetingData = {
        meetingId,
        title: newMeeting.title,
        description: newMeeting.description,
        type: newMeeting.type,
        participants: [
          { 
            userId: user.userId, 
            email: user.email, 
            name: user.name || user.email,
            role: 'host' 
          },
          ...selectedParticipants.map(p => ({ 
            userId: p._id, 
            email: p.email, 
            name: p.name || p.email,
            role: 'participant' 
          }))
        ],
        createdBy: user.userId,
        createdAt: new Date(),
        status: 'active',
        agoraConfig: newMeeting.type === 'agora' ? {
          appId: agoraConfig.appId || process.env.NEXT_PUBLIC_AGORA_APP_ID,
          token: agoraConfig.token || null
        } : undefined
      };

      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meetingData)
      });

      if (response.ok) {
        alert(`${newMeeting.type === 'agora' ? 'Agora' : 'WebRTC'} meeting created successfully! Meeting ID: ${meetingId}`);
        
        // Reset form
        setNewMeeting({ title: '', description: '', type: 'agora', meetingId: '' });
        setSelectedParticipants([]);
        setShowCreateModal(false);
        
        // Refresh meetings list
        await loadMeetings();
        
        // Automatically join the created meeting
        if (newMeeting.type === 'agora') {
          onJoinAgoraMeeting(meetingId, user, meetingData.agoraConfig);
        } else {
          onJoinMeeting(meetingId, user);
        }

      } else {
        throw new Error('Failed to create meeting');
      }
    } catch (error) {
      console.error('Error creating meeting:', error);
      alert(`Failed to create meeting: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinMeetingById = async () => {
    if (!joinMeetingId.trim()) {
      alert('Meeting ID is required');
      return;
    }

    setIsLoading(true);
    try {
      // Check if meeting exists and get its configuration
      const response = await fetch(`/api/meetings/${joinMeetingId}`);

      if (response.ok) {
        const meetingData = await response.json();
        setShowJoinModal(false);
        setJoinMeetingId('');
        
        // Join based on meeting type
        if (meetingData.meeting?.type === 'agora') {
          onJoinAgoraMeeting(joinMeetingId, user, meetingData.meeting.agoraConfig);
        } else {
          onJoinMeeting(joinMeetingId, user);
        }
      } else {
        throw new Error('Meeting not found or access denied');
      }
    } catch (error) {
      console.error('Error joining meeting:', error);
      alert(`Failed to join meeting: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstantAgoraMeeting = () => {
    if (!agoraConfig.configured) {
      alert('Agora App ID is required. Please configure it first.');
      setShowAgoraConfig(true);
      return;
    }
    
    const instantMeetingId = uuidv4();
    onJoinAgoraMeeting(instantMeetingId, user, {
      appId: agoraConfig.appId || process.env.NEXT_PUBLIC_AGORA_APP_ID,
      token: agoraConfig.token || null
    });
  };

  const copyMeetingId = (meetingId) => {
    navigator.clipboard.writeText(meetingId);
    alert('Meeting ID copied to clipboard');
  };

  const deleteMeeting = async (meetingId) => {
    try {
      const response = await fetch(`/api/meetings/${meetingId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Meeting deleted');
        await loadMeetings();
      } else {
        throw new Error('Failed to delete meeting');
      }
    } catch (error) {
      console.error('Error deleting meeting:', error);
      alert(`Failed to delete meeting: ${error.message}`);
    }
  };

  const toggleParticipant = (selectedUser) => {
    setSelectedParticipants(prev => {
      const exists = prev.find(p => p._id === selectedUser._id);
      if (exists) {
        return prev.filter(p => p._id !== selectedUser._id);
      } else {
        return [...prev, selectedUser];
      }
    });
  };

  const saveAgoraConfig = () => {
    if (!agoraConfig.appId.trim()) {
      alert('Agora App ID is required');
      return;
    }
    
    setAgoraConfig(prev => ({ ...prev, configured: true }));
    setShowAgoraConfig(false);
    alert('Agora configuration saved successfully!');
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">Video Meetings</h1>
          <p className="text-gray-600">
            Start Agora video meetings with real-time transcription or traditional WebRTC calls
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => setShowAgoraConfig(true)}
            className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2"
            title="Configure Agora Settings"
          >
            <FiSettings />
            <span>Agora Config</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <FiVideo />
            <span>New Meeting</span>
          </button>
          <button
            onClick={() => setShowJoinModal(true)}
            className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <FiUsers />
            <span>Join Meeting</span>
          </button>
        </div>
      </div>

      {/* Agora Configuration Status */}
      <div className={`mb-6 p-4 rounded-lg border ${
        agoraConfig.configured 
          ? 'bg-green-50 border-green-200' 
          : 'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            agoraConfig.configured ? 'bg-green-500' : 'bg-yellow-500'
          }`}></div>
          <span className="font-medium">
            Agora Web SDK: {agoraConfig.configured ? 'Configured' : 'Not Configured'}
          </span>
        </div>
        {!agoraConfig.configured && (
          <p className="text-sm text-gray-600 mt-1">
            Configure your Agora App ID to enable high-quality video meetings with real-time transcription
          </p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-blue-50 p-6 rounded-lg mb-8">
        <h2 className="text-lg font-semibold mb-4">Quick Start</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleInstantAgoraMeeting}
            disabled={!agoraConfig.configured}
            className={`text-left p-4 rounded-lg flex items-center space-x-3 transition-colors ${
              agoraConfig.configured 
                ? 'hover:bg-blue-100 bg-white border border-blue-200' 
                : 'bg-gray-100 text-gray-500 cursor-not-allowed'
            }`}
          >
            <div className="flex-shrink-0">
              <FiVideo className={`w-6 h-6 ${agoraConfig.configured ? 'text-blue-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <h3 className="font-medium">Start Agora Meeting</h3>
              <p className="text-sm text-gray-600">
                High-quality video with real-time transcription
              </p>
            </div>
          </button>
          
          <button
            onClick={() => {
              const instantMeetingId = uuidv4();
              onJoinMeeting(instantMeetingId, user);
            }}
            className="text-left p-4 hover:bg-blue-100 bg-white border border-blue-200 rounded-lg flex items-center space-x-3"
          >
            <div className="flex-shrink-0">
              <FiUsers className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium">Start WebRTC Meeting</h3>
              <p className="text-sm text-gray-600">
                Traditional peer-to-peer video calling
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Meetings */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Meetings</h2>
        
        {meetings.length === 0 ? (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-800">No meetings found. Create your first meeting to get started.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {meetings.map((meeting) => (
              <div
                key={meeting._id}
                className="p-5 border border-gray-200 rounded-lg bg-white shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <h3 className="text-lg font-semibold mr-3">{meeting.title}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        meeting.type === 'agora' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {meeting.type === 'agora' ? 'Agora SDK' : 'WebRTC'}
                      </span>
                      <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                        meeting.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {meeting.status}
                      </span>
                    </div>
                    
                    {meeting.description && (
                      <p className="text-gray-600 mb-3">{meeting.description}</p>
                    )}
                    
                    <div className="flex items-center space-x-4 mb-3 text-sm text-gray-600">
                      <div className="flex items-center">
                        <FiUsers className="w-4 h-4 mr-1" />
                        {meeting.participants?.length || 0} participants
                      </div>
                      <div className="flex items-center">
                        <FiClock className="w-4 h-4 mr-1" />
                        Created {new Date(meeting.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-500 font-mono">
                      Meeting ID: {meeting.meetingId}
                    </p>
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={() => {
                        if (meeting.type === 'agora') {
                          onJoinAgoraMeeting(meeting.meetingId, user, meeting.agoraConfig);
                        } else {
                          onJoinMeeting(meeting.meetingId, user);
                        }
                      }}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm"
                    >
                      Join
                    </button>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => copyMeetingId(meeting.meetingId)}
                        className="p-2 text-gray-400 hover:text-gray-600"
                        title="Copy meeting ID"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteMeeting(meeting.meetingId)}
                        className="p-2 text-red-400 hover:text-red-600"
                        title="Delete meeting"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Agora Configuration Modal */}
      {showAgoraConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Agora Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Agora App ID *</label>
                <input
                  type="text"
                  value={agoraConfig.appId}
                  onChange={(e) => setAgoraConfig(prev => ({ ...prev, appId: e.target.value }))}
                  placeholder="Enter your Agora App ID"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Get your App ID from the Agora Console
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Token (Optional)</label>
                <input
                  type="text"
                  value={agoraConfig.token}
                  onChange={(e) => setAgoraConfig(prev => ({ ...prev, token: e.target.value }))}
                  placeholder="Leave empty for testing"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">
                  For production, generate tokens for each meeting
                </p>
              </div>
              
              <div className="bg-blue-50 p-3 rounded-md">
                <h4 className="font-medium text-sm mb-2">Setup Instructions:</h4>
                <ol className="text-xs text-gray-700 space-y-1 list-decimal list-inside">
                  <li>Sign up at <a href="https://console.agora.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Agora Console</a></li>
                  <li>Create a new project</li>
                  <li>Copy the App ID and paste it above</li>
                  <li>For production, implement token generation</li>
                </ol>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowAgoraConfig(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={saveAgoraConfig}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Meeting Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Create New Meeting</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Meeting Type</label>
                <select
                  value={newMeeting.type}
                  onChange={(e) => setNewMeeting(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="agora">Agora SDK (Recommended)</option>
                  <option value="webrtc">WebRTC P2P</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Agora provides better quality and real-time transcription
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Meeting Title *</label>
                <input
                  type="text"
                  value={newMeeting.title}
                  onChange={(e) => setNewMeeting(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter meeting title"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={newMeeting.description}
                  onChange={(e) => setNewMeeting(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional meeting description"
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Invite Participants</label>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
                  {availableUsers.length === 0 ? (
                    <p className="text-sm text-gray-500">No other users available</p>
                  ) : (
                    <div className="space-y-2">
                      {availableUsers.map((availableUser) => (
                        <label key={availableUser._id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedParticipants.some(p => p._id === availableUser._id)}
                            onChange={() => toggleParticipant(availableUser)}
                            className="mr-2"
                          />
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-2">
                              {(availableUser.name || availableUser.email).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {availableUser.name || availableUser.email}
                              </p>
                              <p className="text-xs text-gray-500">
                                {availableUser.email}
                              </p>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateMeeting}
                  disabled={isLoading}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
                >
                  {isLoading ? 'Creating...' : 'Create & Start Meeting'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Join Meeting Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Join Meeting</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Meeting ID *</label>
                <input
                  type="text"
                  value={joinMeetingId}
                  onChange={(e) => setJoinMeetingId(e.target.value)}
                  placeholder="Enter meeting ID"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowJoinModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleJoinMeetingById}
                  disabled={isLoading}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
                >
                  {isLoading ? 'Joining...' : 'Join Meeting'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgoraMeetingHub;
