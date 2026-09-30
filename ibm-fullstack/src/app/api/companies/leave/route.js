import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Company from '@/models/Company';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    // Get user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // Check if user has a company
    if (!user.company) {
      return NextResponse.json(
        { message: "You are not a member of any company" },
        { status: 400 }
      );
    }

    // Get company
    const company = await Company.findById(user.company);
    if (!company) {
      return NextResponse.json(
        { message: "Company not found" },
        { status: 404 }
      );
    }

    // Check if user is the owner
    if (company.owner.toString() === user._id.toString()) {
      return NextResponse.json(
        { message: "Company owner cannot leave. Transfer ownership first or delete the company." },
        { status: 400 }
      );
    }

    // Remove user from company members
    company.members = company.members.filter(
      member => member.user.toString() !== user._id.toString()
    );
    await company.save();

    // Remove company from user
    user.company = null;
    await user.save();

    return NextResponse.json({ message: "Successfully left company" });

  } catch (error) {
    console.error('Error leaving company:', error);
    return NextResponse.json(
      { message: "Error leaving company", error: error.message },
      { status: 500 }
    );
  }
}
