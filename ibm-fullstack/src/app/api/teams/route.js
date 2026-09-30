import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Team from '@/models/Team';
import User from '@/models/User';
import Company from '@/models/Company';
import Notification from '@/models/Notification';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    // Ensure ChatNew model is registered
    const ChatNew = (await import('@/models/ChatNew')).default;

    const user = await User.findById(session.user.id);
    if (!user || !user.company) {
      return NextResponse.json({ error: 'User not found or not in a company' }, { status: 404 });
    }

    const teams = await Team.find({
      $or: [
        { teamLead: user._id },
        { 'members.user': user._id }
      ]
    })
    .populate('teamLead', 'name email')
    .populate('members.user', 'name email')
    .populate('invites.user', 'name email')
    .populate('company', 'name')
    .populate('chat')
    .sort({ createdAt: -1 });

    return NextResponse.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, selectedMembers } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }

    await connectDB();
    
    // Ensure ChatNew model is registered
    const ChatNew = (await import('@/models/ChatNew')).default;

    const user = await User.findById(session.user.id);
    if (!user || !user.company) {
      return NextResponse.json({ error: 'User not found or not in a company' }, { status: 404 });
    }

    // Create team with invites
    const team = new Team({
      name,
      description,
      company: user.company,
      teamLead: user._id,
      members: [],
      invites: selectedMembers.map(memberId => ({
        user: memberId,
        status: 'pending',
        invitedAt: new Date()
      }))
    });

    await team.save();

    // Create team chat automatically
    const teamChat = new ChatNew({
      type: 'team',
      name: `${name} - Team Chat`,
      team: team._id,
      company: user.company,
      participants: [user._id], // Start with team lead, members will be added when they accept invites
      messages: []
    });

    await teamChat.save();

    // Update team with chat reference
    team.chat = teamChat._id;
    await team.save();

    // Create notifications for invited members
    const notifications = selectedMembers.map(memberId => ({
      user: memberId,
      type: 'team_invite',
      title: 'Team Invitation',
      message: `You've been invited to join the team "${name}" by ${user.name}`,
      actionUrl: '/teams',
      data: { teamId: team._id }
    }));

    await Notification.insertMany(notifications);

    // Populate the team before returning
    await team.populate('teamLead', 'name email');
    await team.populate('members.user', 'name email');

    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
