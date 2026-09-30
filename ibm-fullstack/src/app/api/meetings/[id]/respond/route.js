import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Meeting from '@/models/Meeting';
import connectDB from '@/lib/mongodb';
import { getSocket } from '@/lib/socket';

// POST /api/meetings/[id]/respond - Respond to meeting invitation
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    // Await params in Next.js 15
    const { id } = await params;
    const { response } = await request.json(); // 'accepted' or 'declined'

    if (!['accepted', 'declined'].includes(response)) {
      return NextResponse.json({ error: 'Invalid response' }, { status: 400 });
    }

    const meeting = await Meeting.findOne({ meetingId: id });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Find participant
    const participantIndex = meeting.participants.findIndex(p => 
      p.userId.toString() === session.user.id
    );

    if (participantIndex === -1) {
      return NextResponse.json({ error: 'Not invited to this meeting' }, { status: 403 });
    }

    // Update participant status
    meeting.participants[participantIndex].status = response;
    await meeting.save();

    // Notify host and other participants
    try {
      const io = getSocket();
      io.emit('meeting-response', {
        meetingId: meeting.meetingId,
        userId: session.user.id,
        userName: session.user.name,
        response
      });
    } catch (socketError) {
      console.warn('Failed to send response notification:', socketError);
    }

    return NextResponse.json({
      success: true,
      response,
      meeting: {
        _id: meeting._id,
        title: meeting.title,
        scheduledAt: meeting.scheduledAt,
        status: meeting.status
      }
    });

  } catch (error) {
    console.error('Meeting response error:', error);
    return NextResponse.json({ error: 'Failed to respond to meeting' }, { status: 500 });
  }
}
