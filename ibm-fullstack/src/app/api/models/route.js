import { NextResponse } from 'next/server';
import { callWatsonXAPI } from '@/lib/aiUtils';
import { getAvailableModels } from '@/lib/watsonxModels';

export async function GET() {
  try {
    const apiKey = process.env.WATSONX_API_KEY;
    const projectId = process.env.WATSONX_PROJECT_ID;
    const baseUrl = process.env.WATSONX_API_URL || 'https://us-south.ml.cloud.ibm.com';

    // Check if credentials are configured
    if (!apiKey || !projectId) {
      return NextResponse.json({
        error: 'Missing credentials',
        details: {
          hasApiKey: !!apiKey,
          hasProjectId: !!projectId,
          hasBaseUrl: !!baseUrl
        }
      }, { status: 400 });
    }

    // Get list of available models
    const availableModels = getAvailableModels();
    
    return NextResponse.json({
      success: true,
      message: 'Available WatsonX.ai models',
      models: availableModels,
      apiEndpoint: baseUrl,
      projectId: projectId
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json({
      error: 'Failed to fetch models',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { modelId, message = "Hello, please provide a short response to test the connection" } = body;
    
    if (!modelId) {
      return NextResponse.json({ 
        error: "Model ID is required" 
      }, { status: 400 });
    }
    
    // Test the model
    console.log(`Testing model: ${modelId}`);
    
    const testMessages = [
      { role: 'system', content: 'You are a helpful assistant. Keep your responses concise.' },
      { role: 'user', content: message }
    ];
    
    const response = await callWatsonXAPI(testMessages, {
      temperature: 0.1,
      maxTokens: 100,
      model: modelId
    });
    
    return NextResponse.json({
      success: true,
      modelId,
      userMessage: message,
      response,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Model test error:', error);
    return NextResponse.json({
      error: 'Test failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
