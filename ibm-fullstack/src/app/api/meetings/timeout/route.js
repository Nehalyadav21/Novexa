import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Meeting from '@/models/Meeting';

export async function POST() {
  try {
    await connectDB();

    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // Find scheduled meetings that should have started more than 5 minutes ago
    // but no one has joined (status is still 'scheduled')
    const timedOutMeetings = await Meeting.find({
      status: 'scheduled',
      scheduledAt: { $lt: fiveMinutesAgo }
    });

    if (timedOutMeetings.length > 0) {
      // Update these meetings to 'ended' status
      await Meeting.updateMany(
        {
          status: 'scheduled',
          scheduledAt: { $lt: fiveMinutesAgo }
        },
        {
          $set: {
            status: 'ended',
            endedAt: now
          }
        }
      );

      console.log(`Auto-ended ${timedOutMeetings.length} meetings due to timeout`);
    }

    return NextResponse.json({
      message: `Processed ${timedOutMeetings.length} timed-out meetings`,
      processedCount: timedOutMeetings.length
    });

  } catch (error) {
    console.error('Error processing meeting timeouts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// This endpoint can be called periodically by a cron job or front-end timer
export async function GET() {
  return POST(); // Same logic for GET requests
}
