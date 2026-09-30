import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Meeting from '@/models/Meeting';
import User from '@/models/User';
import Notification from '@/models/Notification';

export async function POST(req, { params }) {
  try {
    console.log('=== INVITE API START ===');
    
    // Await params to fix Next.js 15 requirement
    const { id } = await params;
    console.log('Meeting ID:', id);
    
    const session = await getServerSession(authOptions);
    console.log('Session:', session ? { userId: session.user.id, userEmail: session.user.email } : 'No session');
    
    if (!session) {
      console.log('❌ Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    console.log('Request body:', body);
    
    const { invitedMembers } = body;

    if (!invitedMembers || !Array.isArray(invitedMembers) || invitedMembers.length === 0) {
      console.log('❌ Invalid invited members:', invitedMembers);
      return NextResponse.json(
        { error: 'Invited members are required' },
        { status: 400 }
      );
    }

    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ MongoDB connected');

    console.log('🔍 Finding meeting with meetingId:', id);
    // Use meetingId field instead of _id field
    const meeting = await Meeting.findOne({ meetingId: id });
    console.log('Meeting found:', meeting ? { id: meeting._id, title: meeting.title, hostId: meeting.hostId } : 'Not found');
    
    if (!meeting) {
      console.log('❌ Meeting not found with meetingId:', id);
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Check if user is the host
    console.log('👤 Checking host permissions:', { 
      meetingHostId: meeting.hostId.toString(), 
      sessionUserId: session.user.id,
      isHost: meeting.hostId.toString() === session.user.id
    });
    
    if (meeting.hostId.toString() !== session.user.id) {
      console.log('❌ Permission denied - user is not host');
      return NextResponse.json(
        { error: 'Only the meeting host can invite participants' },
        { status: 403 }
      );
    }

    const currentUser = await User.findById(session.user.id);
    console.log('Current user:', currentUser ? { id: currentUser._id, name: currentUser.name } : 'Not found');
    
    // Get newly invited members that aren't already participants
    const existingParticipantIds = meeting.participants.map(p => p.userId.toString());
    const newMemberIds = invitedMembers.filter(id => !existingParticipantIds.includes(id));
    console.log('Existing participants:', existingParticipantIds);
    console.log('New member IDs to invite:', newMemberIds);

    if (newMemberIds.length === 0) {
      console.log('ℹ️ All selected members are already invited');
      return NextResponse.json({ message: 'All selected members are already invited' });
    }

    // Add new participants to the meeting
    for (const memberId of newMemberIds) {
      console.log('🔍 Finding user with ID:', memberId);
      const user = await User.findById(memberId);
      if (user) {
        console.log('✅ Adding participant:', { id: user._id, name: user.name, email: user.email });
        meeting.participants.push({
          userId: user._id,
          userName: user.name,
          email: user.email,
          status: 'invited'
        });
      } else {
        console.log('⚠️ User not found with ID:', memberId);
      }
    }

    console.log('💾 Saving meeting...');
    await meeting.save();
    console.log('✅ Meeting saved');

    // Create notifications for newly invited members
    console.log('📝 Creating notifications...');
    const notifications = newMemberIds.map(memberId => ({
      user: memberId,
      type: 'meeting_invite_live',
      title: 'Live Meeting Invitation',
      message: `${currentUser.name} has invited you to join the ongoing meeting "${meeting.title}"`,
      actionUrl: `/meeting/${meeting.meetingId}`,
      data: { 
        meetingId: meeting._id,
        meetingRoomId: meeting.meetingId,
        isLive: true,
        hostName: currentUser.name
      }
    }));

    console.log('Notifications to create:', notifications);
    await Notification.insertMany(notifications);
    console.log('✅ Notifications created');

    const response = {
      message: `${newMemberIds.length} new participant(s) invited successfully`,
      invitedCount: newMemberIds.length
    };
    
    console.log('=== INVITE API SUCCESS ===');
    console.log('Response:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('=== INVITE API ERROR ===');
    console.error('Error inviting participants to meeting:', error);
    console.error('Stack trace:', error.stack);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
