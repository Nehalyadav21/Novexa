/**
 * Meeting Transcription Panel
 * Real-time transcription display with Novexa theme
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { COLORS } from '@/lib/theme';
import {
  FiMic,
  FiMicOff,
  FiDownload,
  FiTrash2,
  FiFileText,
  FiUsers,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiX,
  FiSettings
} from 'react-icons/fi';

const TranscriptionPanel = ({
  transcripts,
  currentTranscript,
  isTranscribing,
  isSTTConnected,
  transcriptionError,
  participants,
  onStartTranscription,
  onStopTranscription,
  onGenerateSummary,
  onExportTranscripts,
  onClearTranscripts,
  onExtractTasks,
  onClose
}) => {
  const [view, setView] = useState('transcripts'); // 'transcripts' | 'summary' | 'tasks' | 'settings'
  const [summary, setSummary] = useState(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  
  const transcriptsEndRef = useRef(null);
  const transcriptsContainerRef = useRef(null);

  // Auto-scroll to bottom when new transcripts arrive
  useEffect(() => {
    if (autoScroll && transcriptsEndRef.current) {
      transcriptsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcripts, currentTranscript, autoScroll]);

  // Handle scroll to detect manual scrolling
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 5;
    setAutoScroll(isAtBottom);
  };

  // Generate summary
  const handleGenerateSummary = async () => {
    try {
      setIsGeneratingSummary(true);
      const summaryData = await onGenerateSummary();
      setSummary(summaryData);
      setView('summary');
    } catch (error) {
      console.error('Failed to generate summary:', error);
      alert('Failed to generate meeting summary. Please try again.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Export transcripts
  const handleExport = (format) => {
    const blob = onExportTranscripts(format);
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meeting-transcripts-${Date.now()}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Filter transcripts based on search
  const filteredTranscripts = transcripts.filter(t =>
    t.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.userName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Format timestamp
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="w-96 h-full flex flex-col shadow-lg" 
         style={{ background: `linear-gradient(135deg, ${COLORS.background}, #1a1a1d)` }}>
      {/* Header */}
      <div className="p-4 border-b border-gray-800" 
           style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg flex items-center text-white">
            <div className="w-6 h-6 rounded flex items-center justify-center mr-3"
                 style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}>
              <span className="text-white font-bold text-xs">AI</span>
            </div>
            AI Transcription
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors text-white"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
        
        {/* Status indicators */}
        <div className="flex items-center justify-between text-sm text-white">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${
                isSTTConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
              }`} />
              <span>{isSTTConnected ? 'AI Connected' : 'Connecting...'}</span>
            </div>
            
            <div className="flex items-center">
              {isTranscribing ? (
                <>
                  <FiMic className="w-4 h-4 mr-1 text-green-400" />
                  <span>Live Recording</span>
                </>
              ) : (
                <>
                  <FiMicOff className="w-4 h-4 mr-1 text-gray-400" />
                  <span>Paused</span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center bg-white bg-opacity-20 rounded-full px-2 py-1">
            <FiUsers className="w-3 h-3 mr-1" />
            <span className="text-xs font-medium">{participants.length} speakers</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex border-b border-gray-800 bg-gray-900/50">
        <button
          onClick={() => setView('transcripts')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            view === 'transcripts'
              ? 'text-white border-b-2 bg-gray-800/50'
              : 'text-gray-400 hover:text-gray-200'
          }`}
          style={{ borderColor: view === 'transcripts' ? COLORS.accent : 'transparent' }}
        >
          Transcripts ({transcripts.length})
        </button>
        <button
          onClick={() => setView('summary')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            view === 'summary'
              ? 'text-white border-b-2 bg-gray-800/50'
              : 'text-gray-400 hover:text-gray-200'
          }`}
          style={{ borderColor: view === 'summary' ? COLORS.accent : 'transparent' }}
        >
          Summary
        </button>
        <button
          onClick={() => setView('tasks')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            view === 'tasks'
              ? 'text-white border-b-2 bg-gray-800/50'
              : 'text-gray-400 hover:text-gray-200'
          }`}
          style={{ borderColor: view === 'tasks' ? COLORS.accent : 'transparent' }}
        >
          Tasks
        </button>
        <button
          onClick={() => setView('settings')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            view === 'settings'
              ? 'text-white border-b-2 bg-gray-800/50'
              : 'text-gray-400 hover:text-gray-200'
          }`}
          style={{ borderColor: view === 'settings' ? COLORS.accent : 'transparent' }}
        >
          <FiSettings className="w-4 h-4" />
        </button>
      </div>

      {/* Error Display */}
      {transcriptionError && (
        <div className="p-3 bg-red-900/20 border-b border-red-800">
          <div className="flex items-center text-red-400 text-sm">
            <FiAlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>{transcriptionError}</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {view === 'transcripts' && (
          <div className="h-full flex flex-col">
            {/* Search */}
            <div className="p-3 border-b border-gray-800">
              <input
                type="text"
                placeholder="Search transcripts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-700 rounded-lg text-sm bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ focusRingColor: COLORS.accent }}
              />
            </div>

            {/* Transcripts */}
            <div 
              ref={transcriptsContainerRef}
              className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-900/30"
              onScroll={handleScroll}
            >
              {filteredTranscripts.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <FiMic className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {isTranscribing ? 'Listening for speech...' : transcriptionError ? 'Transcription paused due to network issues' : 'No transcripts yet'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {isTranscribing 
                      ? 'Start speaking to see live transcription'
                      : transcriptionError 
                        ? 'Click below to retry transcription'
                        : 'Click below to start transcription'
                    }
                  </p>
                  {!isTranscribing && (
                    <button
                      onClick={onStartTranscription}
                      className="mt-4 px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors duration-200 flex items-center mx-auto hover:opacity-90"
                      style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}
                    >
                      <FiMic className="w-4 h-4 mr-2" />
                      {transcriptionError ? 'Retry Transcription' : 'Start Transcription'}
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {filteredTranscripts.map((transcript) => (
                    <div
                      key={transcript.id}
                      className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-3 border border-gray-700"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm" 
                              style={{ color: COLORS.accent }}>
                          {transcript.userName}
                        </span>
                        <div className="flex items-center text-xs text-gray-400">
                          <FiClock className="w-3 h-3 mr-1" />
                          {formatTime(transcript.timestamp)}
                        </div>
                      </div>
                      <p className="text-gray-200 text-sm leading-relaxed">
                        {transcript.text}
                      </p>
                      {transcript.confidence && (
                        <div className="mt-2 flex items-center">
                          <div className="flex-1 bg-gray-700 rounded-full h-1">
                            <div
                              className="h-1 rounded-full"
                              style={{ 
                                width: `${transcript.confidence * 100}%`,
                                background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})`
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 ml-2">
                            {Math.round(transcript.confidence * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Current transcript (interim) */}
                  {currentTranscript && (
                    <div className="bg-gray-700/30 backdrop-blur-sm rounded-lg p-3 border border-gray-600 border-dashed">
                      <div className="flex items-center mb-2">
                        <div className="w-2 h-2 rounded-full animate-pulse mr-2" 
                             style={{ backgroundColor: COLORS.accent }} />
                        <span className="font-medium text-sm"
                              style={{ color: COLORS.accent }}>
                          Live
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed italic">
                        {currentTranscript}
                      </p>
                    </div>
                  )}
                  
                  <div ref={transcriptsEndRef} />
                </>
              )}
            </div>
          </div>
        )}

        {view === 'summary' && (
          <div className="h-full overflow-y-auto p-4 bg-gray-900/30">
            {!summary ? (
              <div className="text-center py-8">
                <FiFileText className="w-8 h-8 mx-auto mb-4 text-gray-400" />
                <h4 className="font-medium text-white mb-2">Meeting Summary</h4>
                <p className="text-sm text-gray-400 mb-4">
                  Generate an AI-powered summary of the meeting transcripts
                </p>
                <button
                  onClick={handleGenerateSummary}
                  disabled={isGeneratingSummary || transcripts.length === 0}
                  className="px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}
                >
                  {isGeneratingSummary ? 'Generating...' : 'Generate Summary'}
                </button>
                {transcripts.length === 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    No transcripts available for summary
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-800">Meeting Summary</h4>
                  <button
                    onClick={handleGenerateSummary}
                    disabled={isGeneratingSummary}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Refresh
                  </button>
                </div>
                
                <div className="prose prose-sm max-w-none">
                  <div 
                    className="text-gray-200 whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: summary.summary.replace(/\n/g, '<br/>') }}
                  />
                </div>
                
                <div className="mt-4 p-3 bg-gray-800/50 rounded-lg text-xs text-gray-400">
                  <div className="grid grid-cols-2 gap-2">
                    <div>Transcripts: {summary.transcriptCount}</div>
                    <div>Participants: {summary.participants.length}</div>
                    <div className="col-span-2">
                      Generated: {new Date(summary.generatedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'tasks' && (
          <div className="h-full overflow-y-auto p-4 bg-gray-900/30">
            <div className="text-center py-8">
              <FiCheckCircle className="w-8 h-8 mx-auto mb-4 text-gray-400" />
              <h4 className="font-medium text-white mb-2">AI Task Assignment</h4>
              <p className="text-sm text-gray-400 mb-4">
                Extract and assign tasks from meeting transcripts using AI
              </p>
              <button
                onClick={onExtractTasks}
                disabled={!onExtractTasks || transcripts.length === 0}
                className="px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})` }}
              >
                Extract Tasks from Transcript
              </button>
              {transcripts.length === 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  No transcripts available for task extraction
                </p>
              )}
              <div className="mt-4 text-xs text-gray-400">
                <p>This will analyze the meeting conversation and automatically:</p>
                <ul className="mt-2 space-y-1 text-left max-w-sm mx-auto">
                  <li>• Detect action items and commitments</li>
                  <li>• Assign tasks to mentioned participants</li>
                  <li>• Extract due dates and priorities</li>
                  <li>• Create trackable tasks in your task list</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {view === 'settings' && (
          <div className="p-4 space-y-4 bg-gray-900/30">
            <div>
              <h4 className="font-medium text-white mb-3">Transcription Controls</h4>
              <div className="space-y-3">
                <button
                  onClick={isTranscribing ? onStopTranscription : onStartTranscription}
                  className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                    isTranscribing
                      ? 'bg-red-900/50 text-red-300 hover:bg-red-900/70 border border-red-800'
                      : 'bg-green-900/50 text-green-300 hover:bg-green-900/70 border border-green-800'
                  }`}
                >
                  {isTranscribing ? (
                    <>
                      <FiMicOff className="w-4 h-4 inline mr-2" />
                      Stop Transcription
                    </>
                  ) : (
                    <>
                      <FiMic className="w-4 h-4 inline mr-2" />
                      Start Transcription
                    </>
                  )}
                </button>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Auto-scroll</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoScroll}
                      onChange={(e) => setAutoScroll(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-white mb-3">Export & Actions</h4>
              <div className="space-y-2">
                <button
                  onClick={() => handleExport('json')}
                  className="w-full py-2 px-4 bg-gray-800/50 text-gray-300 rounded-lg hover:bg-gray-700/50 text-sm font-medium flex items-center justify-center border border-gray-700"
                >
                  <FiDownload className="w-4 h-4 mr-2" />
                  Export as JSON
                </button>
                
                <button
                  onClick={() => handleExport('txt')}
                  className="w-full py-2 px-4 bg-gray-800/50 text-gray-300 rounded-lg hover:bg-gray-700/50 text-sm font-medium flex items-center justify-center border border-gray-700"
                >
                  <FiDownload className="w-4 h-4 mr-2" />
                  Export as Text
                </button>
                
                <button
                  onClick={onClearTranscripts}
                  className="w-full py-2 px-4 bg-red-900/50 text-red-300 rounded-lg hover:bg-red-900/70 text-sm font-medium flex items-center justify-center border border-red-800"
                >
                  <FiTrash2 className="w-4 h-4 mr-2" />
                  Clear All Transcripts
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-800">
              <div className="text-xs text-gray-400 space-y-1">
                <div className="flex items-center">
                  <FiCheckCircle className="w-3 h-3 mr-1" />
                  Powered by AI Transcription
                </div>
                <div>Real-time speech recognition</div>
                <div>Automatic speaker detection</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TranscriptionPanel;
