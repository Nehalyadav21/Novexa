import connectDB from '@/lib/mongodb';
import Company from '@/models/Company';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roleId } = params;
    const { companyId } = await request.json();

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    const company = await Company.findById(companyId);
    
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Check if user is the owner
    if (String(company.owner) !== String(user._id)) {
      return NextResponse.json({ error: 'Only company owner can remove roles' }, { status: 403 });
    }

    // Don't allow removing the Owner role
    const role = company.roles.find(r => String(r._id) === roleId);
    if (role?.name === 'Owner') {
      return NextResponse.json({ error: 'Cannot remove the Owner role' }, { status: 400 });
    }

    // Remove the role and update members who had this role
    const roleName = role?.name;
    company.roles = company.roles.filter(r => String(r._id) !== roleId);
    company.members.forEach(member => {
      if (member.role === roleName) {
        member.role = 'Member';
      }
    });

    await company.save();

    // Populate the members with user data before returning
    await company.populate('members.user', 'name email');

    return NextResponse.json({ company });
  } catch (error) {
    console.error('Error removing role:', error);
    return NextResponse.json({ error: 'Failed to remove role' }, { status: 500 });
  }
}
