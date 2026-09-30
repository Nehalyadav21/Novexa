import dbConnect from '@/lib/mongodb';
import Meeting from '@/models/Meeting';

export async function GET(req, { params }) {
  try {
    await dbConnect();
    
    // Await params in Next.js 15
    const { id } = await params;
    
    const meeting = await Meeting.findOne({ meetingId: id });
    if (!meeting) {
      return Response.json({ error: 'Meeting not found' }, { status: 404 });
    }
    
    // Return only active participants (status: 'joined')
    const activeParticipants = meeting.participants.filter(p => p.status === 'joined');
    
    return Response.json({ 
      participants: activeParticipants,
      count: activeParticipants.length
    });
  } catch (error) {
    console.error('Error getting participants:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
