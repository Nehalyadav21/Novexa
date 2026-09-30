import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Company from '@/models/Company';
import User from '@/models/User';

// Add new role
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { companyId, roleName, roleDescription, seniorityLevel = 1 } = await req.json();

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    const company = await Company.findById(companyId);

    if (!company) {
      return NextResponse.json({ message: "Company not found" }, { status: 404 });
    }

    // Check if user is the owner
    if (company.owner.toString() !== user._id.toString()) {
      return NextResponse.json({ message: "Only company owner can add roles" }, { status: 403 });
    }

    // Check if role already exists
    if (company.roles.some(role => role.name === roleName)) {
      return NextResponse.json({ message: "Role already exists" }, { status: 400 });
    }

    company.roles.push({
      name: roleName,
      description: roleDescription,
      seniorityLevel: seniorityLevel
    });

    await company.save();

    // Populate the members with user data before returning
    await company.populate('members.user', 'name email');

    return NextResponse.json({ message: "Role added successfully", company });
  } catch (error) {
    return NextResponse.json(
      { message: "Error adding role", error: error.message },
      { status: 500 }
    );
  }
}

// Update member role
export async function PUT(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { companyId, memberId, newRole } = await req.json();

    await connectDB();

    const user = await User.findOne({ email: session.user.email });
    const company = await Company.findById(companyId);

    if (!company) {
      return NextResponse.json({ message: "Company not found" }, { status: 404 });
    }

    // Check if user is the owner
    if (company.owner.toString() !== user._id.toString()) {
      return NextResponse.json({ message: "Only company owner can update roles" }, { status: 403 });
    }

    // Check if role exists
    if (!company.roles.some(role => role.name === newRole)) {
      return NextResponse.json({ message: "Role does not exist" }, { status: 400 });
    }

    // Find and update member's role
    const memberIndex = company.members.findIndex(member => member.user.toString() === memberId);
    if (memberIndex === -1) {
      return NextResponse.json({ message: "Member not found" }, { status: 404 });
    }

    company.members[memberIndex].role = newRole;
    await company.save();

    // Populate the members with user data before returning
    await company.populate('members.user', 'name email');

    return NextResponse.json({ message: "Role updated successfully", company });
  } catch (error) {
    return NextResponse.json(
      { message: "Error updating role", error: error.message },
      { status: 500 }
    );
  }
}
