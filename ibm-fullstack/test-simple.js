const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BASE_URL = 'http://localhost:3000';
const MEETING_ID = 'test-meeting-transcript';

async function testTranscript() {
  console.log('🧪 Testing Transcript API...');
  
  // Test with invalid ObjectId (timestamp)
  console.log('Testing with invalid user ID (timestamp)...');
  try {
    const response = await fetch(`${BASE_URL}/api/meetings/${MEETING_ID}/transcript`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'Hello, this is a test transcript with timestamp ID.',
        userId: '1758119562149',
        userName: 'Anonymous User',
        confidence: 0.85
      })
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('Error:', error.message);
  }
}

testTranscript();
