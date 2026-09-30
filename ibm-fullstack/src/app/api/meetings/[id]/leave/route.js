import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Meeting from '@/models/Meeting';

export async function POST(req, { params }) {
  try {
    // Allow both authenticated and unauthenticated access
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
    
    // Get user info from request body
    const body = await req.json().catch(() => ({}));
    const { userId: requestUserId, userName, userEmail } = body;
    
    const meeting = await Meeting.findOne({ meetingId: id });
    if (!meeting) {
      return Response.json({ error: 'Meeting not found' }, { status: 404 });
    }
    
    // Find and update the participant's status
    const participantIndex = meeting.participants.findIndex(p => {
      if (userId && p.userId) {
        return String(p.userId) === userId;
      }
      if (requestUserId && p.userId) {
        return String(p.userId) === requestUserId;
      }
      if (userEmail && p.email) {
        return p.email === userEmail;
      }
      if (userName && p.userName) {
        return p.userName === userName;
      }
      return false;
    });
    
    if (participantIndex > -1) {
      // Update participant status to 'left'
      meeting.participants[participantIndex].status = 'left';
      meeting.participants[participantIndex].leftAt = new Date();
      await meeting.save();
      
      console.log(`Participant ${userName || userEmail || 'anonymous'} left meeting ${id}`);
    }
    
    // Return success
    return Response.json({ 
      success: true, 
      message: 'Successfully left meeting' 
    });
    
  } catch (error) {
    console.error('Error leaving meeting:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
