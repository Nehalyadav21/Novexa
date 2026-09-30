import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Company from '@/models/Company';
import CheckIn from '@/models/CheckIn';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { userId } = params;
    
    // Get the current user's company to verify they can view this profile
    const currentUser = await User.findById(session.user.id);
    if (!currentUser || !currentUser.company) {
      return NextResponse.json({ error: 'User not found or not in a company' }, { status: 404 });
    }

    // Get the target user and verify they're in the same company
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if both users are in the same company
    if (String(currentUser.company) !== String(targetUser.company)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get company details to check if current user is owner
    const company = await Company.findById(currentUser.company);
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const isOwner = String(company.owner) === String(session.user.id);
    
    // If not owner, only allow viewing own profile
    if (!isOwner && String(targetUser._id) !== String(session.user.id)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get user's role in company
    const memberData = company.members.find(m => String(m.user) === String(userId));
    const userRole = memberData?.role || 'Member';

    // Get user's recent check-ins (last 30 days) if owner is viewing
    let recentCheckIns = [];
    if (isOwner || String(targetUser._id) === String(session.user.id)) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      recentCheckIns = await CheckIn.find({
        user: userId,
        date: { $gte: thirtyDaysAgo }
      }).sort({ date: -1 }).limit(10);
    }

    const profileData = {
      _id: targetUser._id,
      name: targetUser.name,
      email: targetUser.email,
      profilePicture: targetUser.profilePicture,
      role: userRole,
      joinedAt: memberData?.joinedAt,
      company: {
        name: company.name,
        _id: company._id
      },
      recentCheckIns: recentCheckIns,
      canEdit: String(targetUser._id) === String(session.user.id)
    };

    return NextResponse.json(profileData);

  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
