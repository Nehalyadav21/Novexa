// Test script for meeting task assignment notifications

const testMeetingTasks = async () => {
  const meetingId = 'test-meeting-' + Date.now();
  const testTasks = [
    {
      title: 'Review the Q1 budget proposal',
      description: 'Please review the Q1 budget and provide feedback by Friday',
      assignedTo: 'john', // This should be assigned to a different user than the one creating
      priority: 'high',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      context: 'Discussed during budget meeting',
      confidence: 0.9,
      extractedAt: new Date().toISOString()
    },
    {
      title: 'Prepare marketing presentation',
      description: 'Create slides for the upcoming marketing campaign presentation',
      assignedTo: 'steve',
      priority: 'medium',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
      context: 'Marketing team discussion',
      confidence: 0.85,
      extractedAt: new Date().toISOString()
    }
  ];

  try {
    const response = await fetch('http://localhost:3000/api/tasks/create-from-meeting', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // You'll need to add proper authentication headers here
      },
      body: JSON.stringify({
        meetingId: meetingId,
        tasks: testTasks
      })
    });

    const result = await response.json();
    console.log('Test result:', result);
    
    if (result.success) {
      console.log(`✅ Successfully created ${result.tasks.length} tasks`);
      console.log('Tasks created:', result.tasks);
    } else {
      console.log('❌ Failed to create tasks:', result.error);
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run the test
console.log('🧪 Starting meeting task assignment notification test...');
testMeetingTasks();
