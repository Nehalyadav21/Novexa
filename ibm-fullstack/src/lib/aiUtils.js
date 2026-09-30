// AI Personality configurations
export const PERSONALITIES = {
  professional: {
    name: "Professional",
    prompt: "You are a professional and formal assistant. Use clear, structured responses with a business-appropriate tone. Be direct and efficient while maintaining politeness.",
    icon: "💼"
  },
  friendly: {
    name: "Friendly", 
    prompt: "You are a warm and friendly assistant. Use a conversational tone, be encouraging and supportive. Show enthusiasm and empathy in your responses.",
    icon: "😊"
  },
  creative: {
    name: "Creative",
    prompt: "You are a creative and imaginative assistant. Think outside the box, use vivid language, and approach problems with artistic and innovative perspectives.",
    icon: "🎨"
  },
  analytical: {
    name: "Analytical",
    prompt: "You are a logical and data-driven assistant. Focus on facts, provide structured analysis, break down complex problems systematically, and support conclusions with reasoning.",
    icon: "📊"
  },
  casual: {
    name: "Casual",
    prompt: "You are a relaxed and informal assistant. Use casual language, be laid-back and approachable. Keep things simple and conversational.",
    icon: "😎"
  }
};

export function buildSystemPrompt(personality = 'friendly') {
  return PERSONALITIES[personality]?.prompt || PERSONALITIES.friendly.prompt;
}

export function enhancePromptWithContext(userInput, context = '', personality = 'friendly') {
  const systemPrompt = buildSystemPrompt(personality);
  
  if (context) {
    return `${systemPrompt}\n\nConversation context:\n${context}\n\nUser: ${userInput}\nAssistant:`;
  }
  
  return `${systemPrompt}\n\nUser: ${userInput}\nAssistant:`;
}

// Token cache to avoid regenerating tokens constantly
let tokenCache = {
  token: null,
  expiresAt: null
};

