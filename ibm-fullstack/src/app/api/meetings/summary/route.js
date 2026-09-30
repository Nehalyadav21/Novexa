import { NextResponse } from 'next/server';
import { callWatsonx } from '@/lib/watsonx';
import connectDB from '@/lib/mongodb';
import Meeting from '@/models/Meeting';

export async function POST(request) {
  try {
    const { meetingId, transcripts, meetingTitle } = await request.json();

    if (!transcripts || transcripts.length === 0) {
      return NextResponse.json({ error: 'No transcripts provided' }, { status: 400 });
    }

    console.log('🤖 Generating meeting summary for:', meetingId);

    // Organize transcripts by speaker and time
    const organizedTranscripts = transcripts
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(t => {
        const time = new Date(t.timestamp).toLocaleTimeString();
        return `[${time}] ${t.userName}: ${t.text}`;
      })
      .join('\n');

    // Create a comprehensive prompt for the AI
    const summaryPrompt = `Please analyze the following meeting transcript and provide a comprehensive summary in a professional format.

MEETING TRANSCRIPT:
${organizedTranscripts}

Please provide a well-structured summary with the following sections:

**📋 MEETING OVERVIEW**
Brief summary of the main topics and purpose of the meeting.

**🎯 KEY DISCUSSION POINTS**
- List the main topics discussed
- Important decisions made
- Key insights shared

**✅ ACTION ITEMS & NEXT STEPS**
- Specific tasks assigned
- Deadlines mentioned
- Follow-up actions required

**👥 PARTICIPANT CONTRIBUTIONS**
- Key speakers and their main contributions
- Different perspectives shared

**⏰ MEETING DETAILS**
- Duration and key timing information
- Important milestones during the meeting

Format the response in clear, professional language suitable for meeting minutes. Use bullet points and clear headings for easy reading.`;

    // Call WatsonX for summary generation
    const body = {
      messages: [
        {
          role: 'user',
          content: summaryPrompt
        }
      ],
      project_id: process.env.WATSONX_PROJECT_ID,
      model_id: process.env.WATSONX_MODEL_ID || 'ibm/granite-3-3-8b-instruct',
      temperature: 0.3, // Lower temperature for more focused summaries
      max_tokens: 1200, // Increased for comprehensive summaries
    };

    console.log('📤 Calling WatsonX for meeting summary...');
    const data = await callWatsonx('/ml/v1/text/chat?version=2023-05-29', body);

    // Extract the response from WatsonX format
    const summary = data?.choices?.[0]?.message?.content || 
                   data?.results?.[0]?.generated_text || 
                   data?.output || 
                   'Could not generate meeting summary.';

    console.log('✅ Meeting summary generated successfully');

    // Save to database if meetingId is provided
    if (meetingId) {
      await connectDB();
      
      try {
        // Find or create meeting record
        let meeting = await Meeting.findOne({ meetingId });
        
        if (!meeting) {
          meeting = new Meeting({
            meetingId,
            title: meetingTitle || `Meeting ${meetingId}`,
            transcripts,
            summary,
            participants: [...new Set(transcripts.map(t => t.userName))],
            startTime: new Date(Math.min(...transcripts.map(t => t.timestamp))),
            endTime: new Date(Math.max(...transcripts.map(t => t.timestamp))),
            createdAt: new Date()
          });
        } else {
          // Update existing meeting
          meeting.transcripts = transcripts;
          meeting.summary = summary;
          meeting.participants = [...new Set(transcripts.map(t => t.userName))];
          meeting.endTime = new Date(Math.max(...transcripts.map(t => t.timestamp)));
          meeting.updatedAt = new Date();
        }
        
        await meeting.save();
        console.log('💾 Meeting summary saved to database');
        
      } catch (dbError) {
        console.error('Database save error:', dbError);
        // Continue even if DB save fails
      }
    }

    return NextResponse.json({
      success: true,
      summary,
      transcriptCount: transcripts.length,
      participants: [...new Set(transcripts.map(t => t.userName))],
      generatedAt: new Date().toISOString(),
      meetingId
    });

  } catch (error) {
    console.error('❌ Meeting summary generation error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate meeting summary', 
      details: String(error)
    }, { status: 500 });
  }
}
