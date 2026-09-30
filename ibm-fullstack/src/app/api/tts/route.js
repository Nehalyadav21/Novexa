import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { text } = await request.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const apiKey = process.env.WATSON_TTS_API_KEY;
    const apiUrl = process.env.WATSON_TTS_URL;

    // If Watson TTS is not configured, return a silent audio response
    if (!apiKey || !apiUrl || apiKey === 'your-watson-tts-api-key') {
      console.log('Watson TTS not configured, returning silent audio');
      // Create a minimal silent WAV file
      const silentWav = Buffer.from([
        0x52, 0x49, 0x46, 0x46, // "RIFF"
        0x24, 0x00, 0x00, 0x00, // File size - 8
        0x57, 0x41, 0x56, 0x45, // "WAVE"
        0x66, 0x6D, 0x74, 0x20, // "fmt "
        0x10, 0x00, 0x00, 0x00, // Subchunk1Size
        0x01, 0x00,             // AudioFormat (PCM)
        0x01, 0x00,             // NumChannels (mono)
        0x44, 0xAC, 0x00, 0x00, // SampleRate (44100 Hz)
        0x88, 0x58, 0x01, 0x00, // ByteRate
        0x02, 0x00,             // BlockAlign
        0x10, 0x00,             // BitsPerSample
        0x64, 0x61, 0x74, 0x61, // "data"
        0x00, 0x00, 0x00, 0x00  // Subchunk2Size (0 for silence)
      ]);
      
      return new NextResponse(silentWav, {
        headers: {
          'Content-Type': 'audio/wav',
          'Content-Length': silentWav.length.toString(),
        },
      });
    }

    const response = await fetch(`${apiUrl}/v1/synthesize`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`apikey:${apiKey}`).toString('base64')}`,
        'Content-Type': 'application/json',
        'Accept': 'audio/wav'
      },
      body: JSON.stringify({
        text: text,
        voice: 'en-US_AllisonV3Voice',
        accept: 'audio/wav'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Watson TTS error:', errorText);
      // Return silent audio instead of error to prevent breaking the UI
      const silentWav = Buffer.from([
        0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00,
        0x57, 0x41, 0x56, 0x45, 0x66, 0x6D, 0x74, 0x20,
        0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
        0x44, 0xAC, 0x00, 0x00, 0x88, 0x58, 0x01, 0x00,
        0x02, 0x00, 0x10, 0x00, 0x64, 0x61, 0x74, 0x61,
        0x00, 0x00, 0x00, 0x00
      ]);
      
      return new NextResponse(silentWav, {
        headers: {
          'Content-Type': 'audio/wav',
          'Content-Length': silentWav.length.toString(),
        },
      });
    }

    const audioBuffer = await response.arrayBuffer();
    
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('TTS error:', error);
    // Return silent audio instead of error to prevent breaking the UI
    const silentWav = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00,
      0x57, 0x41, 0x56, 0x45, 0x66, 0x6D, 0x74, 0x20,
      0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
      0x44, 0xAC, 0x00, 0x00, 0x88, 0x58, 0x01, 0x00,
      0x02, 0x00, 0x10, 0x00, 0x64, 0x61, 0x74, 0x61,
      0x00, 0x00, 0x00, 0x00
    ]);
    
    return new NextResponse(silentWav, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': silentWav.length.toString(),
      },
    });
  }
}
