import { NextResponse } from 'next/server';
import { callWatsonx } from '@/lib/watsonx';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Chat from '@/models/Chat';

export async function GET() {
  try {
    const baseUrl = process.env.WATSONX_API_URL;
    const upstream = `${(baseUrl || '').replace(/\/$/, '')}/ml/v1/text/chat`;
    
    console.log('Health check - Environment:', {
      hasApiKey: Boolean(process.env.WATSONX_API_KEY),
      apiUrl: process.env.WATSONX_API_URL,
      projectId: process.env.WATSONX_PROJECT_ID
    });

    return NextResponse.json({
      ok: true,
      service: 'agent',
      upstream,
      hasApiKey: Boolean(process.env.WATSONX_API_KEY),
      hasUrl: Boolean(baseUrl)
    });
  } catch (err) {
    console.error('Health check failed:', err);
    return NextResponse.json({ ok: false, error: 'Health check failed', details: String(err) }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { input, message, prompt, chatId, personality = 'friendly', ...rest } = await request.json();
    const userInput = (input ?? message ?? prompt ?? '').toString();

    if (!userInput.trim()) {
      return NextResponse.json({ error: 'Missing input' }, { status: 400 });
    }

    console.log('Received user input:', userInput);

    await connectDB();

    let chat;
    
    if (chatId) {
      // Get existing chat
      chat = await Chat.findOne({
        _id: chatId,
        user: session.user.id
      });
      
      if (!chat) {
        return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
      }
    } else {
      // Create new chat
      chat = await Chat.create({
        user: session.user.id,
        title: userInput.slice(0, 50) + (userInput.length > 50 ? '...' : ''),
        personality: personality,
        messages: []
      });
    }

    // Add user message to chat
    const userMessage = {
      content: userInput,
      role: 'user',
      timestamp: new Date(),
      metadata: { personality }
    };
    chat.messages.push(userMessage);

    // Build conversation context from recent messages (last 10)
    const recentMessages = chat.messages.slice(-10);
    const conversationHistory = recentMessages.map(m => ({
      role: m.role,
      content: m.content
    }));

    // Build messages array for WatsonX chat format
    const messages = conversationHistory;

    const body = {
      messages,
      project_id: process.env.WATSONX_PROJECT_ID || undefined,
      model_id: process.env.WATSONX_MODEL_ID || 'ibm/granite-3-3-8b-instruct',
      temperature: parseFloat(process.env.WATSONX_TEMPERATURE || '0.3'),
      max_tokens: parseInt(process.env.WATSONX_MAX_TOKENS || '800'),
    };

    console.log('Calling WatsonX with:', body);

    const data = await callWatsonx('/ml/v1/text/chat?version=2023-05-29', body);
    
    console.log('WatsonX response:', data);

    // Extract the response from WatsonX format
    const aiResponse = data?.choices?.[0]?.message?.content || 
                      data?.results?.[0]?.generated_text || 
                      data?.output || 
                      'Sorry, I could not generate a response.';

    // Add AI response to chat
    const assistantMessage = {
      content: aiResponse,
      role: 'assistant',
      timestamp: new Date(),
      metadata: { 
        personality,
        model: body.model_id
      }
    };
    chat.messages.push(assistantMessage);

    // Update chat analytics
    chat.analytics.total_messages += 2; // user + assistant
    chat.analytics.last_activity = new Date();

    await chat.save();

    return NextResponse.json({ 
      response: aiResponse,
      chatId: chat._id.toString(),
      chatTitle: chat.title,
      personality: chat.personality
    });
  } catch (error) {
    console.error('Agent error:', error);
    return NextResponse.json({ 
      error: 'Failed to process request', 
      details: String(error),
      trace: error.stack
    }, { status: 500 });
  }
}
