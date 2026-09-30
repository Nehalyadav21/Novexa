import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Task from '@/models/Task';
import User from '@/models/User';

export async function PUT(request, { params }) {
  try {
    const { id: taskId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { status, proofDescription, proofFileUrl, proofFileName, proofFileType } = await request.json();

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check if user can update this task
    const canUpdate = task.assignedTo.toString() === session.user.id || 
                     task.assignedBy.toString() === session.user.id;

    if (!canUpdate) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Update task status
    if (status) {
      task.status = status;
      
      if (status === 'completed') {
        task.completedAt = new Date();
        
        // Require proof of work for completion
        if (!proofDescription) {
          return NextResponse.json({ 
            error: 'Proof of work description is required to mark task as completed' 
          }, { status: 400 });
        }

        task.proof = {
          description: proofDescription,
          fileUrl: proofFileUrl || '',
          fileName: proofFileName || '',
          fileType: proofFileType || '',
          submittedAt: new Date()
        };
      }
    }

    await task.save();

    const updatedTask = await Task.findById(taskId)
      .populate('assignedBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('company', 'name');

    return NextResponse.json({
      success: true,
      task: updatedTask,
      message: 'Task updated successfully'
    });

  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json({ 
      error: 'Failed to update task',
      details: String(error)
    }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id: taskId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const task = await Task.findById(taskId);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Only the person who assigned the task can delete it
    if (task.assignedBy.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    await Task.findByIdAndDelete(taskId);

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully'
    });

  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete task',
      details: String(error)
    }, { status: 500 });
  }
}
