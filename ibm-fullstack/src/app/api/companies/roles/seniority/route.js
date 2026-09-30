import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Company from '@/models/Company';
import User from '@/models/User';

// Update role seniority level
export async function PUT(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { companyId, roleId, seniorityLevel } = await req.json();

    if (!companyId || !roleId || seniorityLevel < 1 || seniorityLevel > 10) {
      return NextResponse.json({ 
        message: "Invalid data. Seniority level must be between 1 (highest) and 10 (lowest)" 
      }, { status: 400 });
    }

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    const company = await Company.findById(companyId);

    if (!company) {
      return NextResponse.json({ message: "Company not found" }, { status: 404 });
    }

    // Check if user is the owner
    if (company.owner.toString() !== user._id.toString()) {
      return NextResponse.json({ 
        message: "Only company owner can update seniority levels" 
      }, { status: 403 });
    }

    // Find the role to update
    const roleIndex = company.roles.findIndex(role => role._id.toString() === roleId);
    if (roleIndex === -1) {
      return NextResponse.json({ message: "Role not found" }, { status: 404 });
    }

    // Don't allow updating Owner role seniority
    if (company.roles[roleIndex].name === 'Owner') {
      return NextResponse.json({ 
        message: "Cannot update Owner role seniority level" 
      }, { status: 400 });
    }

    // Update seniority level
    company.roles[roleIndex].seniorityLevel = seniorityLevel;
    await company.save();

    // Populate the members with user data
    await company.populate('members.user', 'name email');

    return NextResponse.json({ 
      message: "Seniority level updated successfully", 
      company 
    });
  } catch (error) {
    console.error('Error updating seniority level:', error);
    return NextResponse.json(
      { message: "Error updating seniority level", error: error.message },
      { status: 500 }
    );
  }
}
