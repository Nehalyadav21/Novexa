import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Meeting from '@/models/Meeting';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    
    // Allow both authenticated and unauthenticated access for development
    let session = null;
    try {
      session = await getServerSession(authOptions);
    } catch (authError) {
      console.log('Authentication not available, proceeding with anonymous access');
    }

    await dbConnect();

    // Find the meeting
    const meeting = await Meeting.findOne({ meetingId: id });
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Update meeting status to ended
    meeting.status = 'ended';
    meeting.endedAt = new Date();

    // Check if there are transcripts to summarize
    if (meeting.transcripts && meeting.transcripts.length > 0) {
      try {
        // Generate summary using WatsonX
        const transcriptText = meeting.transcripts
          .map(t => `${t.userName}: ${t.text}`)
          .join('\n');

        const watsonResponse = await fetch(process.env.WATSONX_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.WATSONX_API_KEY}`
          },
          body: JSON.stringify({
            model_id: 'meta-llama/llama-3-1-70b-instruct',
            input: `Please provide a concise summary of this meeting transcript, including key discussion points, decisions made, and action items:\n\n${transcriptText}`,
            parameters: {
              max_new_tokens: 500,
              temperature: 0.3,
              top_p: 0.9
            },
            project_id: process.env.WATSONX_PROJECT_ID
          })
        });

        if (watsonResponse.ok) {
          const watsonData = await watsonResponse.json();
          meeting.summary = watsonData.results?.[0]?.generated_text || 'Summary generation failed';
        } else {
          console.error('WatsonX API error:', await watsonResponse.text());
          meeting.summary = 'Meeting completed. Summary generation unavailable.';
        }
      } catch (error) {
        console.error('Error generating summary:', error);
        meeting.summary = 'Meeting completed. Summary generation failed.';
      }
    } else {
      meeting.summary = 'Meeting completed. No transcript available for summary.';
    }

    await meeting.save();

    console.log(`Meeting ${id} ended with summary: ${meeting.summary}`);

    return NextResponse.json({ 
      message: 'Meeting ended successfully',
      summary: meeting.summary
    });

  } catch (error) {
    console.error('Error ending meeting:', error);
    return NextResponse.json(
      { error: 'Failed to end meeting' },
      { status: 500 }
    );
  }
}
