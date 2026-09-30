import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Chat from '@/models/Chat';

// Get goals for a chat
export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { chatId } = await params;
    await connectDB();

    const chat = await Chat.findOne({
      _id: chatId,
      user: session.user.id
    }).select('goals');

    if (!chat) {
      return NextResponse.json(
        { message: "Chat not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      goals: chat.goals || []
    });

  } catch (error) {
    console.error('Error fetching goals:', error);
    return NextResponse.json(
      { message: "Error fetching goals", error: error.message },
      { status: 500 }
    );
  }
}

// Add a new goal to a chat
export async function POST(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { title, description } = await req.json();
    const { chatId } = await params;

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { message: "Goal title is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const newGoal = {
      goal_id: new Date().getTime().toString(), // Simple ID generation
      title: title.trim(),
      description: description?.trim() || '',
      status: 'in_progress',
      progress: [],
      created_at: new Date()
    };

    const chat = await Chat.findOneAndUpdate(
      { _id: chatId, user: session.user.id },
      { $push: { goals: newGoal } },
      { new: true }
    );

    if (!chat) {
      return NextResponse.json(
        { message: "Chat not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      goal: newGoal,
      message: "Goal added successfully"
    });

  } catch (error) {
    console.error('Error adding goal:', error);
    return NextResponse.json(
      { message: "Error adding goal", error: error.message },
      { status: 500 }
    );
  }
}
