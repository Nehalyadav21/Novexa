import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Meeting from '@/models/Meeting';
import connectDB from '@/lib/mongodb';
import { getSocket } from '@/lib/socket';

// GET /api/meetings/[id] - Get specific meeting
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    // Await params in Next.js 15
    const { id } = await params;

    const meeting = await Meeting.findOne({ meetingId: id })
      .populate('hostId', 'name email')
      .populate('participants.userId', 'name email');

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Check if user has access to this meeting
    const isHost = meeting.hostId._id.toString() === session.user.id;
    const isParticipant = meeting.participants.some(p => 
      p.userId._id.toString() === session.user.id
    );

    // Allow access to transcripts for all users (company members can view all meeting transcripts)
    // Only restrict access to meeting management/editing functions
    const canEdit = isHost || isParticipant;

    return NextResponse.json({ 
      meeting,
      canEdit,
      isHost,
      isParticipant 
    });

  } catch (error) {
    console.error('Get meeting error:', error);
    return NextResponse.json({ error: 'Failed to fetch meeting' }, { status: 500 });
  }
}

// PUT /api/meetings/[id] - Update meeting status and other fields
export async function PUT(request, { params }) {
  try {
    await connectDB();
    
    const { id } = await params;
    const { status, title, description, scheduledAt, settings } = await request.json();
    
    if (!status && !title && !description && !scheduledAt && !settings) {
      return NextResponse.json(
        { error: 'At least one field is required for update' },
        { status: 400 }
      );
    }
    
    const meeting = await Meeting.findOne({ meetingId: id });
    if (!meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      );
    }
    
    // Update meeting fields
    if (status) {
      const validStatuses = ['scheduled', 'started', 'ended'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') },
          { status: 400 }
        );
      }
      meeting.status = status;
      
      if (status === 'started' && !meeting.startedAt) {
        meeting.startedAt = new Date();
        
        // Notify accepted participants
        try {
          const io = getSocket();
          io.emit('meeting-started', {
            meetingId: meeting.meetingId,
            participants: meeting.participants
          });
        } catch (socketError) {
          console.warn('Failed to send meeting started notification:', socketError);
        }
      } else if (status === 'ended' && !meeting.endedAt) {
        meeting.endedAt = new Date();
        meeting.duration = Math.round((meeting.endedAt - meeting.startedAt) / (1000 * 60));
      }
    }
    
    if (title) meeting.title = title;
    if (description) meeting.description = description;
    if (scheduledAt) meeting.scheduledAt = scheduledAt;
    if (settings) meeting.settings = { ...meeting.settings, ...settings };
    
    meeting.updatedAt = new Date();
    await meeting.save();
    
    return NextResponse.json({
      success: true,
      meeting: {
        id: meeting._id,
        status: meeting.status,
        startedAt: meeting.startedAt,
        endedAt: meeting.endedAt,
        updatedAt: meeting.updatedAt,
        title: meeting.title,
        description: meeting.description,
        scheduledAt: meeting.scheduledAt,
        settings: meeting.settings
      }
    });
    
  } catch (error) {
    console.error('Error updating meeting:', error);
    return NextResponse.json(
      { error: 'Failed to update meeting' },
      { status: 500 }
    );
  }
}

// DELETE /api/meetings/[id] - Cancel meeting
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    // Await params in Next.js 15
    const { id } = await params;

    const meeting = await Meeting.findOne({ meetingId: id });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Only host can cancel meeting
    if (meeting.hostId.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Only host can cancel meeting' }, { status: 403 });
    }

    meeting.status = 'cancelled';
    await meeting.save();

    // Notify participants
    try {
      const io = getSocket();
      meeting.participants.forEach(participant => {
        io.to(`user-${participant.userId}`).emit('meeting-cancelled', {
          meetingId: meeting.meetingId,
          title: meeting.title
        });
      });
    } catch (socketError) {
      console.warn('Failed to send cancellation notifications:', socketError);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Cancel meeting error:', error);
    return NextResponse.json({ error: 'Failed to cancel meeting' }, { status: 500 });
  }
}
