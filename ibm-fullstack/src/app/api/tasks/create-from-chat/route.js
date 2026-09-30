import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Task from '@/models/Task';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId, tasks } = await req.json();

    if (!chatId || !tasks || !Array.isArray(tasks)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    console.log('📥 Received chat task creation request:', { chatId, tasksCount: tasks.length });

    await connectDB();

    const createdTasks = [];

    // Process each extracted task
    for (const taskData of tasks) {
      try {
        console.log('💾 Creating chat task:', taskData);

        const task = new Task({
          title: taskData.title,
          description: taskData.description,
          assignedTo: taskData.assignedTo,
          assignedBy: taskData.assignedBy || session.user.id,
          company: session.user.company,
          priority: taskData.priority || 'medium',
          status: taskData.status || 'pending',
          dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
          source: 'chat_message',
          sourceData: {
            chatId: chatId,
            context: taskData.context,
            confidence: taskData.confidence,
            extractedAt: taskData.extractedAt
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });

        const savedTask = await task.save();
        console.log('✅ Chat task saved:', savedTask._id);

        // Populate the assigned user information
        await savedTask.populate('assignedTo', 'name email');
        await savedTask.populate('assignedBy', 'name email');

        createdTasks.push({
          id: savedTask._id,
          title: savedTask.title,
          description: savedTask.description,
          assignedTo: savedTask.assignedTo,
          assignedBy: savedTask.assignedBy,
          priority: savedTask.priority,
          status: savedTask.status,
          dueDate: savedTask.dueDate,
          source: savedTask.source,
          createdAt: savedTask.createdAt
        });

      } catch (taskError) {
        console.error('❌ Error creating individual chat task:', taskError);
        // Continue with other tasks even if one fails
      }
    }

    console.log('🎉 Chat tasks creation completed. Created:', createdTasks.length);

    return NextResponse.json({
      success: true,
      message: `Created ${createdTasks.length} task(s) from chat message`,
      tasks: createdTasks
    });

  } catch (error) {
    console.error('❌ Error in chat task creation API:', error);
    return NextResponse.json(
      { error: 'Failed to create tasks from chat message' },
      { status: 500 }
    );
  }
}
