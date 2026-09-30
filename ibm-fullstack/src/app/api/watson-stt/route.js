/**
 * Watson Speech-to-Text API Route
 * Handles STT token generation and configuration
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Watson STT Configuration
const IAM_URL = 'https://iam.cloud.ibm.com/identity/token';
const API_KEY = process.env.WATSON_STT_API_KEY;
const STT_URL = process.env.WATSON_STT_URL;

export async function GET() {
  try {
    // For meetings, we'll allow access without authentication for now
    // In production, you might want to validate meeting IDs instead
    
    // Health check for Watson STT service
    console.log('Watson STT Health check - Environment:', {
      hasApiKey: Boolean(API_KEY),
      sttUrl: STT_URL,
      iamUrl: IAM_URL
    });

    return NextResponse.json({
      ok: true,
      service: 'watson-stt',
      hasApiKey: Boolean(API_KEY),
      hasUrl: Boolean(STT_URL),
      websocketUrl: STT_URL ? STT_URL.replace('https://', 'wss://').replace('http://', 'ws://') + '/v1/recognize' : null
    });
  } catch (err) {
    console.error('Watson STT health check failed:', err);
    return NextResponse.json({ 
      ok: false, 
      error: 'Health check failed', 
      details: String(err) 
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    // For meetings, we'll allow access without authentication for now
    // In production, you might want to validate meeting IDs instead
    
    const { action } = await request.json();

    if (action === 'getToken') {
      // Generate IBM Cloud IAM token for Watson STT
      if (!API_KEY) {
        console.error('Watson STT API key not found in environment');
        return NextResponse.json({ 
          error: 'Watson STT not configured - missing API key' 
        }, { status: 500 });
      }

      console.log('Generating Watson STT token...');
      
      const params = new URLSearchParams();
      params.append('grant_type', 'urn:ibm:params:oauth:grant-type:apikey');
      params.append('apikey', API_KEY);

      const response = await fetch(IAM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to get IBM IAM token:', errorText);
        return NextResponse.json({ 
          error: 'Failed to authenticate with Watson STT',
          details: errorText
        }, { status: 500 });
      }

      const tokenData = await response.json();
      console.log('Watson STT token generated successfully');
      
      return NextResponse.json({
        token: tokenData.access_token,
        expiresIn: tokenData.expires_in,
        websocketUrl: STT_URL ? STT_URL.replace('https://', 'wss://').replace('http://', 'ws://') + '/v1/recognize' : null
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Watson STT API error:', error);
    return NextResponse.json({ 
      error: 'Watson STT service error', 
      details: String(error) 
    }, { status: 500 });
  }
}
