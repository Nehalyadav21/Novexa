import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Meeting from '@/models/Meeting';
import User from '@/models/User';
import Notification from '@/models/Notification';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      title,
      description,
      scheduledAt,
      invitedMembers = [],
      settings = {}
    } = await req.json();

    if (!title || !scheduledAt) {
      return NextResponse.json(
        { error: 'Title and scheduled time are required' },
        { status: 400 }
      );
    }

    await connectDB();

    const host = await User.findById(session.user.id);
    if (!host) {
      return NextResponse.json({ error: 'Host not found' }, { status: 404 });
    }

    // Generate unique meeting ID
    const meetingId = `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Prepare participants
    const participants = [];
    
    // Add invited members
    for (const memberId of invitedMembers) {
      const user = await User.findById(memberId);
      if (user) {
        participants.push({
          userId: user._id,
          userName: user.name,
          email: user.email,
          status: 'invited'
        });
      }
    }

    // Create the meeting
    const meeting = new Meeting({
      title,
      description,
      hostId: host._id,
      hostName: host.name,
      participants,
      scheduledAt: new Date(scheduledAt),
      status: 'scheduled',
      meetingId,
      settings: {
        audioEnabled: settings.audioEnabled !== false,
        videoEnabled: settings.videoEnabled !== false,
        transcriptionEnabled: settings.transcriptionEnabled !== false,
        recordingEnabled: settings.recordingEnabled === true
      }
    });

    await meeting.save();

    // Create notifications for invited members
    if (invitedMembers.length > 0) {
      const notifications = invitedMembers.map(memberId => ({
        user: memberId,
        type: 'meeting_invite',
        title: 'Meeting Invitation',
        message: `You've been invited to "${title}" scheduled for ${new Date(scheduledAt).toLocaleString()}`,
        actionUrl: `/meeting/${meetingId}`,
        data: { 
          meetingId: meeting._id,
          meetingRoomId: meetingId,
          scheduledAt: scheduledAt,
          hostName: host.name
        }
      }));

      await Notification.insertMany(notifications);
    }

    // Populate the meeting before returning
    await meeting.populate('hostId', 'name email');

    return NextResponse.json({
      ...meeting.toObject(),
      joinUrl: `/meeting/${meetingId}`
    }, { status: 201 });

  } catch (error) {
    console.error('Error scheduling meeting:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
