import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Task from '@/models/Task';
import User from '@/models/User';
import Company from '@/models/Company';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assignedTo');
    const assignedBy = searchParams.get('assignedBy');

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user || !user.company) {
      return NextResponse.json({ error: 'User or company not found' }, { status: 404 });
    }

    // Get company to check if user is owner
    const company = await Company.findById(user.company);
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const isOwner = company.owner.toString() === session.user.id;

    // Build query filters
    let query = { company: user.company };
    
    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }

    // Filter by assigned user
    if (assignedTo) {
      query.assignedTo = assignedTo;
    } else if (!isOwner) {
      // For non-owners, show only tasks assigned to them
      query.assignedTo = session.user.id;
    }
    // For owners, show all tasks in the company (no assignedTo filter)

    // Filter by who assigned the task
    if (assignedBy) {
      query.assignedBy = assignedBy;
    }

    const tasks = await Task.find(query)
      .populate('assignedBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('company', 'name')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      tasks
    });

  } catch (error) {
    console.error('Get tasks error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch tasks',
      details: String(error)
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description, assignedTo, deadline } = await request.json();

    if (!title || !description || !assignedTo || !deadline) {
      return NextResponse.json({ 
        error: 'Missing required fields: title, description, assignedTo, deadline' 
      }, { status: 400 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user || !user.company) {
      return NextResponse.json({ error: 'User or company not found' }, { status: 404 });
    }

    const company = await Company.findById(user.company);
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Check if user can assign tasks
    const isOwner = company.owner.toString() === session.user.id;
    const assignerMember = company.members.find(m => m.user.toString() === session.user.id);
    const assigneeMember = company.members.find(m => m.user.toString() === assignedTo);

    if (!assignerMember || !assigneeMember) {
      return NextResponse.json({ error: 'User not found in company' }, { status: 404 });
    }

    // Check seniority levels - only users with higher seniority can assign tasks to users with lower seniority
    if (!isOwner) {
      const assignerRole = company.roles.find(r => r.name === assignerMember.role);
      const assigneeRole = company.roles.find(r => r.name === assigneeMember.role);

      if (!assignerRole || !assigneeRole) {
        return NextResponse.json({ error: 'Role not found' }, { status: 404 });
      }

      // Set default seniority levels - Owner should have level 1 (highest)
      const assignerSeniority = assignerRole.name === 'Owner' ? 1 : (assignerRole.seniorityLevel || 10);
      const assigneeSeniority = assigneeRole.name === 'Owner' ? 1 : (assigneeRole.seniorityLevel || 10);

      // Check if assigner has higher seniority level (lower number means higher seniority)
      if (assignerSeniority >= assigneeSeniority) {
        return NextResponse.json({ 
          error: `You can only assign tasks to employees with lower seniority levels. Your level: ${assignerSeniority}, Their level: ${assigneeSeniority}` 
        }, { status: 403 });
      }
    } else {
      // Even owners cannot assign tasks to other owners or themselves
      if (assigneeMember.role === 'Owner' && assignedTo !== session.user.id) {
        return NextResponse.json({ 
          error: 'You cannot assign tasks to other owners' 
        }, { status: 403 });
      }
    }

    // Create new task
    const task = new Task({
      title,
      description,
      assignedBy: session.user.id,
      assignedTo,
      assignedToRole: assigneeMember.role,
      company: user.company,
      deadline: new Date(deadline),
      status: 'pending'
    });

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('assignedBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('company', 'name');

    return NextResponse.json({
      success: true,
      task: populatedTask,
      message: 'Task created successfully'
    });

  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json({ 
      error: 'Failed to create task',
      details: String(error)
    }, { status: 500 });
  }
}
