'use client';

import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketTest = () => {
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    console.log('🧪 Initializing socket test...');
    
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';
    
    const socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true
    });

    socketInstance.on('connect', () => {
      console.log('✅ Test socket connected:', socketInstance.id);
      setConnectionStatus('connected');
      setMessages(prev => [...prev, `✅ Connected: ${socketInstance.id}`]);
    });

    socketInstance.on('disconnect', () => {
      console.log('🔌 Test socket disconnected');
      setConnectionStatus('disconnected');
      setMessages(prev => [...prev, '🔌 Disconnected']);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('❌ Test socket connection error:', error);
      setConnectionStatus('error');
      setMessages(prev => [...prev, `❌ Error: ${error.message}`]);
    });

    socketInstance.on('connection-test', (data) => {
      console.log('📨 Test message received:', data);
      setMessages(prev => [...prev, `📨 Server says: ${data.message}`]);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const testJoinMeeting = () => {
    if (socket && socket.connected) {
      const testData = {
        meetingId: 'test-meeting-123',
        userId: 'test-user-123',
        userName: 'Test User'
      };
      console.log('🧪 Testing join meeting:', testData);
      socket.emit('join-meeting', testData);
      setMessages(prev => [...prev, '📤 Sent join-meeting request']);
    } else {
      setMessages(prev => [...prev, '❌ Socket not connected']);
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Socket.IO Connection Test</h1>
        
        <div className="bg-white p-4 rounded-lg shadow mb-4">
          <h2 className="text-lg font-semibold mb-2">Connection Status</h2>
          <div className={`inline-block px-3 py-1 rounded text-white ${
            connectionStatus === 'connected' ? 'bg-green-500' :
            connectionStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
          }`}>
            {connectionStatus.toUpperCase()}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow mb-4">
          <h2 className="text-lg font-semibold mb-2">Actions</h2>
          <button
            onClick={testJoinMeeting}
            disabled={connectionStatus !== 'connected'}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
          >
            Test Join Meeting
          </button>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Messages</h2>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {messages.map((message, index) => (
              <div key={index} className="text-sm font-mono bg-gray-100 p-2 rounded">
                {message}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocketTest;
