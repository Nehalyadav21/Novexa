// Test script to verify transcript API functionality
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const MEETING_ID = 'test-meeting-123';

async function testTranscriptAPI() {
  console.log('🧪 Testing Transcript API...');

  // Test 1: Create a meeting first
  console.log('\n1. Creating test meeting...');
  try {
    const createResponse = await fetch(`${BASE_URL}/api/meetings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        meetingId: MEETING_ID,
        title: 'Test Meeting for Transcript',
        hostId: '689872b5c4995f9c07a0040e', // Valid ObjectId from logs
        hostName: 'Test Host',
        scheduledAt: new Date().toISOString()
      }),
    });

    if (createResponse.ok) {
      console.log('✅ Meeting created successfully');
    } else {
      const errorData = await createResponse.json();
      console.log('⚠️ Meeting creation failed:', errorData);
    }
  } catch (error) {
    console.log('⚠️ Meeting creation error:', error.message);
  }

  // Test 2: Add transcript with valid authenticated user ID
  console.log('\n2. Testing transcript with valid authenticated user...');
  try {
    const transcriptResponse = await fetch(`${BASE_URL}/api/meetings/${MEETING_ID}/transcript`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'Hello, this is a test transcript from an authenticated user.',
        userId: '689872b5c4995f9c07a0040e', // Valid ObjectId
        userName: 'Test User',
        confidence: 0.95
      }),
    });

    const transcriptData = await transcriptResponse.json();
    
    if (transcriptResponse.ok) {
      console.log('✅ Authenticated user transcript saved successfully:', transcriptData);
    } else {
      console.log('❌ Authenticated user transcript failed:', transcriptData);
    }
  } catch (error) {
    console.log('❌ Authenticated transcript error:', error.message);
  }

  // Test 3: Add transcript with invalid user ID (like timestamp)
  console.log('\n3. Testing transcript with invalid user ID (anonymous case)...');
  try {
    const transcriptResponse = await fetch(`${BASE_URL}/api/meetings/${MEETING_ID}/transcript`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'Hello, this is a test transcript from an anonymous user.',
        userId: '1758119562149', // Invalid ObjectId (timestamp)
        userName: 'Anonymous User',
        confidence: 0.85
      }),
    });

    const transcriptData = await transcriptResponse.json();
    
    if (transcriptResponse.ok) {
      console.log('✅ Anonymous user transcript saved successfully:', transcriptData);
    } else {
      console.log('❌ Anonymous user transcript failed:', transcriptData);
    }
  } catch (error) {
    console.log('❌ Anonymous transcript error:', error.message);
  }

  // Test 4: Add transcript with no user ID
  console.log('\n4. Testing transcript with no user ID...');
  try {
    const transcriptResponse = await fetch(`${BASE_URL}/api/meetings/${MEETING_ID}/transcript`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'Hello, this is a test transcript with no user ID.',
        userName: 'Unknown Speaker',
        confidence: 0.75
      }),
    });

    const transcriptData = await transcriptResponse.json();
    
    if (transcriptResponse.ok) {
      console.log('✅ No user ID transcript saved successfully:', transcriptData);
    } else {
      console.log('❌ No user ID transcript failed:', transcriptData);
    }
  } catch (error) {
    console.log('❌ No user ID transcript error:', error.message);
  }

  console.log('\n🧪 All transcript tests completed!');
}

// Run the test
testTranscriptAPI().catch(console.error);
