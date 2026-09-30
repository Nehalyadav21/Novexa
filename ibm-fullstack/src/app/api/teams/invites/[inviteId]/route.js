import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Team from '@/models/Team';
import User from '@/models/User';

export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { inviteId } = params;
    const { action } = await req.json();

    if (!['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await connectDB();
    
    // Ensure ChatNew model is registered
    const ChatNew = (await import('@/models/ChatNew')).default;

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find the team with the invite
    const team = await Team.findOne({
      'invites._id': inviteId,
      'invites.user': user._id
    });

    if (!team) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    // Update the invite status
    const invite = team.invites.id(inviteId);
    invite.status = action === 'accept' ? 'accepted' : 'rejected';
    invite.respondedAt = new Date();

    // If accepted, add user to team members
    if (action === 'accept') {
      team.members.push({
        user: user._id,
        joinedAt: new Date()
      });

      // Add user to team chat and ensure all team members are in the chat
      if (team.chat) {
        const teamChat = await ChatNew.findById(team.chat);
        if (teamChat) {
          // Add the new member if not already in chat
          if (!teamChat.participants.includes(user._id)) {
            teamChat.participants.push(user._id);
          }
          
          // Ensure all team members and team lead are in the chat
          const allTeamUserIds = [
            team.teamLead,
            ...team.members.map(m => m.user)
          ];
          
          // Add any missing participants
          for (const userId of allTeamUserIds) {
            if (!teamChat.participants.includes(userId)) {
              teamChat.participants.push(userId);
            }
          }
          
          await teamChat.save();
        }
      } else {
        // Create team chat if it doesn't exist (fallback)
        const allTeamUserIds = [
          team.teamLead,
          ...team.members.map(m => m.user)
        ];
        
        const teamChat = new ChatNew({
          type: 'team',
          name: `${team.name} - Team Chat`,
          team: team._id,
          company: team.company,
          participants: allTeamUserIds,
          messages: []
        });
        await teamChat.save();
        
        // Update team with chat reference
        team.chat = teamChat._id;
      }
    }

    await team.save();

    return NextResponse.json({ message: `Invite ${action}ed successfully` });
  } catch (error) {
    console.error('Error responding to team invite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
