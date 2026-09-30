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
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let profile = {
      name: user.name,
      email: user.email,
      companyName: null,
      role: null,
      seniorityLevel: null,
      joinedAt: null,
      isOwner: false
    };

    if (user.company) {
      const company = await Company.findById(user.company);
      if (company) {
        profile.companyName = company.name;
        profile.isOwner = company.owner.toString() === session.user.id;
        
        const member = company.members.find(m => m.user.toString() === session.user.id);
        if (member) {
          profile.role = member.role;
          profile.joinedAt = member.joinedAt;
          
          const role = company.roles.find(r => r.name === member.role);
          if (role) {
            profile.seniorityLevel = role.seniorityLevel;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      profile
    });

  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch profile',
      details: String(error)
    }, { status: 500 });
  }
}
