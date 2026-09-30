import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';

// Get a specific chat
export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Await params to handle Next.js 15 async params
    const { chatId } = await params;

    await connectDB();
    
    // Ensure ChatNew model is registered
    const ChatNew = (await import('@/models/ChatNew')).default;

    const chat = await ChatNew.findOne({
      _id: chatId,
      participants: session.user.id
    })
    .populate('participants', 'name email')
    .populate('team', 'name')
    .populate('company', 'name');

    if (!chat) {
      return NextResponse.json(
        { message: "Chat not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(chat);
  } catch (error) {
    console.error('Error fetching chat:', error);
    return NextResponse.json(
      { message: "Error fetching chat", error: error.message },
      { status: 500 }
    );
  }
}

// Update chat title
export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { title } = await req.json();
    
    // Await params to handle Next.js 15 async params
    const { chatId } = await params;

    await connectDB();

    const chat = await Chat.findOneAndUpdate(
      { _id: chatId, user: session.user.id },
      { title },
      { new: true }
    );

    if (!chat) {
      return NextResponse.json(
        { message: "Chat not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(chat);
  } catch (error) {
    console.error('Error updating chat:', error);
    return NextResponse.json(
      { message: "Error updating chat", error: error.message },
      { status: 500 }
    );
  }
}

// Delete chat
export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Await params to handle Next.js 15 async params
    const { chatId } = await params;

    await connectDB();

    const chat = await Chat.findOneAndDelete({
      _id: chatId,
      user: session.user.id
    });

    if (!chat) {
      return NextResponse.json(
        { message: "Chat not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Chat deleted successfully" });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return NextResponse.json(
      { message: "Error deleting chat", error: error.message },
      { status: 500 }
    );
  }
}
