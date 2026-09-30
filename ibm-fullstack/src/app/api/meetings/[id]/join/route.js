import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Meeting from '@/models/Meeting';
import User from '@/models/User';

export async function POST(req, { params }) {
  try {
    // Allow both authenticated and unauthenticated access for development
    let session = null;
    let userId = null;
    let userName = 'Anonymous User';
    let userEmail = 'anonymous@example.com';
    
    try {
      session = await getServerSession(authOptions);
      if (session?.user?.id) {
        userId = session.user.id;
        userName = session.user.name;
        userEmail = session.user.email;
      }
    } catch (authError) {
      console.log('Authentication not available, proceeding with anonymous access');
    }

    await dbConnect();
    
    // Await params in Next.js 15
    const { id } = await params;
    
    // Get password from request body if provided
    const body = await req.json().catch(() => ({}));
    const { password, userId: requestUserId, userName: requestUserName } = body;
    
    // Use session userId if available, otherwise use the one from request
    if (!userId && requestUserId) {
      userId = requestUserId;
    }
    
    // Use request userName if provided
    if (requestUserName) {
      userName = requestUserName;
    }
    
    const meeting = await Meeting.findOne({ meetingId: id });
    if (!meeting) {
      return Response.json({ error: 'Meeting not found' }, { status: 404 });
    }
    
    // Check if meeting is ended
    if (meeting.status === 'ended') {
      return Response.json({ 
        error: 'This meeting has ended and is no longer accessible' 
      }, { status: 403 });
    }
    
    // Check if meeting is cancelled
    if (meeting.status === 'cancelled') {
      return Response.json({ 
        error: 'This meeting has been cancelled' 
      }, { status: 403 });
    }
    
    // Check password if meeting has one
    if (meeting.password && meeting.password.trim() !== '') {
      if (!password || password !== meeting.password) {
        return Response.json({ 
          error: 'Invalid password. Please enter the correct meeting password.' 
        }, { status: 401 });
      }
    }
    
    // If we have a user session, get user details from database
    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        userName = user.name;
        userEmail = user.email;
      }
    }
    
    // Add user to participants if not already present
    const alreadyParticipant = meeting.participants.some(p => 
      userId ? String(p.userId) === String(userId) : p.email === userEmail
    );
    
    if (!alreadyParticipant) {
      meeting.participants.push({ 
        userId: userId,
        userName: userName,
        email: userEmail,
        joinedAt: new Date(),
        status: 'joined'
      });
      await meeting.save();
      console.log(`✅ Added participant: ${userName} (${userId}) to meeting ${id}`);
    } else {
      // Update existing participant status to 'joined' if they were previously 'left'
      const participantIndex = meeting.participants.findIndex(p => 
        userId ? String(p.userId) === String(userId) : p.email === userEmail
      );
      if (participantIndex > -1 && meeting.participants[participantIndex].status !== 'joined') {
        meeting.participants[participantIndex].status = 'joined';
        meeting.participants[participantIndex].joinedAt = new Date();
        await meeting.save();
        console.log(`✅ Updated participant status: ${userName} (${userId}) rejoined meeting ${id}`);
      }
    }
    
    // Return meeting details
    return Response.json(meeting);
  } catch (error) {
    console.error('Error joining meeting:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
