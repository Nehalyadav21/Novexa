'use client';

import { useEffect, useState, useRef, Suspense, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Inter } from 'next/font/google';
import { COLORS } from '@/lib/theme';
import { Particles } from '@/components/ui/ThemeComponents';
import DashboardNavbar from '@/components/DashboardNavbar';
import io from 'socket.io-client';

const inter = Inter({ subsets: ['latin'] });

function ChatsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamChatId = searchParams.get('teamChat');
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [companyData, setCompanyData] = useState(null);
  const [companyMembers, setCompanyMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState([]);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const activeChatRef = useRef(null);
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const fetchData = useCallback(async () => {
    try {
      const [chatsRes, companyRes, membersRes] = await Promise.all([
        fetch('/api/chats'),
        fetch('/api/company'),
        fetch('/api/company/members')
      ]);

      if (chatsRes.ok) {
        const chatsData = await chatsRes.json();
        setChats(chatsData);
      } else if (chatsRes.status === 401) {
        console.log('User not authenticated, redirecting...');
        return; // Let middleware handle the redirect
      } else {
        console.error('Error fetching chats:', chatsRes.status, await chatsRes.text());
      }

      if (companyRes.ok) {
        const companyData = await companyRes.json();
        setCompanyData(companyData);
      }

      if (membersRes.ok) {
        const membersData = await membersRes.json();
        // Extract the members array from the response
        setCompanyMembers(membersData.members || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies needed as it only uses fetch and setState

  const initializeSocket = useCallback(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
    
    // Connect directly to the server Socket.IO (not through API route)
    socketRef.current = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });
    
    socketRef.current.on('connect', () => {
      console.log('Socket connected');
      if (session?.user?.id) {
        socketRef.current.emit('join', { userId: session.user.id });
      }
    });

    socketRef.current.on('newMessage', (data) => {
      
      // Update messages if this message is for the currently active chat
      setMessages(prev => {
        // Get the current active chat ID from the state
        const currentActiveChatId = activeChatRef.current?._id;
        
        // Only add to messages if this is for the currently active chat
        if (currentActiveChatId && data.chatId === currentActiveChatId) {
          // Check if message already exists to prevent duplicates
          const messageExists = prev.some(msg => msg._id === data._id);
          if (messageExists) return prev;
          
          // Add the new message
          return [...prev, data];
        }
        
        return prev;
      });
      
      // Update chats list with new last message
      setChats(prev => prev.map(chat => 
        chat._id === data.chatId 
          ? { 
              ...chat, 
              lastMessage: {
                content: data.content,
                sentAt: data.sentAt,
                sender: data.sender
              }, 
              updatedAt: new Date() 
            }
          : chat
      ).sort((a, b) => {
        // Sort chats by lastMessage timestamp (most recent first)
        const aTime = a.lastMessage?.sentAt || a.updatedAt || a.createdAt;
        const bTime = b.lastMessage?.sentAt || b.updatedAt || b.createdAt;
        return new Date(bTime) - new Date(aTime);
      }));
    });

    socketRef.current.on('newChatNotification', (data) => {
      console.log('Received chat notification:', data);
      // Refresh chats list to get the latest data
      fetchData();
    });

    socketRef.current.on('userTyping', (data) => {
      console.log('User typing:', data);
      // You can implement typing indicators here
    });

    socketRef.current.on('userStoppedTyping', (data) => {
      console.log('User stopped typing:', data);
      // Handle stop typing
    });

    socketRef.current.on('userJoined', (data) => {
      console.log('User joined:', data);
    });

    // Add error handling and reconnection logic
    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      // Don't automatically reconnect on manual disconnect
      if (reason !== 'io client disconnect') {
        console.log('Attempting to reconnect...');
      }
    });

    socketRef.current.on('reconnect', () => {
      console.log('Socket reconnected');
      // Rejoin the current chat if we were in one
      if (activeChatRef.current) {
        socketRef.current.emit('joinChat', { chatId: activeChatRef.current._id });
      }
    });
  }, [session?.user?.id, fetchData]); // Added fetchData dependency

  useEffect(() => {
    if (session && !socketRef.current) {
      fetchData();
      initializeSocket();
    }

    return () => {
      if (socketRef.current) {
        console.log('🔌 Cleaning up socket connection');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [session, fetchData, initializeSocket]); // Fixed dependency array

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Keep activeChatRef in sync with activeChat state
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  // Re-initialize socket when activeChat changes
  useEffect(() => {
    if (activeChat && socketRef.current) {
      socketRef.current.emit('joinChat', { chatId: activeChat._id });
    }
  }, [activeChat]);

  // Auto-select team chat if teamChatId is provided
  const handleChatSelect = useCallback((chat) => {
    // Leave previous chat room if any
    if (activeChat && socketRef.current) {
      socketRef.current.emit('leaveChat', { chatId: activeChat._id });
    }
    
    setActiveChat(chat);
    activeChatRef.current = chat; // Update the ref
    fetchMessages(chat._id);
    
    // Join new chat room
    if (socketRef.current) {
      socketRef.current.emit('joinChat', { chatId: chat._id });
    }
  }, [activeChat]);

  useEffect(() => {
    if (teamChatId && chats.length > 0) {
      const targetChat = chats.find(chat => chat._id === teamChatId);
      if (targetChat) {
        handleChatSelect(targetChat);
      }
    }
  }, [teamChatId, chats, handleChatSelect]); // Fixed: included handleChatSelect

  const fetchMessages = async (chatId) => {
    try {
      const response = await fetch(`/api/chats/${chatId}/messages`);
      if (response.ok) {
        const messagesData = await response.json();
        setMessages(messagesData);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    const tempMessage = {
      _id: `temp-${Date.now()}`,
      content: newMessage.trim(),
      sender: {
        _id: session.user.id,
        name: session.user.name,
        email: session.user.email
      },
      sentAt: new Date(),
      messageType: 'text',
      isTemporary: true
    };

    // Add message optimistically to UI
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');

    try {
      const response = await fetch(`/api/chats/${activeChat._id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: tempMessage.content })
      });

      if (response.ok) {
        const result = await response.json();
        const message = result.tasksCreated ? { ...result, tasksCreated: undefined } : result;
        
        // Replace temporary message with real message
        setMessages(prev => 
          prev.map(msg => 
            msg._id === tempMessage._id 
              ? { ...message, isTemporary: false }
              : msg
          )
        );
        
        // Show notification if tasks were created
        if (result.tasksCreated && result.tasksCreated.length > 0) {
          const taskCount = result.tasksCreated.length;
          const taskNames = result.tasksCreated.map(t => t.title).join(', ');
          showNotification(
            `✅ Automatically created ${taskCount} task${taskCount > 1 ? 's' : ''}: ${taskNames}`,
            'success'
          );
        }
        
        // Emit the message via Socket.io for real-time updates to other users
        if (socketRef.current) {
          socketRef.current.emit('sendMessage', {
            chatId: activeChat._id,
            message: {
              ...message,
              sender: {
                _id: session.user.id,
                name: session.user.name,
                email: session.user.email
              }
            },
            participants: activeChat.participants?.map(p => p._id || p) || []
          });
        }

        // Update last message in chats list
        setChats(prev => prev.map(chat => 
          chat._id === activeChat._id 
            ? { 
                ...chat, 
                lastMessage: {
                  content: message.content,
                  sentAt: message.sentAt,
                  sender: message.sender
                }
              }
            : chat
        ).sort((a, b) => {
          const aTime = a.lastMessage?.sentAt || a.updatedAt || a.createdAt;
          const bTime = b.lastMessage?.sentAt || b.updatedAt || b.createdAt;
          return new Date(bTime) - new Date(aTime);
        }));
      } else {
        // Remove temporary message on error
        setMessages(prev => prev.filter(msg => msg._id !== tempMessage._id));
        setNewMessage(tempMessage.content); // Restore message in input
        console.error('Failed to send message');
      }
    } catch (error) {
      // Remove temporary message on error
      setMessages(prev => prev.filter(msg => msg._id !== tempMessage._id));
      setNewMessage(tempMessage.content); // Restore message in input
      console.error('Error sending message:', error);
    }
  };

  const createDirectChat = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'direct',
          participantId: selectedUser
        })
      });

      if (response.ok) {
        const newChat = await response.json();
        setChats(prev => [...prev, newChat]);
        setShowNewChatModal(false);
        setSelectedUser('');
        setSearchQuery('');
        handleChatSelect(newChat);
      }
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Add notification for task creation
  const showNotification = (message, type = 'info') => {
    const notification = {
      id: Date.now(),
      message,
      type
    };
    setNotifications(prev => [...prev, notification]);
    
    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden" style={{ backgroundColor: COLORS.background }}>
        <Particles />
        <div className="text-center relative z-10">
          <div 
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto"
            style={{ borderColor: COLORS.accent }}
          ></div>
          <p className="mt-4 text-gray-300">Loading chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative min-h-screen overflow-hidden ${inter.className}`} style={{ backgroundColor: COLORS.background }}>
      <Particles />
      <div className="relative z-10">
        <DashboardNavbar user={session.user} companyData={companyData} />
      
      {/* Task Creation Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`max-w-md p-4 rounded-xl shadow-lg border ${
                notification.type === 'success' 
                  ? 'bg-green-900/20 border-green-500/30 text-green-300' 
                  : notification.type === 'error'
                  ? 'bg-red-900/20 border-red-500/30 text-red-300'
                  : 'bg-blue-900/20 border-blue-500/30 text-blue-300'
              } animate-slide-in-right backdrop-blur-sm`}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {notification.type === 'success' && (
                    <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                  {notification.type === 'error' && (
                    <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                  {notification.type === 'info' && (
                    <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium">{notification.message}</p>
                </div>
                <button
                  onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                  className="ml-2 flex-shrink-0 text-gray-400 hover:text-gray-300"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="max-w-7xl mx-auto pt-20 pb-6 px-4 sm:px-6 lg:px-8">
        <div 
          className="border rounded-2xl shadow-xl h-[calc(100vh-8rem)] flex overflow-hidden"
          style={{ 
            backgroundColor: "#141417",
            borderColor: COLORS.border 
          }}
        >
          {/* Chats Sidebar */}
          <div 
            className="w-1/3 border-r flex flex-col"
            style={{ 
              backgroundColor: `${COLORS.background}cc`,
              borderColor: COLORS.border 
            }}
          >
            <div 
              className="p-6 border-b"
              style={{ 
                backgroundColor: "#141417",
                borderColor: COLORS.border 
              }}
            >
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Messages</h2>
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="text-white p-2.5 rounded-xl hover:opacity-90 transition-all shadow-lg hover:shadow-xl"
                  style={{ background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.secondary})` }}
                  title="Start new conversation"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {chats.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <svg className="w-12 h-12 mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-center text-sm">No conversations yet</p>
                  <p className="text-xs text-gray-500 mt-1">Start a new chat to begin messaging</p>
                </div>
              ) : (
                chats.map((chat) => (
                  <div
                    key={chat._id}
                    onClick={() => handleChatSelect(chat)}
                    className={`p-4 m-2 rounded-xl cursor-pointer transition-all duration-200 ${
                      activeChat?._id === chat._id 
                        ? 'bg-gray-700/50 border-2 border-orange-500/50 shadow-md' 
                        : 'bg-gray-800/30 hover:bg-gray-700/30 hover:shadow-md border border-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-medium ${
                        chat.type === 'company' ? 'bg-purple-600' :
                        chat.type === 'team' ? 'bg-green-600' :
                        'bg-blue-600'
                      }`} style={{
                        background: chat.type === 'company' ? `linear-gradient(90deg, ${COLORS.violet}, ${COLORS.secondary})` :
                                   chat.type === 'team' ? `linear-gradient(90deg, ${COLORS.emerald}, ${COLORS.teal})` :
                                   `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.secondary})`
                      }}>
                        {chat.type === 'company' ? (
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-6a1 1 0 00-1-1H9a1 1 0 00-1 1v6a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 8a1 1 0 011-1h1a1 1 0 011 1v2a1 1 0 01-1 1H8a1 1 0 01-1-1v-2z" clipRule="evenodd" />
                          </svg>
                        ) : chat.type === 'team' ? (
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                          </svg>
                        ) : (
                          (chat.name || 'Chat').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-white truncate text-sm">
                            {chat.type === 'company' ? `${companyData?.name} (Company)` :
                             chat.type === 'team' ? `${chat.name} (Team)` :
                             chat.name}
                          </h3>
                          {chat.lastMessage && (
                            <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                              {formatTime(chat.lastMessage.sentAt)}
                            </span>
                          )}
                        </div>
                        {chat.lastMessage ? (
                          <p className="text-sm text-gray-300 truncate mt-1">
                            <span className="font-medium">
                              {chat.lastMessage.sender?._id === session.user.id ? 'You: ' : `${chat.lastMessage.sender?.name}: `}
                            </span>
                            {chat.lastMessage.content}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-500 mt-1">No messages yet</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col"
            style={{ backgroundColor: `${COLORS.background}cc` }}
          >
            {activeChat ? (
              <>
                {/* Chat Header */}
                <div 
                  className="p-6 border-b backdrop-blur-md"
                  style={{ 
                    backgroundColor: "#141417",
                    borderColor: COLORS.border 
                  }}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-medium`}
                      style={{
                        background: activeChat.type === 'company' ? `linear-gradient(90deg, ${COLORS.violet}, ${COLORS.secondary})` :
                                   activeChat.type === 'team' ? `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.secondary})` :
                                   `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.secondary})`
                      }}
                    >
                      {activeChat.type === 'company' ? (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-6a1 1 0 00-1-1H9a1 1 0 00-1 1v6a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 8a1 1 0 011-1h1a1 1 0 011 1v2a1 1 0 01-1 1H8a1 1 0 01-1-1v-2z" clipRule="evenodd" />
                        </svg>
                      ) : activeChat.type === 'team' ? (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                        </svg>
                      ) : (
                        (activeChat.name || 'Chat').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {activeChat.type === 'company' ? `${companyData?.name} (Company Chat)` :
                         activeChat.type === 'team' ? `${activeChat.name} (Team Chat)` :
                         activeChat.name}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {activeChat.participants?.length || 0} participant{(activeChat.participants?.length || 0) !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div 
                  className="flex-1 overflow-y-auto p-6 space-y-4"
                  style={{ backgroundColor: `${COLORS.background}dd` }}
                >
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <svg className="w-16 h-16 mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p className="text-lg font-medium text-white">No messages yet</p>
                      <p className="text-sm text-gray-500">Start the conversation by sending a message</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message._id}
                        className={`flex ${
                          message.sender._id === session.user.id ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm backdrop-blur-sm ${
                            message.sender._id === session.user.id
                              ? 'text-white rounded-br-md'
                              : 'bg-gray-800/50 text-gray-100 rounded-bl-md border border-gray-600'
                          } ${message.isTemporary ? 'opacity-70' : ''}`}
                          style={message.sender._id === session.user.id ? {
                            background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.secondary})`
                          } : {}}
                        >
                          {message.sender._id !== session.user.id && (
                            <p className="text-xs font-semibold mb-1 text-gray-300">
                              {message.sender.name}
                            </p>
                          )}
                          <p className="break-words">{message.content}</p>
                          <div className="flex items-center justify-between mt-2">
                            <p className={`text-xs ${
                              message.sender._id === session.user.id ? 'text-orange-100' : 'text-gray-400'
                            }`}>
                              {formatTime(message.sentAt)}
                            </p>
                            {message.isTemporary && (
                              <div className="ml-2">
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} 
                  className="p-6 border-t"
                  style={{ 
                    backgroundColor: "#141417",
                    borderColor: COLORS.border 
                  }}
                >
                  <div className="flex space-x-4 items-end">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="w-full px-4 py-3 border rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent resize-none"
                        style={{ 
                          backgroundColor: `${COLORS.background}cc`,
                          borderColor: COLORS.border,
                          focusRingColor: COLORS.accent 
                        }}
                        maxLength={1000}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="text-white p-3 rounded-2xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                      style={{ background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.secondary})` }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div 
                className="flex-1 flex items-center justify-center text-gray-400"
                style={{ backgroundColor: `${COLORS.background}dd` }}
              >
                <div className="text-center">
                  <svg className="w-20 h-20 mx-auto mb-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <h3 className="text-xl font-semibold text-white mb-2">Welcome to Messages</h3>
                  <p className="text-gray-500">Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800/90 backdrop-blur-md border border-gray-600 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h2 className="text-xl font-bold mb-4 text-white">Start New Chat</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Search for a member to chat with
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type name or email to search..."
                className="w-full px-3 py-2 border border-gray-600 rounded-xl bg-gray-700/50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ focusRingColor: COLORS.accent }}
              />
            </div>

            {/* Search Results */}
            <div className="mb-4 max-h-40 overflow-y-auto">
              {searchQuery.length > 0 && (
                <div className="space-y-2">
                  {companyMembers
                    .filter(member => 
                      member.user._id !== session?.user?.id &&
                      (member.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       member.user.email.toLowerCase().includes(searchQuery.toLowerCase()))
                    )
                    .slice(0, 5) // Limit to 5 results
                    .map((member) => (
                      <div
                        key={member.user._id}
                        onClick={() => {
                          setSelectedUser(member.user._id);
                          setSearchQuery(member.user.name);
                        }}
                        className={`p-3 rounded-xl cursor-pointer transition-colors border ${
                          selectedUser === member.user._id 
                            ? 'bg-orange-500/20 border-orange-500' 
                            : 'bg-gray-700/50 border-gray-600 hover:bg-gray-600/50'
                        }`}
                      >
                        <div className="text-white font-medium">{member.user.name}</div>
                        <div className="text-gray-400 text-sm">{member.user.email}</div>
                        <div className="text-gray-500 text-xs">{member.role}</div>
                      </div>
                    ))}
                  {companyMembers.filter(member => 
                    member.user._id !== session?.user?.id &&
                    (member.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                     member.user.email.toLowerCase().includes(searchQuery.toLowerCase()))
                  ).length === 0 && (
                    <div className="p-3 text-gray-400 text-center">
                      No members found matching &quot;{searchQuery}&quot;
                    </div>
                  )}
                </div>
              )}
              {searchQuery.length === 0 && (
                <div className="text-gray-400 text-center py-4">
                  Start typing to search for members...
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowNewChatModal(false);
                  setSearchQuery('');
                  setSelectedUser('');
                }}
                className="flex-1 px-4 py-2 border border-gray-600 rounded-xl text-gray-300 hover:bg-gray-700/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createDirectChat}
                disabled={!selectedUser}
                className="flex-1 px-4 py-2 text-white rounded-xl hover:opacity-90 disabled:opacity-50 transition-all"
                style={{ background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.secondary})` }}
              >
                Start Chat
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default function ChatsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ChatsContent />
    </Suspense>
  );
}
