import dbConnect from '@/lib/mongodb';
import Meeting from '@/models/Meeting';

// Simple signaling endpoint for WebRTC
export async function POST(req, { params }) {
  try {
    await dbConnect();
    
    const { id } = await params;
    const { type, fromUserId, toUserId, signal } = await req.json();
    
    const meeting = await Meeting.findOne({ meetingId: id });
    if (!meeting) {
      return Response.json({ error: 'Meeting not found' }, { status: 404 });
    }
    
    // Store signaling data temporarily in meeting document
    if (!meeting.signalingData) {
      meeting.signalingData = [];
    }
    
    // Add the signal
    meeting.signalingData.push({
      type,
      fromUserId,
      toUserId,
      signal,
      timestamp: new Date()
    });
    
    // Keep only last 100 signals to prevent bloat
    if (meeting.signalingData.length > 100) {
      meeting.signalingData = meeting.signalingData.slice(-100);
    }
    
    await meeting.save();
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('Signaling error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get pending signals for a user
export async function GET(req, { params }) {
  try {
    await dbConnect();
    
    const { id } = await params;
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return Response.json({ error: 'userId is required' }, { status: 400 });
    }
    
    const meeting = await Meeting.findOne({ meetingId: id });
    if (!meeting) {
      return Response.json({ error: 'Meeting not found' }, { status: 404 });
    }
    
    // Get signals for this user
    const signals = meeting.signalingData?.filter(signal => 
      signal.toUserId === userId || signal.toUserId === 'broadcast'
    ) || [];
    
    // Mark signals as read by removing them
    meeting.signalingData = meeting.signalingData?.filter(signal => 
      signal.toUserId !== userId && signal.toUserId !== 'broadcast'
    ) || [];
    
    await meeting.save();
    
    return Response.json({ signals });
  } catch (error) {
    console.error('Get signals error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
