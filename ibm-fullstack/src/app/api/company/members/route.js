import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Company from '@/models/Company';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user || !user.company) {
      return NextResponse.json({ error: 'User or company not found' }, { status: 404 });
    }

    const company = await Company.findById(user.company)
      .populate('members.user', 'name email');

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Check if user can view members (owners and employees can see team members)
    const isOwner = company.owner.toString() === session.user.id;
    const isMember = company.members.some(m => m.user._id.toString() === session.user.id);

    if (!isOwner && !isMember) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Format members with role information
    const members = company.members.map(member => {
      const role = company.roles.find(r => r.name === member.role);
      return {
        user: member.user,
        role: member.role,
        seniorityLevel: role ? role.seniorityLevel : 1,
        joinedAt: member.joinedAt,
        isOwner: company.owner.toString() === member.user._id.toString()
      };
    });

    return NextResponse.json({
      success: true,
      members,
      company: {
        name: company.name,
        roles: company.roles
      }
    });

  } catch (error) {
    console.error('Get company members error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch company members',
      details: String(error)
    }, { status: 500 });
  }
}
