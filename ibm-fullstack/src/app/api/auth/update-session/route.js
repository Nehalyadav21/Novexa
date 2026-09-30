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

    // Get user with company data
    const user = await User.findOne({ email: session.user.email }).populate('company');
    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // Check if user has a company
    if (!user.company) {
      return NextResponse.json(
        { message: "User has no company" },
        { status: 400 }
      );
    }

    // Return the updated user data
    return NextResponse.json({
      message: "Session update data ready",
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        company: user.company._id.toString()
      },
      company: {
        id: user.company._id.toString(),
        name: user.company.name
      }
    });

  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json(
      { message: "Error updating session", error: error.message },
      { status: 500 }
    );
  }
}
