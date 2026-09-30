import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Team from '@/models/Team';
import User from '@/models/User';
import Notification from '@/models/Notification';

export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId } = params;

    await connectDB();
    
    // Ensure ChatNew model is registered
    const ChatNew = (await import('@/models/ChatNew')).default;

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find the team
    const team = await Team.findById(teamId)
      .populate('teamLead', 'name email')
      .populate('members.user', 'name email');

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if the current user is the team lead
    if (team.teamLead._id.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Only team lead can delete the team' }, { status: 403 });
    }

    // Get all team members and participants for notifications
    const allParticipants = [
      ...team.members.map(m => m.user._id),
      ...team.invites.filter(i => i.status === 'pending').map(i => i.user)
    ];

    // Delete associated team chat if it exists
    if (team.chat) {
      await ChatNew.findByIdAndDelete(team.chat);
    }

    // Create notifications for all team members
    if (allParticipants.length > 0) {
      const notifications = allParticipants.map(userId => ({
        user: userId,
        type: 'team_deleted',
        title: 'Team Deleted',
        message: `The team "${team.name}" has been deleted by ${user.name}`,
        actionUrl: '/teams',
        data: { teamName: team.name }
      }));

      await Notification.insertMany(notifications);
    }

    // Delete the team
    await Team.findByIdAndDelete(teamId);

    return NextResponse.json({ 
      message: 'Team deleted successfully',
      deletedTeam: {
        id: team._id,
        name: team.name
      }
    });

  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId } = params;

    await connectDB();

    const team = await Team.findById(teamId)
      .populate('teamLead', 'name email')
      .populate('members.user', 'name email')
      .populate('invites.user', 'name email')
      .populate('company', 'name')
      .populate('chat');

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    return NextResponse.json(team);

  } catch (error) {
    console.error('Error fetching team:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
