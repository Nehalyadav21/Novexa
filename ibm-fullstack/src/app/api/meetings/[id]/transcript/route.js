import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Meeting from '@/models/Meeting';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

// POST /api/meetings/[id]/transcript - Add transcript to meeting
export async function POST(request, { params }) {
  try {
    // Allow both authenticated and unauthenticated access for development
    let userId = null;
    let userName = 'Anonymous Speaker';
    
    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        userId = session.user.id;
        userName = session.user.name;
      }
    } catch (authError) {
      console.log('Authentication not available, proceeding with anonymous access');
    }

    await connectDB();
    
    // Await params in Next.js 15
    const { id } = await params;
    const { text, userId: providedUserId, userName: providedUserName, confidence } = await request.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Use provided user info if available, otherwise use session info
    let finalUserId = providedUserId || userId;
    const finalUserName = providedUserName || userName;

    // Validate userId - if it's not a valid ObjectId, set to null for anonymous user
    if (finalUserId) {
      // Check if it's a valid ObjectId format (24 hex characters)
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(finalUserId);
      if (!isValidObjectId) {
        console.log(`Invalid userId format: ${finalUserId}, treating as anonymous user`);
        finalUserId = null;
      } else {
        // Convert string to ObjectId
        finalUserId = new mongoose.Types.ObjectId(finalUserId);
      }
    }

    const meeting = await Meeting.findOne({ meetingId: id });

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Add transcript directly to avoid validation issues
    meeting.transcripts.push({
      userId: finalUserId, // Will be null for anonymous or a valid ObjectId for authenticated users
      userName: finalUserName,
      text: text.trim(),
      confidence: confidence || 0,
      timestamp: new Date()
    });
    await meeting.save();

    return NextResponse.json({
      success: true,
      transcript: {
        userId: finalUserId,
        userName: finalUserName,
        text: text.trim(),
        confidence: confidence || 0,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Add transcript error:', error);
    return NextResponse.json({ error: 'Failed to add transcript' }, { status: 500 });
  }
}
