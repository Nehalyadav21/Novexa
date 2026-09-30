import { NextResponse } from 'next/server';
import { callWatsonx } from '@/lib/watsonx';
import connectDB from '@/lib/mongodb';
import Meeting from '@/models/Meeting';

export async function POST(request, { params }) {
  try {
    // Await params in Next.js 15
    const { id: meetingId } = await params;
    
    console.log('🤖 Generating meeting summary for meeting ID:', meetingId);

    // Connect to database and get meeting data
    await connectDB();
    
    let meeting;
    
    // Try to find by _id first (if it's a valid ObjectId), otherwise try by meetingId
    try {
      // Check if the ID is a valid MongoDB ObjectId (24 characters hex)
      if (meetingId.match(/^[0-9a-fA-F]{24}$/)) {
        meeting = await Meeting.findById(meetingId);
      } else {
        // If not a valid ObjectId, search by meetingId field
        meeting = await Meeting.findOne({ meetingId });
      }
    } catch (error) {
      // If findById fails, try findOne with meetingId
      meeting = await Meeting.findOne({ meetingId });
    }
    
    if (!meeting) {
      return NextResponse.json({ 
        error: 'Meeting not found',
        details: `No meeting found with ID: ${meetingId}`
      }, { status: 404 });
    }

    if (!meeting.transcripts || meeting.transcripts.length === 0) {
      return NextResponse.json({ 
        error: 'No transcripts available', 
        details: 'This meeting has no transcripts to summarize'
      }, { status: 400 });
    }

    const transcripts = meeting.transcripts;
    const meetingTitle = meeting.title;

    console.log('🤖 Generating meeting summary for:', meetingId);

    // Organize transcripts by speaker and time
    const organizedTranscripts = transcripts
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .map(t => {
        const time = new Date(t.timestamp).toLocaleTimeString();
        return `[${time}] ${t.userName || t.speaker}: ${t.text}`;
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
      temperature: 0.3,
      max_tokens: 1200,
    };

    console.log('📤 Calling WatsonX for meeting summary...');
    const data = await callWatsonx('/ml/v1/text/chat?version=2023-05-29', body);

    // Extract the response from WatsonX format
    const summary = data?.choices?.[0]?.message?.content || 
                   data?.results?.[0]?.generated_text || 
                   data?.output || 
                   'Could not generate meeting summary.';

    console.log('✅ Meeting summary generated successfully');

    // Update meeting with summary
    try {
      meeting.summary = summary;
      meeting.summaryGeneratedAt = new Date();
      await meeting.save();
      console.log('💾 Meeting summary saved to database');
      
    } catch (dbError) {
      console.error('Database save error:', dbError);
      // Continue even if DB save fails
    }

    return NextResponse.json({
      success: true,
      summary,
      summaryGeneratedAt: meeting.summaryGeneratedAt,
      transcriptCount: transcripts.length,
      participants: [...new Set(transcripts.map(t => t.userName || t.speaker))],
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
