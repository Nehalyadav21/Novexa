import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    // Get fresh user data
    const user = await User.findOne({ email: session.user.email })
      .populate('company');

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        company: user.company?._id.toString(),
      }
    });

  } catch (error) {
    console.error('Error refreshing session:', error);
    return NextResponse.json(
      { message: "Error refreshing session", error: error.message },
      { status: 500 }
    );
  }
}
