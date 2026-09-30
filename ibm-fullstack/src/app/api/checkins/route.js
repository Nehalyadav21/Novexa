import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import CheckIn from '@/models/CheckIn';
import User from '@/models/User';
import Company from '@/models/Company';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // Format: YYYY-MM
    const userId = searchParams.get('userId'); // Optional: to view specific user's check-ins

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Determine which user's check-ins to fetch
    const targetUserId = userId || session.user.id;
    
    // Check if requesting user can view the target user's check-ins
    const company = await Company.findById(user.company);
    const isOwner = company && company.owner.toString() === session.user.id;
    
    if (targetUserId !== session.user.id && !isOwner) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Build date filter
    let dateFilter = {};
    if (month) {
      const startDate = new Date(`${month}-01`);
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
      dateFilter = {
        date: {
          $gte: startDate,
          $lte: endDate
        }
      };
    }

    const checkIns = await CheckIn.find({
      user: targetUserId,
      company: user.company,
      ...dateFilter
    })
    .populate('user', 'name email')
    .sort({ date: -1 });

    return NextResponse.json({
      success: true,
      checkIns,
      month: month || new Date().toISOString().substring(0, 7)
    });

  } catch (error) {
    console.error('Get check-ins error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch check-ins',
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

    const { captchaVerified } = await request.json();

    if (!captchaVerified) {
      return NextResponse.json({ error: 'CAPTCHA verification required' }, { status: 400 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user || !user.company) {
      return NextResponse.json({ error: 'User or company not found' }, { status: 404 });
    }

    // Check if user is owner (owners don't need to check in)
    const company = await Company.findById(user.company);
    const isOwner = company && company.owner.toString() === session.user.id;
    

    if (isOwner) {
      return NextResponse.json({ 
        error: 'Owners do not need to check in',
        isOwner: true
      }, { status: 400 });
    }

    // Check if already checked in today
    const today = new Date();
    // Create a proper start and end of day in local timezone
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const existingCheckIn = await CheckIn.findOne({
      user: session.user.id,
      company: user.company,
      date: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    });

    if (existingCheckIn) {
      return NextResponse.json({ 
        error: 'Already checked in today',
        checkIn: existingCheckIn
      }, { status: 400 });
    }

    // Create new check-in using the exact same date logic
    const checkIn = new CheckIn({
      user: session.user.id,
      company: user.company,
      date: startOfDay, // Use the same startOfDay for consistency
      checkInTime: new Date(),
      status: 'present'
    });

    await checkIn.save();

    const populatedCheckIn = await CheckIn.findById(checkIn._id)
      .populate('user', 'name email');

    return NextResponse.json({
      success: true,
      checkIn: populatedCheckIn,
      message: 'Check-in successful'
    });

  } catch (error) {
    console.error('Check-in error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.json({ 
      error: 'Failed to check in',
      details: String(error)
    }, { status: 500 });
  }
}
