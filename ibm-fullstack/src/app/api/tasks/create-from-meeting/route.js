import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Task from '@/models/Task';
import User from '@/models/User';
import Notification from '@/models/Notification';
import { getSocket } from '@/lib/socket';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { meetingId, tasks } = await req.json();

    if (!meetingId || !tasks || !Array.isArray(tasks)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    console.log('📥 Received meeting task creation request:', { meetingId, tasksCount: tasks.length });

    await connectDB();

    const createdTasks = [];

    // Process each extracted task
    for (const taskData of tasks) {
      try {
        console.log('💾 Creating meeting task:', taskData);

        // Find the assigned user by name if not found by ID
        let assignedToId = taskData.assignedTo;
        if (typeof assignedToId === 'string' && !assignedToId.match(/^[0-9a-fA-F]{24}$/)) {
          // Try to find user by name with better matching for Indian/international names
          const User = (await import('@/models/User')).default;
          
          // First try exact regex match
          let user = await User.findOne({ 
            name: { $regex: new RegExp(taskData.assignedToName || taskData.assignedTo, 'i') },
            company: session.user.company 
          });
          
          // If no exact match, try fuzzy matching
          if (!user) {
            const allUsers = await User.find({ company: session.user.company });
            const searchName = taskData.assignedToName || taskData.assignedTo;
            
            user = allUsers.find(u => {
              if (!u.name || !searchName) return false;
              
              // Split names and check for partial matches
              const userNameParts = u.name.toLowerCase().split(/\s+/);
              const searchNameParts = searchName.toLowerCase().split(/\s+/);
              
              // Check if any search part matches any user name part
              return searchNameParts.some(searchPart => 
                searchPart.length >= 3 && userNameParts.some(userPart => 
                  userPart.includes(searchPart) || searchPart.includes(userPart)
                )
              );
            });
          }
          
          if (user) {
            assignedToId = user._id;
          } else {
            console.log(`❌ User not found for name: ${taskData.assignedToName || taskData.assignedTo}, assigning to current user`);
            // If user not found, assign to current user
            assignedToId = session.user.id;
          }
        }

        // Seniority validation for meeting-generated tasks
        if (assignedToId && assignedToId !== session.user.id) {
          const User = (await import('@/models/User')).default;
          const Company = (await import('@/models/Company')).default;

          const assigneeUser = await User.findById(assignedToId);
          const senderUser = await User.findById(session.user.id);

          if (assigneeUser && senderUser) {
            const company = await Company.findById(session.user.company);
            
            if (company) {
              const senderMember = company.members.find(m => m.user.toString() === session.user.id);
              const assigneeMember = company.members.find(m => m.user.toString() === assignedToId.toString());

              if (senderMember && assigneeMember) {
                const isOwner = company.owner.toString() === session.user.id;
                
                if (!isOwner) {
                  const senderRole = company.roles.find(r => r.name === senderMember.role);
                  const assigneeRole = company.roles.find(r => r.name === assigneeMember.role);

                  if (senderRole && assigneeRole) {
                    const senderSeniority = senderRole.name === 'Owner' ? 1 : (senderRole.seniorityLevel || 10);
                    const assigneeSeniority = assigneeRole.name === 'Owner' ? 1 : (assigneeRole.seniorityLevel || 10);

                    if (senderSeniority >= assigneeSeniority) {
                      console.log(`❌ Meeting task skipped due to seniority: ${senderSeniority} cannot assign to ${assigneeSeniority}`);
                      continue; // Skip this task
                    }
                  }
                }
              }
            }
          }
        }

        const task = new Task({
          title: taskData.title,
          description: taskData.description,
          assignedTo: assignedToId,
          assignedBy: session.user.id,
          company: session.user.company,
          priority: taskData.priority || 'medium',
          status: taskData.status || 'pending',
          dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
          source: 'meeting_transcript',
          sourceData: {
            meetingId: meetingId,
            context: taskData.context,
            confidence: taskData.confidence,
            extractedAt: taskData.extractedAt
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });

        const savedTask = await task.save();
        console.log('✅ Meeting task saved:', savedTask._id);

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
        console.error('❌ Error creating individual meeting task:', taskError);
        // Continue with other tasks even if one fails
      }
    }

    console.log('🎉 Meeting tasks creation completed. Created:', createdTasks.length);

    // Create notifications for assigned users
    console.log('📬 Creating notifications for meeting task assignments...');
    try {
      const io = getSocket();
      
      for (const task of createdTasks) {
        try {
          if (task.assignedTo && task.assignedTo._id && task.assignedTo._id.toString() !== session.user.id.toString()) {
            const taskNotification = new Notification({
              user: task.assignedTo._id,
              type: 'task_assigned',
              title: 'New Task Assigned from Meeting',
              message: `${session.user.name} assigned you a task from meeting transcript: ${task.title}`,
              actionUrl: '/tasks',
              data: { 
                taskId: task.id, 
                meetingId: meetingId,
                source: 'meeting_transcript'
              }
            });
            await taskNotification.save();
            console.log('📬 Meeting task notification created for:', task.assignedTo.name);
            
            // Send real-time notification via socket
            if (io) {
              io.to(`user-${task.assignedTo._id}`).emit('taskNotification', {
                type: 'task_assigned',
                title: 'New Task Assigned from Meeting',
                message: `${session.user.name} assigned you a task from meeting transcript: ${task.title}`,
                taskId: task.id,
                meetingId: meetingId
              });
              console.log('🔔 Real-time notification sent to:', task.assignedTo.name);
            }
          }
        } catch (notificationError) {
          console.error('❌ Error creating notification for task:', task.id, notificationError);
          // Continue with other notifications
        }
      }
    } catch (socketError) {
      console.warn('⚠️ Socket notifications failed:', socketError);
      // Don't fail the entire operation if socket notifications fail
    }

    return NextResponse.json({
      success: true,
      message: `Created ${createdTasks.length} task(s) from meeting transcript`,
      tasks: createdTasks
    });

  } catch (error) {
    console.error('❌ Error in meeting task creation API:', error);
    return NextResponse.json(
      { error: 'Failed to create tasks from meeting transcript' },
      { status: 500 }
    );
  }
}
