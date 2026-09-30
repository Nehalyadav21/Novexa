import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio');

    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    const apiKey = process.env.WATSON_STT_API_KEY;
    const apiUrl = process.env.WATSON_STT_URL;

    console.log('STT Config:', {
      hasApiKey: Boolean(apiKey),
      apiUrl,
      keyLength: apiKey?.length
    });

    if (!apiKey || !apiUrl || apiKey === 'your-watson-stt-api-key') {
      return NextResponse.json({ 
        error: 'Watson STT not configured',
        details: 'Please set WATSON_STT_API_KEY and WATSON_STT_URL in your environment'
      }, { status: 500 });
    }

    const audioBuffer = await audioFile.arrayBuffer();
    
    console.log('Audio file info:', {
      name: audioFile.name,
      type: audioFile.type,
      size: audioBuffer.byteLength
    });

    // Watson STT endpoint with enhanced parameters for meeting transcription
    const endpoint = `${apiUrl}/v1/recognize`;
    console.log('Calling Watson STT endpoint:', endpoint);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`apikey:${apiKey}`).toString('base64')}`,
        'Content-Type': audioFile.type || 'audio/webm',
      },
      body: audioBuffer
    });

    console.log('Watson STT response status:', response.status);
    console.log('Watson STT response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Watson STT raw response:', responseText);

    if (!response.ok) {
      console.error('Watson STT error:', responseText);
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { error: responseText };
      }
      
      return NextResponse.json({ 
        error: 'Watson STT API error',
        status: response.status,
        details: errorData,
        trace: errorData.trace || 'No trace available'
      }, { status: response.status });
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse Watson STT response:', e);
      return NextResponse.json({ 
        error: 'Invalid response from Watson STT',
        details: responseText
      }, { status: 500 });
    }
    
    // Extract the transcript with enhanced confidence and timing
    const transcript = result.results?.[0]?.alternatives?.[0]?.transcript || '';
    const confidence = result.results?.[0]?.alternatives?.[0]?.confidence || 0;
    
    // Extract word timings if available (for better speaker diarization)
    const wordTimings = result.results?.[0]?.alternatives?.[0]?.timestamps || [];
    
    if (!transcript.trim()) {
      return NextResponse.json({ 
        error: 'No speech detected in audio',
        details: 'Watson STT did not detect any speech in the provided audio file'
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      transcript: transcript.trim(),
      confidence,
      wordTimings,
      processingTime: Date.now(),
      raw: result
    });

  } catch (error) {
    console.error('STT error:', error);
    return NextResponse.json({ 
      error: 'Failed to transcribe audio',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// Streaming STT endpoint for real-time transcription
export async function PUT(request) {
  try {
    const { audioChunk, sessionId, speakerId } = await request.json();

    if (!audioChunk) {
      return NextResponse.json({ error: 'Audio chunk is required' }, { status: 400 });
    }

    const apiKey = process.env.WATSON_STT_API_KEY;
    const apiUrl = process.env.WATSON_STT_URL;

    if (!apiKey || !apiUrl) {
      return NextResponse.json({ 
        error: 'Watson STT not configured'
      }, { status: 500 });
    }

    // Convert base64 audio chunk to buffer
    const audioBuffer = Buffer.from(audioChunk, 'base64');

    // Use Watson STT streaming API
    const endpoint = `${apiUrl}/v1/recognize`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`apikey:${apiKey}`).toString('base64')}`,
        'Content-Type': 'audio/webm',
        'X-Watson-Learning-Opt-Out': 'true'
      },
      body: audioBuffer
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Watson STT streaming error:', errorText);
      return NextResponse.json({ 
        error: 'Streaming transcription failed',
        details: errorText
      }, { status: response.status });
    }

    const result = await response.json();
    
    const transcript = result.results?.[0]?.alternatives?.[0]?.transcript || '';
    const confidence = result.results?.[0]?.alternatives?.[0]?.confidence || 0;
    const isFinal = result.results?.[0]?.final || false;

    return NextResponse.json({
      transcript: transcript.trim(),
      confidence,
      isFinal,
      speakerId,
      sessionId,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Streaming STT error:', error);
    return NextResponse.json({ 
      error: 'Failed to process audio stream',
      details: error.message
    }, { status: 500 });
  }
}
