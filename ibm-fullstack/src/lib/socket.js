import { Server } from 'socket.io';

let io;

export const initSocket = (server) => {
  if (!io) {
    io = new Server(server, {
      cors: {
        origin: process.env.NEXTAUTH_URL || "http://localhost:3001",
        methods: ["GET", "POST"]
      }
    });

    io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      // Join user to their personal room for notifications
      socket.on('join-user-room', (userId) => {
        socket.join(`user-${userId}`);
        console.log(`User ${userId} joined their room`);
      });

      // Join meeting room
      socket.on('join-meeting', ({ meetingId, userId, userName }) => {
        socket.join(`meeting-${meetingId}`);
        socket.to(`meeting-${meetingId}`).emit('user-joined', {
          userId,
          userName,
          socketId: socket.id
        });
        console.log(`User ${userName} joined meeting ${meetingId}`);
      });

      // Leave meeting room
      socket.on('leave-meeting', ({ meetingId, userId, userName }) => {
        socket.leave(`meeting-${meetingId}`);
        socket.to(`meeting-${meetingId}`).emit('user-left', {
          userId,
          userName,
          socketId: socket.id
        });
        console.log(`User ${userName} left meeting ${meetingId}`);
      });

      // WebRTC signaling
      socket.on('offer', ({ meetingId, offer, targetSocketId }) => {
        socket.to(targetSocketId).emit('offer', {
          offer,
          senderSocketId: socket.id
        });
      });

      socket.on('answer', ({ meetingId, answer, targetSocketId }) => {
        socket.to(targetSocketId).emit('answer', {
          answer,
          senderSocketId: socket.id
        });
      });

      socket.on('ice-candidate', ({ meetingId, candidate, targetSocketId }) => {
        socket.to(targetSocketId).emit('ice-candidate', {
          candidate,
          senderSocketId: socket.id
        });
      });

      // Audio transcription
      socket.on('audio-transcript', ({ meetingId, userId, userName, text, confidence }) => {
        // Broadcast transcript to all meeting participants
        socket.to(`meeting-${meetingId}`).emit('transcript-received', {
          userId,
          userName,
          text,
          confidence,
          timestamp: new Date()
        });
      });

      // Meeting invitations
      socket.on('send-meeting-invitation', ({ meetingId, participants, meetingData }) => {
        participants.forEach(participant => {
          socket.to(`user-${participant.userId}`).emit('meeting-invitation', {
            meetingId,
            meetingData,
            from: meetingData.hostName
          });
        });
      });

      // Meeting responses
      socket.on('meeting-response', ({ meetingId, userId, userName, response }) => {
        socket.to(`meeting-${meetingId}`).emit('participant-response', {
          userId,
          userName,
          response
        });
      });

      // Meeting started notification
      socket.on('meeting-started', ({ meetingId, participants }) => {
        participants.forEach(participant => {
          if (participant.status === 'accepted') {
            socket.to(`user-${participant.userId}`).emit('meeting-started', {
              meetingId
            });
          }
        });
      });

      // Screen sharing
      socket.on('start-screen-share', ({ meetingId, userId, userName }) => {
        socket.to(`meeting-${meetingId}`).emit('screen-share-started', {
          userId,
          userName,
          socketId: socket.id
        });
      });

      socket.on('stop-screen-share', ({ meetingId, userId, userName }) => {
        socket.to(`meeting-${meetingId}`).emit('screen-share-stopped', {
          userId,
          userName,
          socketId: socket.id
        });
      });

      // Chat messages in meeting
      socket.on('meeting-chat', ({ meetingId, userId, userName, message }) => {
        socket.to(`meeting-${meetingId}`).emit('chat-message', {
          userId,
          userName,
          message,
          timestamp: new Date()
        });
      });

      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
      });
    });
  }

  return io;
};

export const getSocket = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

export { io };
