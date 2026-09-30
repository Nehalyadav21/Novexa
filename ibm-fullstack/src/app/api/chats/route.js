import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Company from '@/models/Company';
import Team from '@/models/Team';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    // Ensure ChatNew and Team models are registered
    const ChatNew = (await import('@/models/ChatNew')).default;
    const Team = (await import('@/models/Team')).default;

    const user = await User.findById(session.user.id);
    if (!user || !user.company) {
      return NextResponse.json({ error: 'User not found or not in a company' }, { status: 404 });
    }

    // Check if company chat exists, create if not
    let companyChat = await ChatNew.findOne({
      type: 'company',
      company: user.company
    });

    if (!companyChat) {
      // Get all company members
      const company = await Company.findById(user.company).populate('members.user', '_id');
      const companyMemberIds = company.members.map(m => m.user._id);

      // Create company chat with all members
      companyChat = new ChatNew({
        type: 'company',
        company: user.company,
        participants: companyMemberIds,
        messages: [],
        name: `${company.name} - Company Chat`
      });

      await companyChat.save();
    }

    // Get all chats where user is a participant
    const chats = await ChatNew.find({
      participants: user._id
    })
    .populate('participants', 'name email')
    .populate('lastMessage.sender', 'name')
    .populate('team', 'name')
    .populate('company', 'name')
    .sort({ 'lastMessage.sentAt': -1, updatedAt: -1 });

    // Format chats for display
    const formattedChats = chats.map(chat => {
      let chatName = chat.name;
      
      if (chat.type === 'direct') {
        // For direct chats, show the other person's name
        const otherParticipant = chat.participants.find(p => p._id.toString() !== user._id.toString());
        chatName = otherParticipant ? otherParticipant.name : 'Unknown User';
      }

      return {
        _id: chat._id,
        name: chatName,
        type: chat.type,
        participants: chat.participants,
        lastMessage: chat.lastMessage,
        team: chat.team,
        company: chat.company,
        updatedAt: chat.updatedAt
      };
    });

    return NextResponse.json(formattedChats);
  } catch (error) {
    console.error('Error fetching chats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { type, participantId } = requestBody;

    await connectDB();
    
    // Ensure ChatNew and Team models are registered
    const ChatNew = (await import('@/models/ChatNew')).default;
    const Team = (await import('@/models/Team')).default;

    const user = await User.findById(session.user.id);
    if (!user || !user.company) {
      return NextResponse.json({ error: 'User not found or not in a company' }, { status: 404 });
    }

    if (type === 'direct') {
      // Check if direct chat already exists
      const existingChat = await ChatNew.findOne({
        type: 'direct',
        participants: { $all: [user._id, participantId], $size: 2 }
      });

      if (existingChat) {
        return NextResponse.json(existingChat);
      }

      // Create new direct chat
      const otherUser = await User.findById(participantId);
      if (!otherUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const newChat = new ChatNew({
        type: 'direct',
        company: user.company,
        participants: [user._id, participantId],
        messages: []
      });

      await newChat.save();
      await newChat.populate('participants', 'name email');

      // Format for return
      const formattedChat = {
        ...newChat.toObject(),
        name: otherUser.name
      };

      return NextResponse.json(formattedChat, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid chat type' }, { status: 400 });
  } catch (error) {
    console.error('Error creating chat:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
