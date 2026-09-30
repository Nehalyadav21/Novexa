'use client';

import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const MeetingHub = ({ user, onJoinMeeting }) => {
  const [meetings, setMeetings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    description: '',
    meetingId: ''
  });
  
  const [joinMeetingId, setJoinMeetingId] = useState('');

  // Load meetings and users on component mount
  useEffect(() => {
    loadMeetings();
    loadAvailableUsers();
  }, []);

  const loadMeetings = async () => {
    try {
      const response = await fetch('/api/meetings');
      if (response.ok) {
        const data = await response.json();
        // API returns meetings array directly
        setMeetings(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error loading meetings:', error);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const users = await response.json();
        // API returns users array directly, filter out current user
        setAvailableUsers(Array.isArray(users) ? users.filter(u => u._id !== user.userId) : []);
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

    setIsLoading(true);
    try {
      const meetingData = {
        title: newMeeting.title,
        description: newMeeting.description,
        scheduledAt: new Date().toISOString(), // Required by API
        participants: selectedParticipants.map(p => ({ 
          userId: p._id, 
          userName: p.name || p.email,
          email: p.email
        })),
        settings: {
          audioEnabled: true,
          videoEnabled: true,
          transcriptionEnabled: true,
          recordingEnabled: false
        }
      };

      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meetingData)
      });

      if (response.ok) {
        const result = await response.json();
        const meetingId = result.meeting.meetingId;
        
        alert(`Meeting created successfully! Meeting ID: ${meetingId}`);
        
        // Reset form
        setNewMeeting({ title: '', description: '', meetingId: '' });
        setSelectedParticipants([]);
        setShowCreateModal(false);
        
        // Refresh meetings list
        await loadMeetings();
        
        // Automatically join the created meeting
        onJoinMeeting(meetingId, user);

      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create meeting');
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
      // Check if meeting exists and user can join
      const response = await fetch(`/api/meetings/${joinMeetingId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.userId,
          userName: user.name || user.email,
          email: user.email
        })
      });

      if (response.ok) {
        setShowJoinModal(false);
        setJoinMeetingId('');
        onJoinMeeting(joinMeetingId, user);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to join meeting');
      }
    } catch (error) {
      console.error('Error joining meeting:', error);
      alert(`Failed to join meeting: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">Video Meetings</h1>
          <p className="text-gray-600">
            Start instant meetings or join with meeting ID
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>New Meeting</span>
          </button>
          <button
            onClick={() => setShowJoinModal(true)}
            className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Join Meeting</span>
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-blue-50 p-6 rounded-lg mb-8">
        <h2 className="text-lg font-semibold mb-4">Quick Start</h2>
        <div className="space-y-3">
          <button
            onClick={() => {
              const instantMeetingId = uuidv4();
              onJoinMeeting(instantMeetingId, user);
            }}
            className="w-full text-left p-3 hover:bg-blue-100 rounded-lg flex items-center space-x-3"
          >
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>Start instant meeting</span>
          </button>
          <button
            onClick={() => setShowJoinModal(true)}
            className="w-full text-left p-3 hover:bg-blue-100 rounded-lg flex items-center space-x-3"
          >
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Join meeting with ID</span>
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
                        meeting.status === 'started' ? 'bg-green-100 text-green-800' : 
                        meeting.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                        meeting.status === 'ended' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {meeting.status}
                      </span>
                    </div>
                    
                    {meeting.description && (
                      <p className="text-gray-600 mb-3">{meeting.description}</p>
                    )}
                    
                    <div className="flex items-center space-x-4 mb-3 text-sm text-gray-600">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                        {meeting.participants?.length || 0} participants
                      </div>
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Created {new Date(meeting.createdAt || meeting.scheduledAt).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-500 font-mono">
                      Meeting ID: {meeting.meetingId}
                    </p>
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={() => onJoinMeeting(meeting.meetingId, user)}
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

      {/* Create Meeting Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Create New Meeting</h2>
            <div className="space-y-4">
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

export default MeetingHub;
