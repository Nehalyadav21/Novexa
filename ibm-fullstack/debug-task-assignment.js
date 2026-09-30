// Debug script to compare chat vs meeting task assignment
const fs = require('fs');
const path = require('path');

console.log('🔍 === DEBUGGING TASK ASSIGNMENT SYSTEMS ===');

// Test data - the SAME message that works in chat
const testMessage = "john please complete the report by tomorrow";

// Chat participants format (what works)
const chatParticipants = [
  { name: 'steve', id: '1' },
  { name: 'john', id: '2' }
];

// Meeting participants format (what might not work)
const meetingParticipants = [
  { userName: 'steve', userId: '1' },
  { userName: 'john', userId: '2' }
];

// Meeting transcript format
const meetingTranscript = `steve: ${testMessage}`;

console.log('\n🧪 === DATA COMPARISON ===');
console.log('Test message:', testMessage);
console.log('Chat participants:', JSON.stringify(chatParticipants, null, 2));
console.log('Meeting participants:', JSON.stringify(meetingParticipants, null, 2));
console.log('Meeting transcript:', meetingTranscript);

console.log('\n🔍 === KEY DIFFERENCES ===');
console.log('1. Participant format:');
console.log('   - Chat uses: { name: "john", id: "2" }');
console.log('   - Meeting uses: { userName: "john", userId: "2" }');
console.log('2. Message format:');
console.log('   - Chat uses: direct message "john please complete..."');
console.log('   - Meeting uses: transcript "steve: john please complete..."');

console.log('\n🔍 === NEXT STEPS ===');
console.log('Need to check:');
console.log('1. Does aiTaskAssignment.js expect userName/userId format?');
console.log('2. Do the regex patterns handle speaker:message format?');
console.log('3. Are participant matching functions compatible?');
