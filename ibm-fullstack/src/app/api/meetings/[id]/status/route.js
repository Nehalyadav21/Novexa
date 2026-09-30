import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Meeting from '@/models/Meeting';

export async function GET(request, { params }) {
  try {
    // Await params in Next.js 15
    const { id: meetingId } = await params;

    await connectDB();
    
    // Find meeting in database
    const meeting = await Meeting.findOne({ meetingId });
    
    if (!meeting) {
      return NextResponse.json({ 
        status: 'not-found',
        error: 'Meeting not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      meetingId: meeting.meetingId,
      status: meeting.status,
      startedAt: meeting.startedAt,
      endedAt: meeting.endedAt,
      participantCount: meeting.participants?.length || 0,
      hasTranscripts: Boolean(meeting.transcripts?.length > 0),
      hasSummary: Boolean(meeting.summary)
    });

  } catch (error) {
    console.error('❌ Error checking meeting status:', error);
    return NextResponse.json({ 
      error: 'Failed to check meeting status', 
      details: String(error)
    }, { status: 500 });
  }
}
