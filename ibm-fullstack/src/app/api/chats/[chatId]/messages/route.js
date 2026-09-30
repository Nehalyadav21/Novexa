import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Notification from '@/models/Notification';
import { createTasksFromChatMessage } from '@/utils/chatTaskAssignment';

// Get messages for a chat
export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = await params;

    await connectDB();
    const ChatNew = (await import('@/models/ChatNew')).default;

    const chat = await ChatNew.findOne({
      _id: chatId,
      participants: session.user.id
    }).populate('messages.sender', 'name email');

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    return NextResponse.json(chat.messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Send a message
export async function POST(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, messageType = 'text' } = await req.json();
    const { chatId } = await params;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    await connectDB();
    const ChatNew = (await import('@/models/ChatNew')).default;

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const chat = await ChatNew.findOne({
      _id: chatId,
      participants: user._id
    }).populate('participants', 'name email');

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Create new message
    const newMessage = {
      sender: user._id,
      content: content.trim(),
      messageType,
      sentAt: new Date(),
      readBy: [{
        user: user._id,
        readAt: new Date()
      }]
    };

    // Add message to chat
    chat.messages.push(newMessage);

    // Update last message
    chat.lastMessage = {
      content: content.trim(),
      sender: user._id,
      sentAt: new Date()
    };

    await chat.save();

    // Create notifications for other participants
    const otherParticipants = chat.participants.filter(p => p._id.toString() !== user._id.toString());
    
    const notifications = otherParticipants.map(participant => ({
      user: participant._id,
      type: 'chat_message',
      title: 'New Message',
      message: `${user.name} sent you a message`,
      actionUrl: '/chats',
      data: { chatId: chat._id }
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    // Populate the sender for response
    await chat.populate('messages.sender', 'name email');
    const messageWithSender = chat.messages[chat.messages.length - 1];

    // ✨ AUTO-TASK ASSIGNMENT: Analyze message for task assignments
    let taskResult = { createdTasks: [], extractedTasks: [], errors: [] };
    try {
      console.log('🔍 Analyzing chat message for task assignments...');
      
      // Get chat participants for task assignment
      const chatParticipants = chat.participants.map(p => ({
        _id: p._id,
        id: p._id,
        name: p.name,
        email: p.email
      }));
      
      console.log('👥 Chat participants:', chatParticipants);
      
      // Extract and create tasks if any are found
      taskResult = await createTasksFromChatMessage(
        chatId,
        content.trim(),
        {
          _id: user._id,
          id: user._id,
          name: user.name,
          email: user.email
        },
        chatParticipants,
        session  // Pass the session for authentication
      );
      
      console.log('📊 Task assignment result:', {
        extracted: taskResult.totalExtracted,
        created: taskResult.totalCreated,
        errors: taskResult.errors.length
      });
      
      if (taskResult.createdTasks.length > 0) {
        console.log(`✅ Created ${taskResult.createdTasks.length} task(s) from chat message`);
        
        // Create notifications ONLY for successfully created tasks
        for (const task of taskResult.createdTasks) {
          if (task.assignedTo && task.assignedTo._id && task.assignedTo._id.toString() !== user._id.toString()) {
            const taskNotification = new Notification({
              user: task.assignedTo._id,
              type: 'task_assigned',
              title: 'New Task Assigned',
              message: `${user.name} assigned you a task: ${task.title}`,
              actionUrl: '/tasks',
              data: { taskId: task.id, chatId: chatId }
            });
            await taskNotification.save();
            console.log('📬 Task assignment notification created for:', task.assignedTo.name);
          }
        }
      }
      
      // Log errors for debugging (but don't fail the message)
      if (taskResult.errors.length > 0) {
        console.log('⚠️ Task assignment errors:', taskResult.errors);
      }
      
    } catch (taskError) {
      console.error('❌ Error in auto-task assignment:', taskError);
      // Don't fail the message sending if task extraction fails
    }

    return NextResponse.json({
      ...messageWithSender.toObject(),
      taskResult: taskResult
    }, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
