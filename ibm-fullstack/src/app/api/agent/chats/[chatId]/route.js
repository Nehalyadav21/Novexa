import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Chat from '@/models/Chat';

// Get a specific agent chat
export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Await params to handle Next.js 15 async params
    const { chatId } = await params;

    await connectDB();

    const chat = await Chat.findOne({
      _id: chatId,
      user: session.user.id
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Filter out task assignment related messages
    const filteredChat = {
      ...chat.toObject(),
      messages: chat.messages.filter(msg => {
        if (msg.role === 'system') return false;
        if (msg.metadata && msg.metadata.type === 'task_assignment') return false;
        if (msg.content && msg.content.toLowerCase().includes('task assignment request')) return false;
        return true;
      })
    };

    return NextResponse.json(filteredChat);
  } catch (error) {
    console.error('Error fetching agent chat:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update agent chat (e.g., title, personality)
export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = await params;
    const updates = await req.json();

    await connectDB();

    const chat = await Chat.findOneAndUpdate(
      { _id: chatId, user: session.user.id },
      { $set: updates },
      { new: true }
    );

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    return NextResponse.json(chat);
  } catch (error) {
    console.error('Error updating agent chat:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete agent chat
export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = await params;

    await connectDB();

    const chat = await Chat.findOneAndDelete({
      _id: chatId,
      user: session.user.id
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Chat deleted successfully' });
  } catch (error) {
    console.error('Error deleting agent chat:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
