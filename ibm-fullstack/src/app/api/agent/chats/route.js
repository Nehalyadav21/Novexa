import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Chat from '@/models/Chat';

// Get all agent chats for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const chats = await Chat.find({
      user: session.user.id
    })
    .select('_id title personality createdAt updatedAt messages')
    .sort({ updatedAt: -1 });

    // Format chats for display, excluding task-related system messages
    const formattedChats = chats.map(chat => {
      // Filter out task assignment related messages
      const filteredMessages = chat.messages.filter(msg => {
        if (msg.role === 'system') return false;
        if (msg.metadata && msg.metadata.type === 'task_assignment') return false;
        if (msg.content && msg.content.toLowerCase().includes('task assignment request')) return false;
        return true;
      });

      return {
        _id: chat._id,
        title: chat.title,
        personality: chat.personality,
        lastMessage: filteredMessages.length > 0 ? filteredMessages[filteredMessages.length - 1] : null,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        messageCount: filteredMessages.length
      };
    });

    return NextResponse.json(formattedChats);
  } catch (error) {
    console.error('Error fetching agent chats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create a new agent chat
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, personality = 'friendly' } = await req.json();

    await connectDB();

    // Create new agent chat
    const newChat = await Chat.create({
      user: session.user.id,
      title: title || 'New Chat',
      personality: personality,
      messages: []
    });

    const formattedChat = {
      _id: newChat._id,
      title: newChat.title,
      personality: newChat.personality,
      lastMessage: null,
      createdAt: newChat.createdAt,
      updatedAt: newChat.updatedAt,
      messageCount: 0
    };

    return NextResponse.json(formattedChat, { status: 201 });
  } catch (error) {
    console.error('Error creating agent chat:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
