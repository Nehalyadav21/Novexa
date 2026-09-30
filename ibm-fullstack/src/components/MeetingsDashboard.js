'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Inter } from 'next/font/google';
import { COLORS } from '@/lib/theme';
import { 
  FiCalendar, 
  FiUsers, 
  FiClock, 
  FiFileText, 
  FiEye, 
  FiDownload,
  FiSearch,
  FiFilter,
  FiChevronLeft,
  FiChevronRight,
  FiMessageSquare,
  FiVideo
} from 'react-icons/fi';

const inter = Inter({ subsets: ['latin'] });

const MeetingsDashboard = () => {
  const { data: session } = useSession();
  const [meetings, setMeetings] = useState([]);
  const [companyMembers, setCompanyMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [showTranscripts, setShowTranscripts] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedMeetingForInvite, setSelectedMeetingForInvite] = useState(null);
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    description: '',
    scheduledAt: '',
    invitedMembers: [],
    settings: {
      audioEnabled: true,
      videoEnabled: true,
      transcriptionEnabled: true,
      recordingEnabled: false
    }
  });

  // Fetch meetings from API
  const fetchMeetings = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      const response = await fetch(`/api/meetings?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch meetings');
      }
      
      const data = await response.json();
      
      // Handle the new paginated response format
      if (data.meetings) {
        setMeetings(data.meetings);
        setPagination(data.pagination || {});
      } else if (Array.isArray(data)) {
        // Fallback for old format
        setMeetings(data);
        setPagination({});
      } else {
        setMeetings([]);
        setPagination({});
      }
      
    } catch (error) {
      console.error('Error fetching meetings:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch company members for scheduling
  const fetchCompanyMembers = async () => {
    try {
      const response = await fetch('/api/company/members');
      if (response.ok) {
        const data = await response.json();
        setCompanyMembers(data.members || []);
      }
    } catch (error) {
      console.error('Error fetching company members:', error);
    }
  };

  // Check for timed-out meetings periodically
  const checkMeetingTimeouts = async () => {
    try {
      await fetch('/api/meetings/timeout', { method: 'POST' });
    } catch (error) {
      console.error('Error checking meeting timeouts:', error);
    }
  };

  // Load meetings on component mount and when filters change
  useEffect(() => {
    fetchMeetings(currentPage);
    fetchCompanyMembers();
    
    // Check for timed-out meetings every 30 seconds
    const timeoutInterval = setInterval(checkMeetingTimeouts, 30000);
    
    return () => clearInterval(timeoutInterval);
  }, [statusFilter, currentPage]);

  // Filter meetings based on search term
  const filteredMeetings = meetings.filter(meeting => 
    meeting.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    meeting.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    meeting.hostName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    meeting.participants?.some(p => p.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Generate summary for a meeting
  const generateSummaryForMeeting = async (meetingId) => {
    setGeneratingSummary(true);
    try {
      const response = await fetch(`/api/meetings/${meetingId}/summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const data = await response.json();
      
      // Update the selected meeting with the new summary
      if (selectedMeeting && selectedMeeting.id === meetingId) {
        setSelectedMeeting({
          ...selectedMeeting,
          summary: data.summary,
          summaryGeneratedAt: data.summaryGeneratedAt
        });
      }

      // Refresh the meetings list
      fetchMeetings(currentPage);
      
    } catch (error) {
      console.error('Error generating summary:', error);
      setError('Failed to generate summary. Please try again.');
    } finally {
      setGeneratingSummary(false);
    }
  };

  // Schedule a new meeting
  const handleScheduleMeeting = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/meetings/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMeeting)
      });

      if (response.ok) {
        setShowScheduleModal(false);
        setNewMeeting({
          title: '',
          description: '',
          scheduledAt: '',
          invitedMembers: [],
          settings: {
            audioEnabled: true,
            videoEnabled: true,
            transcriptionEnabled: true,
            recordingEnabled: false
          }
        });
        fetchMeetings(currentPage);
        alert('Meeting scheduled successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to schedule meeting');
      }
    } catch (error) {
      console.error('Error scheduling meeting:', error);
      alert('Failed to schedule meeting');
    }
  };

  // Invite members to an ongoing meeting
  const handleInviteToMeeting = async (meetingId, invitedMembers) => {
    try {
      const response = await fetch(`/api/meetings/${meetingId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitedMembers })
      });

      if (response.ok) {
        setShowInviteModal(false);
        fetchMeetings(currentPage);
        alert('Invitations sent successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to send invitations');
      }
    } catch (error) {
      console.error('Error inviting to meeting:', error);
      alert('Failed to send invitations');
    }
  };

  // Get status badge color
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'started': return 'bg-green-100 text-green-800';
      case 'ended': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status color for card header (text color for white background)
  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-200 text-blue-900';
      case 'started': return 'bg-green-200 text-green-900';
      case 'ended': return 'bg-gray-200 text-gray-900';
      case 'cancelled': return 'bg-red-200 text-red-900';
      default: return 'bg-gray-200 text-gray-900';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format duration
  const formatDuration = (minutes) => {
    if (!minutes || minutes === 0) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Export transcripts
  const exportTranscripts = (meeting, format = 'json') => {
    if (!meeting.transcripts || meeting.transcripts.length === 0) {
      alert('No transcripts available for this meeting');
      return;
    }

    let content, filename, mimeType;

    if (format === 'json') {
      content = JSON.stringify({
        meetingId: meeting.meetingId,
        title: meeting.title,
        date: meeting.startedAt || meeting.scheduledAt,
        participants: meeting.participants,
        transcripts: meeting.transcripts,
        summary: meeting.summary
      }, null, 2);
      filename = `meeting-${meeting.meetingId}-transcripts.json`;
      mimeType = 'application/json';
    } else if (format === 'txt') {
      const header = `Meeting: ${meeting.title}\nDate: ${formatDate(meeting.startedAt || meeting.scheduledAt)}\nParticipants: ${meeting.participants?.join(', ')}\n\n`;
      const transcriptText = meeting.transcripts
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .map(t => `[${formatDate(t.timestamp)}] ${t.userName}: ${t.text}`)
        .join('\n');
      
      content = header + transcriptText;
      if (meeting.summary) {
        content += '\n\n--- MEETING SUMMARY ---\n' + meeting.summary;
      }
      filename = `meeting-${meeting.meetingId}-transcripts.txt`;
      mimeType = 'text/plain';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Meeting Detail Modal
  const MeetingDetailModal = ({ meeting, onClose }) => {
    const [chatQuestion, setChatQuestion] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [chatLoading, setChatLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('summary'); // 'summary', 'transcripts', 'chat'

    if (!meeting) return null;

    // Handle AI chat question
    const handleChatSubmit = async (e) => {
      e.preventDefault();
      if (!chatQuestion.trim() || chatLoading) return;

      const question = chatQuestion.trim();
      setChatQuestion('');
      setChatLoading(true);

      // Add user question to chat history
      const userMessage = {
        id: Date.now(),
        type: 'user',
        content: question,
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, userMessage]);

      try {
        const response = await fetch(`/api/meetings/${meeting.id}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ question })
        });

        if (response.ok) {
          const { answer } = await response.json();
          const aiMessage = {
            id: Date.now() + 1,
            type: 'ai',
            content: answer,
            timestamp: new Date()
          };
          setChatHistory(prev => [...prev, aiMessage]);
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to get response');
        }
      } catch (error) {
        console.error('Chat error:', error);
        const errorMessage = {
          id: Date.now() + 1,
          type: 'error',
          content: `Sorry, I couldn't answer your question: ${error.message}`,
          timestamp: new Date()
        };
        setChatHistory(prev => [...prev, errorMessage]);
      } finally {
        setChatLoading(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
          {/* Header */}
          <div className="text-white p-6" style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}>
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold mb-2">{meeting.title}</h2>
                <p className="text-orange-100">{meeting.description}</p>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col h-[70vh]">
            {/* Meeting Info */}
            <div className="p-6 border-b border-gray-600">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <FiCalendar style={{ color: COLORS.accent }} />
                    <div>
                      <p className="text-sm text-gray-400">Scheduled</p>
                      <p className="font-medium text-white">{formatDate(meeting.scheduledAt)}</p>
                    </div>
                  </div>
                  
                  {meeting.startedAt && (
                    <div className="flex items-center space-x-3">
                      <FiVideo style={{ color: COLORS.tertiary }} />
                      <div>
                        <p className="text-sm text-gray-400">Started</p>
                        <p className="font-medium text-white">{formatDate(meeting.startedAt)}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-3">
                    <FiClock className="text-purple-600" />
                    <div>
                      <p className="text-sm text-gray-500">Duration</p>
                      <p className="font-medium">{formatDuration(meeting.duration)}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <FiUsers className="text-indigo-600" />
                    <div>
                      <p className="text-sm text-gray-500">Participants ({meeting.participantCount})</p>
                      <p className="font-medium">{meeting.participants?.join(', ')}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <FiMessageSquare className="text-orange-600" />
                    <div>
                      <p className="text-sm text-gray-500">Transcripts</p>
                      <p className="font-medium">{meeting.transcriptCount} messages</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'summary'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <FiFileText className="inline mr-2" />
                  Summary
                </button>
                <button
                  onClick={() => setActiveTab('transcripts')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'transcripts'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <FiMessageSquare className="inline mr-2" />
                  Transcripts
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'chat'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <FiSearch className="inline mr-2" />
                  AI Chat
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'summary' && (
                <div>
                  {meeting.summary ? (
                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4">
                      <div className="prose prose-sm max-w-none">
                        <div className="whitespace-pre-wrap text-gray-700">
                          {meeting.summary}
                        </div>
                      </div>
                      {meeting.summaryGeneratedAt && (
                        <p className="text-xs text-gray-500 mt-3">
                          Generated on {formatDate(meeting.summaryGeneratedAt)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <FiFileText className="mx-auto h-12 w-12 mb-4" />
                      <p>No summary available for this meeting</p>
                      {meeting.transcripts && meeting.transcripts.length > 0 && (
                        <button
                          onClick={() => generateSummaryForMeeting(meeting.id)}
                          disabled={generatingSummary}
                          className="mt-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center mx-auto"
                        >
                          {generatingSummary ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Generating...
                            </>
                          ) : (
                            <>
                              <FiFileText className="mr-2" />
                              Generate Summary
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'transcripts' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Meeting Transcripts</h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => exportTranscripts(meeting, 'txt')}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm flex items-center"
                      >
                        <FiDownload className="mr-1" size={14} />
                        TXT
                      </button>
                      <button
                        onClick={() => exportTranscripts(meeting, 'json')}
                        className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-lg text-sm flex items-center"
                      >
                        <FiDownload className="mr-1" size={14} />
                        JSON
                      </button>
                    </div>
                  </div>
                  
                  {meeting.transcripts && meeting.transcripts.length > 0 ? (
                    <div className="space-y-3">
                      {meeting.transcripts
                        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                        .map((transcript, index) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-medium text-blue-600">{transcript.userName}</span>
                              <span className="text-xs text-gray-500">
                                {formatDate(transcript.timestamp)}
                              </span>
                            </div>
                            <p className="text-gray-700">{transcript.text}</p>
                            {transcript.confidence && (
                              <span className="text-xs text-gray-400">
                                Confidence: {Math.round(transcript.confidence * 100)}%
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <FiMessageSquare className="mx-auto h-12 w-12 mb-4" />
                      <p>No transcripts available</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'chat' && (
                <div className="flex flex-col h-full">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-2">Ask AI about this meeting</h3>
                    <p className="text-sm text-gray-600">
                      Ask questions about the meeting content, decisions made, action items, or any specific discussions.
                    </p>
                  </div>

                  {/* Chat History */}
                  <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                    {chatHistory.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <FiSearch className="mx-auto h-12 w-12 mb-4" />
                        <p>Start by asking a question about this meeting</p>
                        <div className="mt-4 text-sm">
                          <p className="font-medium mb-2">Example questions:</p>
                          <ul className="text-left max-w-md mx-auto space-y-1">
                            <li>• What were the main decisions made?</li>
                            <li>• Who was assigned what tasks?</li>
                            <li>• What deadlines were mentioned?</li>
                            <li>• What did [person] say about [topic]?</li>
                          </ul>
                        </div>
                      </div>
                    ) : (
                      chatHistory.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.type === 'user'
                                ? 'bg-blue-500 text-white'
                                : message.type === 'error'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{message.content}</p>
                            <p className="text-xs mt-1 opacity-70">
                              {message.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            <span>AI is thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Chat Input */}
                  <form onSubmit={handleChatSubmit} className="flex space-x-2">
                    <input
                      type="text"
                      value={chatQuestion}
                      onChange={(e) => setChatQuestion(e.target.value)}
                      placeholder="Ask a question about this meeting..."
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={chatLoading || !meeting.hasTranscripts}
                    />
                    <button
                      type="submit"
                      disabled={!chatQuestion.trim() || chatLoading || !meeting.hasTranscripts}
                      className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      <FiSearch className="w-5 h-5" />
                    </button>
                  </form>
                  
                  {!meeting.hasTranscripts && (
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      No transcripts available for this meeting to chat about
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600">Loading meetings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${inter.className}`} style={{ backgroundColor: COLORS.background }}>
      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur-md shadow-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center">
                <FiCalendar className="mr-3" style={{ color: COLORS.accent }} />
                Meetings Dashboard
              </h1>
              <p className="mt-2 text-gray-300">
                Schedule new meetings, manage invites, and view meeting history
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button
                onClick={() => setShowScheduleModal(true)}
                className="px-6 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 flex items-center text-white"
                style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}
              >
                <FiCalendar className="mr-2" />
                Schedule Meeting
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-gray-800/50 backdrop-blur-md rounded-xl shadow-lg p-6 mb-6 border border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search meetings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:border-transparent"
                style={{ focusRingColor: COLORS.accent }}
              />
            </div>

            {/* Filter */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <FiFilter className="text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:border-transparent"
                  style={{ focusRingColor: COLORS.accent }}
                >
                  <option value="all">All Status</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="started">Started</option>
                  <option value="ended">Ended</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 mb-6 backdrop-blur-sm">
            <p className="text-red-200">Error: {error}</p>
            <button
              onClick={() => fetchMeetings(currentPage)}
              className="text-red-400 hover:text-red-300 underline mt-2 transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {/* Meetings Grid */}
        {filteredMeetings.length === 0 ? (
          <div className="bg-gray-800/50 backdrop-blur-md rounded-xl shadow-lg p-12 text-center border border-gray-700">
            <FiCalendar className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">No meetings found</h3>
            <p className="text-gray-300">
              {searchTerm ? 'Try adjusting your search or filters' : 'Your meetings will appear here'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMeetings.map((meeting) => (
              <div
                key={meeting.id || meeting._id}
                className="bg-gray-800/50 backdrop-blur-md rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-700 transform hover:scale-105"
              >
                {/* Card Header */}
                <div className="p-4 text-white" style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1 line-clamp-2">
                        {meeting.title}
                      </h3>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(meeting.status)}`}>
                        {meeting.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 bg-gray-800/30">
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-300">
                      <FiCalendar className="mr-2" style={{ color: COLORS.accent }} size={16} />
                      {formatDate(meeting.startedAt || meeting.scheduledAt)}
                    </div>

                    <div className="flex items-center text-sm text-gray-300">
                      <FiUsers className="mr-2" style={{ color: COLORS.secondary }} size={16} />
                      {meeting.participantCount} participants
                    </div>

                    <div className="flex items-center text-sm text-gray-300">
                      <FiClock className="mr-2" style={{ color: COLORS.tertiary }} size={16} />
                      {formatDuration(meeting.duration)}
                    </div>

                    {meeting.hasTranscripts && (
                      <div className="flex items-center text-sm text-gray-300">
                        <FiMessageSquare className="mr-2" style={{ color: COLORS.primary }} size={16} />
                        {meeting.transcriptCount} transcripts
                      </div>
                    )}

                    {meeting.hasSummary && (
                      <div className="flex items-center text-sm text-green-400">
                        <FiFileText className="mr-2" size={16} />
                        AI Summary Available
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 pt-4 border-t border-gray-600">
                    <div className="flex flex-col space-y-2">
                      <div className="flex justify-between items-center">
                        <button
                          onClick={() => setSelectedMeeting(meeting)}
                          className="px-4 py-2 rounded-lg text-sm flex items-center transition-all duration-200 transform hover:scale-105 text-white"
                          style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}
                        >
                          <FiEye className="mr-1" size={14} />
                          View Details
                        </button>

                        {meeting.hasTranscripts && (
                          <button
                            onClick={() => exportTranscripts(meeting, 'txt')}
                            className="text-gray-400 hover:text-gray-200 transition-colors"
                            title="Download Transcripts"
                          >
                            <FiDownload size={18} />
                          </button>
                        )}
                      </div>
                      
                      {/* Meeting-specific actions */}
                      <div className="flex space-x-2">
                        {meeting.status === 'scheduled' && (
                          <button
                            onClick={() => window.open(`/meeting/${meeting.meetingId}`, '_blank')}
                            className="flex-1 px-3 py-2 rounded-lg text-sm flex items-center justify-center transition-all duration-200 transform hover:scale-105 text-white"
                            style={{ background: `linear-gradient(135deg, ${COLORS.tertiary}, ${COLORS.primary})` }}
                          >
                            <FiVideo className="mr-1" size={14} />
                            Join
                          </button>
                        )}
                        
                        {meeting.status === 'started' && meeting.hostId === session?.user?.id && (
                          <button
                            onClick={() => {
                              setSelectedMeetingForInvite(meeting);
                              setShowInviteModal(true);
                            }}
                            className="flex-1 px-3 py-2 rounded-lg text-sm flex items-center justify-center transition-all duration-200 transform hover:scale-105 text-white"
                            style={{ background: `linear-gradient(135deg, ${COLORS.secondary}, ${COLORS.accent})` }}
                          >
                            <FiUsers className="mr-1" size={14} />
                            Invite
                          </button>
                        )}
                        
                        {meeting.status === 'started' && (
                          <button
                            onClick={() => window.open(`/meeting/${meeting.meetingId}`, '_blank')}
                            className="flex-1 px-3 py-2 rounded-lg text-sm flex items-center justify-center transition-all duration-200 transform hover:scale-105 text-white font-medium shadow-lg"
                            style={{ background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.secondary})` }}
                          >
                            <FiVideo className="mr-1" size={14} />
                            Join Live
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="mt-8 flex justify-center items-center space-x-4">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={!pagination.hasPrev}
              className="flex items-center px-4 py-2 text-gray-600 bg-white rounded-lg shadow hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiChevronLeft className="mr-1" />
              Previous
            </button>

            <span className="text-gray-600">
              Page {pagination.page} of {pagination.pages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
              disabled={!pagination.hasNext}
              className="flex items-center px-4 py-2 text-gray-600 bg-white rounded-lg shadow hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <FiChevronRight className="ml-1" />
            </button>
          </div>
        )}
      </div>

      {/* Meeting Detail Modal */}
      {selectedMeeting && (
        <MeetingDetailModal
          meeting={selectedMeeting}
          onClose={() => setSelectedMeeting(null)}
        />
      )}

      {/* Schedule Meeting Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800/90 backdrop-blur-md rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Schedule New Meeting</h2>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-gray-400 hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleScheduleMeeting}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Meeting Title *
                </label>
                <input
                  type="text"
                  required
                  value={newMeeting.title}
                  onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ focusRingColor: COLORS.accent }}
                  placeholder="Enter meeting title"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newMeeting.description}
                  onChange={(e) => setNewMeeting({ ...newMeeting, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ focusRingColor: COLORS.accent }}
                  rows="3"
                  placeholder="Optional meeting description"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scheduled Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={newMeeting.scheduledAt}
                  onChange={(e) => setNewMeeting({ ...newMeeting, scheduledAt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invite Members
                </label>
                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                  {companyMembers.map((member) => (
                    <div key={member.user._id} className="flex items-center mb-2 p-2 hover:bg-gray-50 rounded">
                      <input
                        type="checkbox"
                        id={`schedule-${member.user._id}`}
                        checked={newMeeting.invitedMembers.includes(member.user._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewMeeting({
                              ...newMeeting,
                              invitedMembers: [...newMeeting.invitedMembers, member.user._id]
                            });
                          } else {
                            setNewMeeting({
                              ...newMeeting,
                              invitedMembers: newMeeting.invitedMembers.filter(id => id !== member.user._id)
                            });
                          }
                        }}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <label htmlFor={`schedule-${member.user._id}`} className="text-sm text-gray-700 font-medium cursor-pointer">
                          {member.user.name}
                        </label>
                        <div className="text-xs text-gray-500">
                          {member.user.email} • {member.role}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Schedule Meeting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite to Meeting Modal */}
      {showInviteModal && selectedMeetingForInvite && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Invite to Meeting</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <h3 className="font-medium text-gray-900 mb-2">{selectedMeetingForInvite.title}</h3>
              <p className="text-sm text-gray-600">Select members to invite to this live meeting</p>
            </div>

            <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-md p-2 mb-6">
              {companyMembers
                .filter(member => !selectedMeetingForInvite.participants?.some(p => p.userId === member.user._id))
                .map((member) => (
                <div key={member.user._id} className="flex items-center mb-2 p-2 hover:bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    id={`invite-${member.user._id}`}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <label htmlFor={`invite-${member.user._id}`} className="text-sm text-gray-700 font-medium cursor-pointer">
                      {member.user.name}
                    </label>
                    <div className="text-xs text-gray-500">
                      {member.user.email}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const selectedIds = Array.from(document.querySelectorAll('#invite-modal input:checked'))
                    .map(cb => cb.id.replace('invite-', ''));
                  handleInviteToMeeting(selectedMeetingForInvite._id, selectedIds);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Send Invites
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingsDashboard;