// Helper function to get a valid access token
async function getAccessToken() {
  const apiKey = process.env.WATSONX_API_KEY;
  
  if (!apiKey) {
    throw new Error('WATSONX_API_KEY not configured');
  }

  // Check if we have a valid cached token (with 5 minute buffer before expiry)
  const now = Date.now();
  const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
  
  if (tokenCache.token && tokenCache.expiresAt && (tokenCache.expiresAt - bufferTime) > now) {
    return tokenCache.token;
  }

  console.log('Generating new access token...');
  
  const formBody = `grant_type=urn%3Aibm%3Aparams%3Aoauth%3Agrant-type%3Aapikey&apikey=${encodeURIComponent(apiKey)}`;
  
  const tokenResponse = await fetch('https://iam.cloud.ibm.com/identity/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: formBody
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${tokenResponse.status} ${tokenResponse.statusText} - ${errorText}`);
  }
  
  const tokenData = await tokenResponse.json();
  
  // Cache the token with expiry time
  tokenCache.token = tokenData.access_token;
  tokenCache.expiresAt = now + (tokenData.expires_in * 1000);
  
  console.log(`Token cached, expires at: ${new Date(tokenCache.expiresAt).toISOString()}`);
  return tokenCache.token;
}

// Convert chat messages to a single prompt string
function formatMessagesAsPrompt(messages) {
  return messages.map(msg => {
    const role = msg.role === 'user' ? 'Human' : (msg.role === 'system' ? 'System' : 'Assistant');
    return `${role}: ${msg.content}`;
  }).join('\n') + '\nAssistant:';
}

// Main function to call WatsonX AI using REST API
export async function callWatsonXAPI(messages, options = {}) {
  console.log('callWatsonXAPI called with:', { messages, options });
  
  const {
    temperature = 0.7,
    maxTokens = 1024,
    model = 'ibm/granite-13b-chat-v2'
  } = options;

  try {
    console.log('Getting environment variables...');
    const projectId = process.env.WATSONX_PROJECT_ID;
    const baseUrl = process.env.WATSONX_API_URL || 'https://us-south.ml.cloud.ibm.com';
    
    console.log('Environment check:', { 
      hasProjectId: !!projectId, 
      baseUrl,
      hasApiKey: !!process.env.WATSONX_API_KEY 
    });
    
    if (!projectId) {
      throw new Error('WATSONX_PROJECT_ID not configured');
    }

    // Get access token
    console.log('Getting access token...');
    const accessToken = await getAccessToken();
    console.log('Access token obtained successfully');
    
    // Format messages for the model
    const prompt = formatMessagesAsPrompt(messages);
    console.log('Formatted prompt:', prompt);
    
    console.log(`Calling WatsonX.ai with model: ${model}`);
    
    // Call the WatsonX.ai REST API
    const endpoint = `${baseUrl}/ml/v1/generation`;
    console.log('API endpoint:', endpoint);
    
    const requestBody = {
      model_id: model,
      input: prompt,
      parameters: {
        max_new_tokens: maxTokens,
        temperature: temperature,
        stop_sequences: ['\nHuman:', '\nSystem:']
      },
      project_id: projectId
    };
    
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('WatsonX API error response:', errorText);
      throw new Error(`WatsonX API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('WatsonX API response:', JSON.stringify(data, null, 2));
    
    // Extract the generated text
    if (data?.results?.[0]?.generated_text) {
      const generatedText = data.results[0].generated_text;
      console.log('Generated text:', generatedText);
      return generatedText.trim();
    } else {
      console.warn('Unexpected response format:', data);
      return "I'm sorry, I couldn't generate a response.";
    }

  } catch (error) {
    console.error('Error calling WatsonX API:', error);
    
    // Provide more specific error messages
    if (error.message?.includes('401')) {
      return "I apologize, but there's an authentication error with the AI service. Please check the API credentials.";
    } else if (error.message?.includes('404')) {
      return "I apologize, but the requested AI model is not available. Please try again or contact support.";
    } else if (error.message?.includes('429')) {
      return "I apologize, but the AI service is currently rate limited. Please try again in a moment.";
    } else {
      return `I apologize, but I encountered an error: ${error.message}`;
    }
  }
}

// Text-to-Speech function (if you have IBM TTS configured)
export async function callIBMTTS(text, outputPath) {
  try {
    const endpoint = process.env.IBM_TTS_URL;
    const apiKey = process.env.IBM_TTS_APIKEY;

    if (!endpoint || !apiKey) {
      throw new Error('IBM TTS credentials not configured');
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'audio/mp3',
        'Authorization': `Basic ${Buffer.from(`apikey:${apiKey}`).toString('base64')}`
      },
      body: JSON.stringify({
        text: text,
        voice: 'en-US_AllisonV3Voice',
        accept: 'audio/mp3'
      })
    });

    if (!response.ok) {
      throw new Error(`TTS failed: ${response.statusText}`);
    }

    return await response.arrayBuffer();
  } catch (error) {
    console.error('TTS Error:', error);
    throw error;
  }
}

// Speech-to-Text function (if you have IBM STT configured)
export async function callIBMSTT(audioBuffer) {
  try {
    const endpoint = process.env.IBM_STT_URL;
    const apiKey = process.env.IBM_STT_APIKEY;

    if (!endpoint || !apiKey) {
      throw new Error('IBM STT credentials not configured');
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'audio/wav',
        'Authorization': `Basic ${Buffer.from(`apikey:${apiKey}`).toString('base64')}`
      },
      body: audioBuffer
    });

    if (!response.ok) {
      throw new Error(`STT failed: ${response.statusText}`);
    }

    const data = await response.json();
    let transcript = '';
    
    for (const result of data.results || []) {
      transcript += result.alternatives?.[0]?.transcript || '';
    }

    return transcript.trim();
  } catch (error) {
    console.error('STT Error:', error);
    throw error;
  }
}
