import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Meeting from '@/models/Meeting';
import connectDB from '@/lib/mongodb';
import { v4 as uuidv4 } from 'uuid';
import { getSocket } from '@/lib/socket';

// GET /api/meetings - Get user's meetings
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit')) || 10;
    const page = parseInt(searchParams.get('page')) || 1;

    let query = {};

    // Show all meetings to everyone (company members can see all meeting transcripts)
    // If user wants to filter by their own meetings, they can use a query parameter
    const myMeetingsOnly = searchParams.get('myMeetingsOnly');
    if (myMeetingsOnly === 'true') {
      query = {
        $or: [
          { hostId: session.user.id },
          { 'participants.userId': session.user.id }
        ]
      };
    }

    if (status) {
      query.status = status;
    }

    // Get recent meetings sorted by creation date (newest first)
    const meetings = await Meeting.find(query)
      .sort({ createdAt: -1, scheduledAt: -1 }) // Sort by newest first
      .limit(limit)
      .skip((page - 1) * limit)
      .populate('hostId', 'name email')
      .populate('participants.userId', 'name email');

    // Get total count for pagination
    const total = await Meeting.countDocuments(query);

    // Format meetings for frontend consumption
    const formattedMeetings = meetings.map(meeting => ({
      id: meeting._id,
      meetingId: meeting.meetingId,
      title: meeting.title,
      description: meeting.description,
      hostName: meeting.hostName,
      participants: meeting.participants?.map(p => p.userName) || [],
      participantCount: meeting.participants?.length || 0,
      scheduledAt: meeting.scheduledAt,
      startedAt: meeting.startedAt,
      endedAt: meeting.endedAt,
      status: meeting.status,
      hasSummary: Boolean(meeting.summary),
      summary: meeting.summary,
      summaryGeneratedAt: meeting.summaryGeneratedAt,
      duration: meeting.actualDuration || meeting.duration || 0,
      transcriptCount: meeting.transcripts?.length || 0,
      hasTranscripts: Boolean(meeting.transcripts?.length > 0),
      transcripts: meeting.transcripts || [],
      createdAt: meeting.createdAt,
      updatedAt: meeting.updatedAt
    }));

    return NextResponse.json({
      meetings: formattedMeetings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get meetings error:', error);
    return NextResponse.json({ error: 'Failed to fetch meetings' }, { status: 500 });
  }
}

// POST /api/meetings - Create new meeting
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Allow meeting creation without authentication for video meetings
    // but save to database with user info if available
    const { meetingId: providedMeetingId, title, description, scheduledAt, participants, settings, password } = await request.json();

    if (!title || !scheduledAt) {
      return NextResponse.json({ 
        error: 'Title and scheduled time are required' 
      }, { status: 400 });
    }

    await connectDB();

    const meetingId = providedMeetingId || uuidv4(); // Use provided ID or generate new one
    const hostId = session?.user?.id || null;
    const hostName = session?.user?.name || 'Anonymous User';

    const meeting = new Meeting({
      title,
      description,
      hostId,
      hostName,
      scheduledAt: new Date(scheduledAt),
      meetingId,
      password: password || null,
      participants: participants?.map(p => ({
        userId: p.userId,
        userName: p.userName,
        email: p.email,
        status: 'invited'
      })) || [],
      settings: {
        audioEnabled: settings?.audioEnabled ?? true,
        videoEnabled: settings?.videoEnabled ?? true,
        transcriptionEnabled: settings?.transcriptionEnabled ?? true,
        recordingEnabled: settings?.recordingEnabled ?? false
      }
    });

    await meeting.save();
    console.log('✅ Meeting saved to database:', meeting.meetingId);

    // Send real-time invitations if participants exist
    if (participants && participants.length > 0) {
      try {
        const io = getSocket();
        io.emit('send-meeting-invitation', {
          meetingId: meeting.meetingId,
          participants: meeting.participants,
          meetingData: {
            title: meeting.title,
            description: meeting.description,
            scheduledAt: meeting.scheduledAt,
            hostName: meeting.hostName
          }
        });
      } catch (socketError) {
        console.warn('Failed to send real-time invitations:', socketError);
      }
    }

    return NextResponse.json({
      success: true,
      meeting: {
        _id: meeting._id,
        title: meeting.title,
        description: meeting.description,
        meetingId: meeting.meetingId,
        scheduledAt: meeting.scheduledAt,
        status: meeting.status,
        hostName: meeting.hostName,
        participants: meeting.participants
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Create meeting error:', error);
    return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 });
  }
}
