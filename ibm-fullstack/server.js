/**
 * WebRTC Signaling Server for Google Meet-style Video Conferencing
 * 
 * This server handles:
 * 1. WebRTC signaling (SDP offers/answers, ICE candidates)
 * 2. Meeting room management
 * 3. Participant tracking
 * 4. Real-time communication between peers
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Store active meetings and participants
const meetings = new Map(); // meetingId -> { participants: Map, createdAt: Date }
const participants = new Map(); // socketId -> { meetingId, userId, userName }

app.prepare().then(() => {
  // Create HTTP server
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.IO conditionally based on environment variable
  let io = null;
  const isSocketIODisabled = process.env.NEXT_PUBLIC_DISABLE_SOCKETIO === 'true';
  
  console.log('🔍 Environment check:');
  console.log('🔍 NEXT_PUBLIC_DISABLE_SOCKETIO:', process.env.NEXT_PUBLIC_DISABLE_SOCKETIO);
  console.log('🔍 isSocketIODisabled:', isSocketIODisabled);
  
  if (!isSocketIODisabled) {
    console.log('🔧 Initializing Socket.IO server...');
    
    // Initialize Socket.IO with improved configuration
    io = new Server(httpServer, {
      cors: {
        origin: [`http://localhost:${port}`, "http://localhost:3000"],
        methods: ["GET", "POST"],
        credentials: true
      },
      allowEIO3: true,
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      upgradeTimeout: 10000,
      maxHttpBufferSize: 1e6,
      allowUpgrades: true,
      perMessageDeflate: false,
      httpCompression: false,
      closeOnBeforeunload: false
    });

    console.log('🔧 Socket.IO server initialized with CORS origins:', [`http://localhost:${port}`, "http://localhost:3000"]);
  } else {
    console.log('🚫 Socket.IO is disabled - running in DirectWebRTC mode only');
  }

  /**
   * Utility Functions
   */
  
  // Generate unique meeting ID
  function generateMeetingId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  // Get or create a meeting room
  function getOrCreateMeeting(meetingId) {
    if (!meetings.has(meetingId)) {
      meetings.set(meetingId, {
        participants: new Map(),
        createdAt: new Date(),
        hostId: null
      });
      console.log(`📝 Created new meeting: ${meetingId}`);
    }
    return meetings.get(meetingId);
  }

  // Remove participant from meeting
  function removeParticipantFromMeeting(socketId) {
    const participant = participants.get(socketId);
    if (!participant) return;

    const meeting = meetings.get(participant.meetingId);
    if (meeting) {
      meeting.participants.delete(socketId);
      
      // If meeting is empty, mark it as ended and auto-generate summary
      if (meeting.participants.size === 0) {
        console.log(`📝 Meeting ${participant.meetingId} is now empty - marking as ended`);
        
        // Mark meeting as ended
        meeting.status = 'ended';
        meeting.endedAt = new Date();
        
        // Auto-generate summary if transcripts exist
        autoGenerateMeetingSummary(participant.meetingId);
        
        // Clean up after 5 minutes
        setTimeout(() => {
          if (meetings.has(participant.meetingId) && meetings.get(participant.meetingId).participants.size === 0) {
            meetings.delete(participant.meetingId);
            console.log(`🗑️  Cleaned up empty meeting: ${participant.meetingId}`);
          }
        }, 5 * 60 * 1000); // 5 minutes
      }
    }
    
    participants.delete(socketId);
  }

  // Auto-generate meeting summary when meeting ends
  async function autoGenerateMeetingSummary(meetingId) {
    try {
      console.log(`🤖 Auto-generating summary for ended meeting: ${meetingId}`);
      
      // Use setTimeout to allow async call without blocking the socket disconnect
      setTimeout(async () => {
        try {
          // Call the summary API endpoint
          const summaryResponse = await fetch(`http://localhost:${port}/api/meetings/${meetingId}/auto-summary`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              meetingId,
              reason: 'auto-generated-on-meeting-end'
            })
          });

          if (summaryResponse.ok) {
            const result = await summaryResponse.json();
            console.log(`✅ Auto-summary generated for meeting: ${meetingId}`);
            console.log(`📝 Summary preview: ${result.summary?.substring(0, 100)}...`);
          } else {
            console.log(`⚠️  Auto-summary failed for meeting: ${meetingId} - ${summaryResponse.status}`);
          }
        } catch (error) {
          console.error(`❌ Error auto-generating summary for meeting ${meetingId}:`, error);
        }
      }, 1000); // Delay by 1 second to ensure the meeting end is processed
      
    } catch (error) {
      console.error(`❌ Error scheduling auto-summary for meeting ${meetingId}:`, error);
    }
  }

  /**
   * Socket.IO Event Handlers - Only if Socket.IO is enabled
   */
  
  if (io) {
    io.on('connection', (socket) => {
    console.log(`🔗 User connected: ${socket.id}`);
    console.log(`📊 Total connected clients: ${io.engine.clientsCount}`);

    // Test connection
    socket.emit('connection-test', { message: 'Socket connected successfully', socketId: socket.id });

    /**
     * Join Meeting Room
     * Creates or joins an existing meeting room
     */
    socket.on('join-meeting', ({ meetingId, userId, userName }) => {
      try {
        console.log(`👤 ${userName} (${userId}) joining meeting: ${meetingId}`);
        
        // Get or create the meeting
        const meeting = getOrCreateMeeting(meetingId);
        
        // Set host if this is the first participant
        if (meeting.participants.size === 0) {
          meeting.hostId = userId;
        }

        // Add participant to meeting
        const participantData = {
          socketId: socket.id,
          userId,
          userName,
          joinedAt: new Date(),
          isHost: meeting.hostId === userId,
          audioEnabled: true,
          videoEnabled: true
        };

        meeting.participants.set(socket.id, participantData);
        participants.set(socket.id, {
          meetingId,
          userId,
          userName
        });

        // Join socket room
        socket.join(meetingId);

        // Get list of existing participants (exclude current user)
        const existingParticipants = Array.from(meeting.participants.values())
          .filter(p => p.socketId !== socket.id)
          .map(p => ({
            socketId: p.socketId,
            userId: p.userId,
            userName: p.userName,
            isHost: p.isHost,
            audioEnabled: p.audioEnabled,
            videoEnabled: p.videoEnabled
          }));

        // Send existing participants to the new user
        socket.emit('existing-participants', existingParticipants);

        // Notify existing participants about the new user
        socket.to(meetingId).emit('user-joined', {
          socketId: socket.id,
          userId,
          userName,
          isHost: participantData.isHost,
          audioEnabled: participantData.audioEnabled,
          videoEnabled: participantData.videoEnabled
        });

        // Send join confirmation
        socket.emit('join-success', {
          meetingId,
          participantCount: meeting.participants.size,
          isHost: participantData.isHost
        });

        console.log(`✅ ${userName} joined meeting ${meetingId}. Total participants: ${meeting.participants.size}`);

      } catch (error) {
        console.error('Error joining meeting:', error);
        socket.emit('join-error', { message: 'Failed to join meeting' });
      }
    });

    /**
     * WebRTC Signaling Events
     */

    // Handle WebRTC offer
    socket.on('webrtc-offer', ({ targetSocketId, offer, meetingId }) => {
      console.log(`📤 Forwarding WebRTC offer from ${socket.id} to ${targetSocketId}`);
      socket.to(targetSocketId).emit('webrtc-offer', {
        senderSocketId: socket.id,
        offer,
        meetingId
      });
    });

    // Handle WebRTC answer
    socket.on('webrtc-answer', ({ targetSocketId, answer, meetingId }) => {
      console.log(`📤 Forwarding WebRTC answer from ${socket.id} to ${targetSocketId}`);
      socket.to(targetSocketId).emit('webrtc-answer', {
        senderSocketId: socket.id,
        answer,
        meetingId
      });
    });

    // Handle ICE candidates
    socket.on('ice-candidate', ({ targetSocketId, candidate, meetingId }) => {
      socket.to(targetSocketId).emit('ice-candidate', {
        senderSocketId: socket.id,
        candidate,
        meetingId
      });
    });

    /**
     * Meeting Control Events
     */

    // Handle audio/video toggle notifications
    socket.on('toggle-audio', ({ meetingId, isEnabled }) => {
      const participant = participants.get(socket.id);
      if (participant && participant.meetingId === meetingId) {
        // Update participant state
        const meeting = meetings.get(meetingId);
        if (meeting && meeting.participants.has(socket.id)) {
          meeting.participants.get(socket.id).audioEnabled = isEnabled;
        }
        
        socket.to(meetingId).emit('participant-audio-toggle', {
          socketId: socket.id,
          userId: participant.userId,
          isEnabled
        });
        console.log(`🎤 ${participant.userName} ${isEnabled ? 'unmuted' : 'muted'} audio`);
      }
    });

    socket.on('toggle-video', ({ meetingId, isEnabled }) => {
      const participant = participants.get(socket.id);
      if (participant && participant.meetingId === meetingId) {
        // Update participant state
        const meeting = meetings.get(meetingId);
        if (meeting && meeting.participants.has(socket.id)) {
          meeting.participants.get(socket.id).videoEnabled = isEnabled;
        }
        
        socket.to(meetingId).emit('participant-video-toggle', {
          socketId: socket.id,
          userId: participant.userId,
          isEnabled
        });
        console.log(`📹 ${participant.userName} ${isEnabled ? 'enabled' : 'disabled'} video`);
      }
    });

    // Handle screen sharing
    socket.on('start-screen-share', ({ meetingId }) => {
      const participant = participants.get(socket.id);
      if (participant && participant.meetingId === meetingId) {
        socket.to(meetingId).emit('user-started-screen-share', {
          socketId: socket.id,
          userId: participant.userId,
          userName: participant.userName
        });
        console.log(`🖥️  ${participant.userName} started screen sharing`);
      }
    });

    socket.on('stop-screen-share', ({ meetingId }) => {
      const participant = participants.get(socket.id);
      if (participant && participant.meetingId === meetingId) {
        socket.to(meetingId).emit('user-stopped-screen-share', {
          socketId: socket.id,
          userId: participant.userId
        });
        console.log(`🖥️  ${participant.userName} stopped screen sharing`);
      }
    });

    /**
     * Chat and Messaging
     */
    
    // Join user to general user room for notifications
    socket.on('join', ({ userId }) => {
      socket.join(`user-${userId}`);
      console.log(`👤 User ${userId} joined their room`);
    });
    
    // Join chat room
    socket.on('joinChat', ({ chatId }) => {
      socket.join(`chat-${chatId}`);
      console.log(`💬 User joined chat: ${chatId}`);
    });

    // Leave chat room
    socket.on('leaveChat', ({ chatId }) => {
      socket.leave(`chat-${chatId}`);
      console.log(`💬 User left chat: ${chatId}`);
    });

    // Handle sending messages
    socket.on('sendMessage', ({ chatId, message }) => {
      console.log(`💬 Broadcasting message to chat-${chatId}:`, message);
      
      // Broadcast the new message to all users in the chat room
      io.to(`chat-${chatId}`).emit('newMessage', {
        ...message,
        chatId
      });
      
      // Also send to specific users' rooms for notifications if they're not in chat
      message.participants?.forEach(participantId => {
        io.to(`user-${participantId}`).emit('newChatNotification', {
          chatId,
          message,
          type: 'chat'
        });
      });
    });

    // Typing indicators for chat
    socket.on('typing', ({ chatId, userId, userName }) => {
      socket.to(`chat-${chatId}`).emit('userTyping', {
        userId,
        userName
      });
    });

    socket.on('stopTyping', ({ chatId, userId }) => {
      socket.to(`chat-${chatId}`).emit('userStoppedTyping', {
        userId
      });
    });

    // Meeting chat messages (existing functionality)
    socket.on('send-message', ({ meetingId, message }) => {
      const participant = participants.get(socket.id);
      if (participant && participant.meetingId === meetingId) {
        const messageData = {
          id: Date.now().toString(),
          senderId: participant.userId,
          senderName: participant.userName,
          message,
          timestamp: new Date()
        };
        
        // Send to all participants in the meeting
        io.to(meetingId).emit('new-message', messageData);
        console.log(`💬 Meeting message from ${participant.userName}: ${message}`);
      }
    });

    /**
     * Leave Meeting
     */
    socket.on('leave-meeting', ({ meetingId }) => {
      const participant = participants.get(socket.id);
      if (participant && participant.meetingId === meetingId) {
        console.log(`👋 ${participant.userName} leaving meeting: ${meetingId}`);
        
        // Notify other participants
        socket.to(meetingId).emit('user-left', {
          socketId: socket.id,
          userId: participant.userId,
          userName: participant.userName
        });
        
        // Leave socket room
        socket.leave(meetingId);
        
        // Remove from tracking
        removeParticipantFromMeeting(socket.id);
        
        // Confirm leave
        socket.emit('leave-success');
      }
    });

    /**
     * Disconnect Handler
     */
    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${socket.id}`);
      
      const participant = participants.get(socket.id);
      if (participant) {
        // Notify meeting participants
        socket.to(participant.meetingId).emit('user-left', {
          socketId: socket.id,
          userId: participant.userId,
          userName: participant.userName
        });
        
        // Clean up
        removeParticipantFromMeeting(socket.id);
        console.log(`🧹 Cleaned up participant: ${participant.userName}`);
      }
    });

    /**
     * Meeting Management
     */
    socket.on('get-meeting-info', ({ meetingId }) => {
      const meeting = meetings.get(meetingId);
      if (meeting) {
        socket.emit('meeting-info', {
          meetingId,
          participantCount: meeting.participants.size,
          participants: Array.from(meeting.participants.values()).map(p => ({
            userId: p.userId,
            userName: p.userName,
            isHost: p.isHost,
            joinedAt: p.joinedAt,
            audioEnabled: p.audioEnabled,
            videoEnabled: p.videoEnabled
          }))
        });
      } else {
        socket.emit('meeting-info', { meetingId, participantCount: 0, participants: [] });
      }
    });

    // Generate new meeting ID
    socket.on('create-meeting', (callback) => {
      const meetingId = generateMeetingId();
      console.log(`🆕 Generated new meeting ID: ${meetingId}`);
      if (callback) callback({ meetingId });
    });
    });
  } // End of Socket.IO conditional block

  // Start server
  httpServer.listen(port, (err) => {
    if (err) throw err;
    console.log(`🚀 Server ready on http://${hostname}:${port}`);
    console.log(`📡 WebRTC Signaling Server running`);
    console.log(`🎥 Google Meet-like Video Conferencing Active`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    httpServer.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});
