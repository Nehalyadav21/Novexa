import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Meeting from '@/models/Meeting';

export async function POST(req, { params }) {
  try {
    // Allow both authenticated and unauthenticated access for development
    let session = null;
    let userId = null;
    
    try {
      session = await getServerSession(authOptions);
      if (session?.user?.id) {
        userId = session.user.id;
      }
    } catch (authError) {
      console.log('Authentication not available, proceeding with anonymous access');
    }

    await dbConnect();
    
    // Await params in Next.js 15
    const { id } = await params;

    const meeting = await Meeting.findOne({ meetingId: id });
    if (!meeting) {
      return Response.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Check if user is the host (if authenticated)
    if (userId && String(meeting.hostId) !== userId) {
      return Response.json({ error: 'Only the host can start the meeting' }, { status: 403 });
    }

    // Update meeting status to started
    meeting.status = 'started';
    meeting.startedAt = new Date();
    await meeting.save();

    // Notify all participants that meeting has started
    try {
      const io = require('@/lib/socket').getSocket();
      if (io) {
        // Notify all participants
        meeting.participants.forEach(participant => {
          io.to(`user-${participant.userId}`).emit('meeting-started', {
            meetingId: meeting.meetingId,
            meetingTitle: meeting.title,
            hostName: meeting.hostName,
            startedAt: meeting.startedAt
          });
        });
      }
    } catch (socketError) {
      console.warn('Failed to send meeting started notifications:', socketError);
    }

    return Response.json({
      success: true,
      meeting: {
        _id: meeting._id,
        title: meeting.title,
        description: meeting.description,
        meetingId: meeting.meetingId,
        status: meeting.status,
        startedAt: meeting.startedAt,
        hostId: meeting.hostId,
        hostName: meeting.hostName,
        participants: meeting.participants
      }
    });
  } catch (error) {
    console.error('Error starting meeting:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
