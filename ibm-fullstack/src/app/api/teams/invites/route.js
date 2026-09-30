import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Team from '@/models/Team';
import User from '@/models/User';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find all pending invites for the user
    const teams = await Team.find({
      'invites.user': user._id,
      'invites.status': 'pending'
    })
    .populate('teamLead', 'name email')
    .populate('company', 'name');

    // Format the invites
    const invites = teams.map(team => {
      const invite = team.invites.find(inv => 
        inv.user.toString() === user._id.toString() && inv.status === 'pending'
      );
      
      return {
        _id: invite._id,
        teamId: team._id,
        teamName: team.name,
        teamDescription: team.description,
        teamLead: team.teamLead,
        company: team.company,
        invitedAt: invite.invitedAt,
        status: invite.status
      };
    });

    return NextResponse.json(invites);
  } catch (error) {
    console.error('Error fetching team invites:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
