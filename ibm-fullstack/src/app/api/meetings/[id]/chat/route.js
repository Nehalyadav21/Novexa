import { NextResponse } from 'next/server';
import { callWatsonx } from '@/lib/watsonx';
import connectDB from '@/lib/mongodb';
import Meeting from '@/models/Meeting';

export async function POST(request, { params }) {
  try {
    // Await params in Next.js 15
    const { id: meetingId } = await params;
    const { question } = await request.json();

    if (!question || question.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Question is required',
        details: 'Please provide a question to ask about the meeting'
      }, { status: 400 });
    }

    console.log(`💬 AI chat question for meeting ${meetingId}: ${question}`);

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
        details: 'No meeting found with the provided ID'
      }, { status: 404 });
    }

    const transcripts = meeting.transcripts || [];

    if (transcripts.length === 0) {
      return NextResponse.json({ 
        error: 'No transcripts available',
        details: 'This meeting has no transcripts to search through'
      }, { status: 400 });
    }

    // Organize transcripts by speaker and time
    const organizedTranscripts = transcripts
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .map(t => {
        const time = new Date(t.timestamp).toLocaleTimeString();
        return `[${time}] ${t.userName || t.speaker}: ${t.text}`;
      })
      .join('\n');

    // Create a context-aware prompt for the AI
    const chatPrompt = `You are an AI assistant helping to answer questions about a meeting transcript. You have access to the complete meeting transcript below.

MEETING INFORMATION:
- Meeting ID: ${meetingId}
- Title: ${meeting.title || `Meeting ${meetingId}`}
- Date: ${meeting.startedAt ? new Date(meeting.startedAt).toLocaleDateString() : 'N/A'}
- Participants: ${meeting.participants?.join(', ') || 'Unknown'}
- Duration: ${meeting.actualDuration || meeting.duration || 'Unknown'} minutes

MEETING TRANSCRIPT:
${organizedTranscripts}

USER QUESTION: ${question}

Please answer the user's question based on the meeting transcript above. Be specific and reference relevant parts of the conversation. If the information is not available in the transcript, clearly state that. Provide direct quotes when relevant and mention who said what and when possible.

Format your response in a helpful and conversational manner. If you're referencing specific parts of the transcript, include the speaker's name and approximate time when relevant.`;

    // Call WatsonX for chat response
    const body = {
      messages: [
        {
          role: 'user',
          content: chatPrompt
        }
      ],
      project_id: process.env.WATSONX_PROJECT_ID,
      model_id: process.env.WATSONX_MODEL_ID || 'ibm/granite-3-3-8b-instruct',
      temperature: 0.2,
      max_tokens: 800,
    };

    console.log('📤 Calling WatsonX for meeting chat response...');
    const data = await callWatsonx('/ml/v1/text/chat?version=2023-05-29', body);

    // Extract the response from WatsonX format
    const answer = data?.choices?.[0]?.message?.content || 
                  data?.results?.[0]?.generated_text || 
                  data?.output || 
                  'I could not generate a response to your question.';

    console.log('✅ Meeting chat response generated');

    return NextResponse.json({
      success: true,
      question,
      answer,
      meetingId,
      meetingTitle: meeting.title || `Meeting ${meetingId}`,
      transcriptCount: transcripts.length,
      participants: meeting.participants || [],
      respondedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Meeting chat error:', error);
    return NextResponse.json({ 
      error: 'Failed to process chat question', 
      details: String(error)
    }, { status: 500 });
  }
}
