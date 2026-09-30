import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Chat from '@/models/Chat';

// Update goal progress
export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { chatId, goalId } = await params;
    const { action, note } = await req.json();

    await connectDB();

    if (action === 'add_progress') {
      if (!note || note.trim().length === 0) {
        return NextResponse.json(
          { message: "Progress note is required" },
          { status: 400 }
        );
      }

      const progressEntry = {
        timestamp: new Date(),
        note: note.trim()
      };

      const chat = await Chat.findOneAndUpdate(
        { 
          _id: chatId, 
          user: session.user.id,
          'goals.goal_id': goalId 
        },
        { 
          $push: { 'goals.$.progress': progressEntry }
        },
        { new: true }
      );

      if (!chat) {
        return NextResponse.json(
          { message: "Chat or goal not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        message: "Progress added successfully",
        progress: progressEntry
      });

    } else if (action === 'complete') {
      const chat = await Chat.findOneAndUpdate(
        { 
          _id: chatId, 
          user: session.user.id,
          'goals.goal_id': goalId 
        },
        { 
          $set: { 'goals.$.status': 'completed' }
        },
        { new: true }
      );

      if (!chat) {
        return NextResponse.json(
          { message: "Chat or goal not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        message: "Goal marked as completed"
      });

    } else if (action === 'reopen') {
      const chat = await Chat.findOneAndUpdate(
        { 
          _id: chatId, 
          user: session.user.id,
          'goals.goal_id': goalId 
        },
        { 
          $set: { 'goals.$.status': 'in_progress' }
        },
        { new: true }
      );

      if (!chat) {
        return NextResponse.json(
          { message: "Chat or goal not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        message: "Goal reopened"
      });

    } else {
      return NextResponse.json(
        { message: "Invalid action. Use 'add_progress', 'complete', or 'reopen'" },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error updating goal:', error);
    return NextResponse.json(
      { message: "Error updating goal", error: error.message },
      { status: 500 }
    );
  }
}

// Delete a goal
export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { chatId, goalId } = await params;
    await connectDB();

    const chat = await Chat.findOneAndUpdate(
      { _id: chatId, user: session.user.id },
      { $pull: { goals: { goal_id: goalId } } },
      { new: true }
    );

    if (!chat) {
      return NextResponse.json(
        { message: "Chat not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Goal deleted successfully"
    });

  } catch (error) {
    console.error('Error deleting goal:', error);
    return NextResponse.json(
      { message: "Error deleting goal", error: error.message },
      { status: 500 }
    );
  }
}
