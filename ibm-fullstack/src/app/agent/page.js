"use client"
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import ChatSidebar from "@/components/ChatSidebar";
import ChatMessage from "@/components/ChatMessage";
import { Particles, NovexaLogo } from "@/components/ui/ThemeComponents";
import { useDirectVoiceTranscription } from "@/hooks/useDirectVoiceTranscription";
import { useHoverTTS } from "@/hooks/useHoverTTS";
import { speakText, uploadFile } from "@/lib/audioUtils";
import { Inter } from 'next/font/google';
import { COLORS } from '@/lib/theme';

const inter = Inter({ subsets: ['latin'] });

export default function ChatInterface() {
  const { data: session } = useSession();
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [personality, setPersonality] = useState('friendly');
  const [uploadedFile, setUploadedFile] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Direct voice transcription hook
  const {
    isRecording: isDirectRecording,
    isTranscribing: isDirectTranscribing,
    transcribedText,
    error: directTranscriptionError,
    startDirectRecording,
    stopDirectRecording
  } = useDirectVoiceTranscription();

  // Hover TTS hook
  const { handleMouseEnter, handleMouseLeave } = useHoverTTS();

  // Load chats on component mount
  useEffect(() => {
    if (session) {
      loadChats();
    }
  }, [session]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle transcribed text from direct voice recording
  useEffect(() => {
    if (transcribedText) {
      console.log('Transcribed text received:', transcribedText);
      setInput(prevInput => {
        const newInput = prevInput ? `${prevInput} ${transcribedText}` : transcribedText;
        return newInput;
      });
    }
  }, [transcribedText]);

  // Handle direct transcription errors
  useEffect(() => {
    if (directTranscriptionError) {
      console.error('Direct transcription error:', directTranscriptionError);
      alert(`Voice transcription error: ${directTranscriptionError}`);
    }
  }, [directTranscriptionError]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadChats = async () => {
    try {
      const res = await fetch('/api/agent/chats');
      if (res.ok) {
        const data = await res.json();
        setChats(data || []);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };

  const loadChat = async (chatId) => {
    try {
      const res = await fetch(`/api/agent/chats/${chatId}`);
      if (res.ok) {
        const chat = await res.json();
        setMessages(chat.messages || []);
        setCurrentChatId(chatId);
        setPersonality(chat.personality || 'friendly');
      }
    } catch (error) {
      console.error('Error loading chat:', error);
    }
  };

  const createNewChat = async () => {
    try {
      const res = await fetch('/api/agent/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat', personality })
      });
      
      if (res.ok) {
        const newChat = await res.json();
        setChats(prev => [newChat, ...prev]);
        setCurrentChatId(newChat._id);
        setMessages([]);
      } else {
        console.error('Failed to create chat:', await res.text());
      }
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { 
      role: "user", 
      content: input, 
      timestamp: new Date(),
      user: session?.user?.name || 'User'
    };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          input, 
          chatId: currentChatId,
          personality 
        }),
      });

      const data = await res.json();
      
      if (res.ok) {
        const assistantMessage = { 
          role: "assistant", 
          content: data.response, 
          timestamp: new Date(),
          user: 'AI Assistant'
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        // Update chat ID if it's a new chat
        if (!currentChatId && data.chatId) {
          setCurrentChatId(data.chatId);
          await loadChats(); // Refresh chat list
        }
      } else {
        console.error('Error:', data.error);
        alert("Failed to send message: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Failed to send message: " + (err.message || "Unknown error"));
    }
    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      const result = await uploadFile(file);
      setUploadedFile(result);
      
      // Add file content to input if it's text
      if (result.extractedText) {
        setInput(prev => prev + (prev ? '\n\n' : '') + `[File: ${result.fileName}]\n${result.extractedText}`);
      }
    } catch (error) {
      console.error('File upload error:', error);
      alert('Failed to upload file: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSpeakMessage = async (text) => {
    try {
      await speakText(text);
    } catch (error) {
      console.error('TTS error:', error);
      alert('Failed to speak text: ' + error.message);
    }
  };

  return (
    <div className={`relative min-h-screen overflow-hidden ${inter.className}`} style={{ backgroundColor: COLORS.background }}>
      <Particles />
      <div className="relative z-10">
        <div className="flex h-screen text-white">
          {/* Sidebar */}
          <ChatSidebar 
            chats={chats}
            activeChatId={currentChatId}
            onNewChat={createNewChat}
            onChatSelect={loadChat}
          />

          {/* Main Chat Area - dynamically adjust margin based on sidebar state */}
          <div className="flex-1 flex flex-col transition-all duration-300" data-main-content style={{ marginLeft: '256px' }}>
            {/* Chat Header */}
            <div 
              className="backdrop-blur-xl border-b p-4 flex justify-between items-center shadow-lg"
              style={{ 
                backgroundColor: "#141417",
                borderColor: COLORS.border 
              }}
            >
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {currentChatId ? 'Chat Session' : 'Start a New Conversation'}
                </h2>
                <p className="text-sm text-gray-400">
                  Personality: {(personality || 'assistant').charAt(0).toUpperCase() + (personality || 'assistant').slice(1)}
                </p>
              </div>
              
              {/* Personality Selector */}
              <div className="flex items-center gap-4">
                <label className="text-sm text-gray-400">Personality:</label>
                <select 
                  value={personality} 
                  onChange={(e) => setPersonality(e.target.value)}
                  className="bg-[#1a1a1d] border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
                  style={{ 
                    borderColor: COLORS.border,
                    focusRingColor: COLORS.accent 
                  }}
                >
                  <option value="friendly" className="bg-[#1a1a1d]">Friendly</option>
                  <option value="formal" className="bg-[#1a1a1d]">Formal</option>
                  <option value="mentor" className="bg-[#1a1a1d]">Mentor</option>
                  <option value="fun" className="bg-[#1a1a1d]">Fun</option>
                </select>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto" style={{ backgroundColor: `${COLORS.background}cc` }}>
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="mb-6">
                      <NovexaLogo size={120} />
                    </div>
                    <h3 className="text-2xl font-medium mb-2 text-white">Start a conversation</h3>
                    <p className="text-gray-400">Send a message to begin chatting with the AI assistant</p>
                  </div>
                </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div 
                  key={i} 
                  className="relative group"
                  onMouseEnter={() => msg.role === 'assistant' && handleMouseEnter(msg.content)}
                  onMouseLeave={() => msg.role === 'assistant' && handleMouseLeave()}
                >
                  <ChatMessage 
                    message={msg} 
                    isAI={msg.role === 'assistant'} 
                  />
                  {/* TTS Button for AI messages */}
                  {msg.role === 'assistant' && (
                    <button
                      onClick={() => handleSpeakMessage(msg.content)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-gray-800/70 hover:bg-orange-500/20 text-orange-400 p-2 rounded-lg transition-all duration-200 backdrop-blur-sm border border-orange-500/30"
                      title="Speak this message"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              {loading && (
                <div 
                  className="backdrop-blur-md p-6 mx-4 mb-4 rounded-xl border"
                  style={{ 
                    backgroundColor: "#141417",
                    borderColor: COLORS.border 
                  }}
                >
                  <div className="max-w-4xl mx-auto w-full flex">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center mr-4 flex-shrink-0 shadow-lg overflow-hidden">
                      <img 
                        src="/novexa2.png" 
                        alt="Novexa AI" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="animate-spin rounded-full h-4 w-4 border-b-2"
                          style={{ borderColor: COLORS.accent }}
                        ></div>
                        <span className="text-gray-300">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
            )}
          </div>

          {/* Input Area */}
          <div 
            className="backdrop-blur-xl border-t p-4 shadow-lg"
            style={{ 
              backgroundColor: "#141417",
              borderColor: COLORS.border 
            }}
          >
            {/* File Upload Preview */}
            {uploadedFile && (
              <div 
                className="mb-4 p-3 rounded-xl border"
                style={{ 
                  backgroundColor: `${COLORS.background}cc`,
                  borderColor: COLORS.border 
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5" style={{ color: COLORS.accent }} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                    </svg>
                    <div>
                      <div className="text-sm font-medium text-white">{uploadedFile.fileName}</div>
                      <div className="text-xs text-gray-400">
                        {(uploadedFile.fileSize / 1024).toFixed(1)} KB • {uploadedFile.fileType}
                      </div>
                      {uploadedFile.preview && (
                        <div className="text-xs text-gray-300 mt-1">{uploadedFile.preview}</div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setUploadedFile(null)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                  </button>
                </div>
              </div>
            )}

            <div className="max-w-4xl mx-auto">
              <div className="flex gap-2 items-end">
                {/* File Upload Button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                  className="p-3 hover:bg-opacity-70 text-gray-300 hover:text-white rounded-xl transition-all duration-300 disabled:opacity-50 border"
                  style={{ 
                    backgroundColor: `${COLORS.background}cc`,
                    borderColor: COLORS.border 
                  }}
                  title="Upload file"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                  </svg>
                </button>

                {/* Direct Voice-to-Text Button */}
                <button
                  onClick={isDirectRecording ? stopDirectRecording : startDirectRecording}
                  disabled={loading || isDirectTranscribing}
                  className={`p-3 rounded-xl transition-all duration-300 disabled:opacity-50 border text-white ${
                    isDirectRecording 
                      ? 'animate-pulse' 
                      : isDirectTranscribing
                      ? 'animate-pulse'
                      : 'hover:bg-opacity-70'
                  }`}
                  style={isDirectRecording ? 
                    { 
                      background: `linear-gradient(135deg, ${COLORS.violet}, ${COLORS.secondary})`,
                      borderColor: COLORS.violet 
                    } :
                    isDirectTranscribing ?
                    { 
                      background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.secondary})`,
                      borderColor: COLORS.accent 
                    } :
                    { 
                      backgroundColor: `${COLORS.background}cc`,
                      borderColor: COLORS.border 
                    }
                  }
                  title={
                    isDirectRecording 
                      ? "Stop and transcribe" 
                      : isDirectTranscribing 
                      ? "Transcribing..." 
                      : "Direct voice-to-text"
                  }
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    {isDirectTranscribing ? (
                      <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16Z"/>
                    ) : isDirectRecording ? (
                      <path d="M6 6h12v12H6z"/>
                    ) : (
                      <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z M9 9v2h2V9H9zm4 0v2h2V9h-2z"/>
                    )}
                  </svg>
                </button>

                {/* Text Input */}
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message here... (Press Enter to send, Shift+Enter for new line)"
                  className="flex-1 border rounded-xl p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent resize-none transition-colors backdrop-blur-sm"
                  style={{ 
                    backgroundColor: `${COLORS.background}cc`,
                    borderColor: COLORS.border,
                    focusRingColor: COLORS.accent 
                  }}
                  rows="2"
                  disabled={loading}
                />

                {/* Send Button */}
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="px-6 py-3 text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  style={{ background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.secondary})` }}
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    'Send'
                  )}
                </button>
              </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              accept=".txt,.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
              className="hidden"
            />

            {/* Input Hints */}
            <div className="text-xs text-gray-400 mt-2 flex gap-4 flex-wrap">
              <span>📎 Upload: TXT, PDF, DOC, Images (with OCR)</span>
              <span>🎙️ Voice: Direct voice-to-text</span>
              <span>🔊 TTS: Hover over AI messages</span>
              {(isDirectRecording || isDirectTranscribing) && (
                <span className="text-purple-400 animate-pulse">
                  {isDirectRecording ? '🎙️ Recording...' : '⏳ Transcribing...'}
                </span>
              )}
            </div>
          </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
