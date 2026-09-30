import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { meetingId, transcripts } = await request.json();

    if (!transcripts || transcripts.length === 0) {
      return NextResponse.json({ 
        error: 'No transcripts provided for summarization' 
      }, { status: 400 });
    }

    const apiKey = process.env.WATSONX_API_KEY;
    const projectId = process.env.WATSONX_PROJECT_ID;
    const apiUrl = process.env.WATSONX_URL || 'https://us-south.ml.cloud.ibm.com';

    console.log('WatsonX Config:', {
      hasApiKey: Boolean(apiKey),
      hasProjectId: Boolean(projectId),
      apiUrl,
      transcriptCount: transcripts.length
    });

    if (!apiKey || !projectId) {
      return NextResponse.json({ 
        error: 'WatsonX not configured',
        details: 'Please set WATSONX_API_KEY and WATSONX_PROJECT_ID in your environment'
      }, { status: 500 });
    }

    // Prepare transcript text for summarization
    const transcriptText = transcripts
      .map(t => `${t.speakerName}: ${t.transcript}`)
      .join('\n');

    console.log('Transcript text length:', transcriptText.length);

    // Create the prompt for meeting summarization
    const prompt = `Please analyze the following meeting transcript and provide a comprehensive summary in JSON format with these sections:

Meeting Transcript:
${transcriptText}

Please provide the response in this exact JSON format:
{
  "summary": "Brief overview of the meeting",
  "keyDecisions": [
    "List of key decisions made during the meeting"
  ],
  "actionItems": [
    {
      "item": "Description of action item",
      "assignee": "Person responsible (if mentioned)",
      "dueDate": "Due date if mentioned, otherwise null"
    }
  ],
  "keyPoints": [
    "Important points discussed"
  ],
  "speakerInsights": [
    {
      "speaker": "Speaker name",
      "mainContributions": "Their key contributions to the discussion"
    }
  ],
  "nextSteps": [
    "Next steps or follow-up actions"
  ]
}`;

    // Get access token for WatsonX
    const tokenResponse = await fetch(`${apiUrl}/ml/v1/authorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        grant_type: 'urn:ibm:params:oauth:grant-type:apikey',
        apikey: apiKey
      })
    });

    if (!tokenResponse.ok) {
      console.error('Token response error:', await tokenResponse.text());
      return NextResponse.json({ 
        error: 'Failed to authenticate with WatsonX',
        status: tokenResponse.status
      }, { status: 500 });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Call WatsonX LLM for summarization
    const llmResponse = await fetch(`${apiUrl}/ml/v1/text/generation?version=2023-05-29`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        input: prompt,
        parameters: {
          decoding_method: 'greedy',
          max_new_tokens: 1500,
          temperature: 0.3,
          repetition_penalty: 1.1
        },
        model_id: 'meta-llama/llama-3-8b-instruct',
        project_id: projectId
      })
    });

    console.log('LLM response status:', llmResponse.status);

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error('LLM response error:', errorText);
      return NextResponse.json({ 
        error: 'Failed to generate summary with WatsonX',
        details: errorText,
        status: llmResponse.status
      }, { status: llmResponse.status });
    }

    const llmResult = await llmResponse.json();
    console.log('LLM raw result:', JSON.stringify(llmResult, null, 2));

    const generatedText = llmResult.results?.[0]?.generated_text || '';
    
    if (!generatedText) {
      return NextResponse.json({ 
        error: 'No summary generated',
        details: 'WatsonX did not generate any summary text'
      }, { status: 500 });
    }

    // Try to parse the JSON response
    let summary;
    try {
      // Extract JSON from the generated text
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        summary = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: create a simple summary structure
        summary = {
          summary: generatedText.split('\n')[0] || 'Meeting summary generated',
          keyDecisions: [],
          actionItems: [],
          keyPoints: generatedText.split('\n').filter(line => line.trim()),
          speakerInsights: [],
          nextSteps: []
        };
      }
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      // Create fallback summary
      summary = {
        summary: generatedText.substring(0, 200) + '...',
        keyDecisions: [],
        actionItems: [],
        keyPoints: [generatedText],
        speakerInsights: [],
        nextSteps: []
      };
    }

    // Enhance summary with meeting metadata
    const enhancedSummary = {
      ...summary,
      meetingId,
      generatedAt: new Date(),
      transcriptCount: transcripts.length,
      participants: [...new Set(transcripts.map(t => t.speakerName))],
      duration: transcripts.length > 0 ? {
        start: new Date(Math.min(...transcripts.map(t => new Date(t.timestamp)))),
        end: new Date(Math.max(...transcripts.map(t => new Date(t.timestamp))))
      } : null
    };

    return NextResponse.json({
      success: true,
      summary: enhancedSummary,
      rawOutput: generatedText
    });

  } catch (error) {
    console.error('Summarization error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate meeting summary',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
