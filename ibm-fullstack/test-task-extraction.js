// Test file to debug task extraction from meeting transcripts
const { extractTasksFromTranscript } = require('./src/utils/aiTaskAssignment.js');

// Test data that mimics a real meeting transcript
const testTranscript = `steve: Hello everyone, let's start the meeting
john: Hi steve, ready to discuss the project
steve: john please prepare the quarterly report by tomorrow
steve: Also, can mary handle the client presentation?
mary: I'll take care of the presentation
steve: Great, and everyone needs to submit their timesheets by Friday`;

// Test participants that match the transcript speakers
const testParticipants = [
  { userId: '1', userName: 'steve' },
  { userId: '2', userName: 'john' },
  { userId: '3', userName: 'mary' }
];

console.log('🧪 Testing task extraction with sample data...');
console.log('📝 Test transcript:', testTranscript);
console.log('👥 Test participants:', testParticipants);

try {
  const extractedTasks = extractTasksFromTranscript(testTranscript, testParticipants);
  console.log('✅ Extraction completed');
  console.log('📋 Extracted tasks:', extractedTasks);
  console.log('📊 Number of tasks found:', extractedTasks.length);
  
  if (extractedTasks.length > 0) {
    console.log('🎉 SUCCESS: Task extraction is working!');
    extractedTasks.forEach((task, index) => {
      console.log(`Task ${index + 1}:`, {
        title: task.title,
        assignedTo: task.assignedToName,
        description: task.description
      });
    });
  } else {
    console.log('❌ NO TASKS FOUND: Check pattern matching logic');
  }
} catch (error) {
  console.error('❌ ERROR during task extraction:', error);
}
