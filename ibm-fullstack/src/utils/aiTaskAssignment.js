/**
 * AI-Powered Task Assignment from Meeting Transcripts
 * 
 * This module analyzes meeting transcripts to automatically detect and assign tasks
 * to participants based on conversation patterns and commitments.
 */

/**
 * Extract tasks from meeting transcript using pattern matching and AI analysis
 * @param {string} transcript - The meeting transcript text
 * @param {Array} participants - Array of meeting participants
 * @returns {Array} Array of detected tasks with assignments
 */
export function extractTasksFromTranscript(transcript, participants) {
  console.log('🧪 extractTasksFromTranscript called with:', { transcript, participants });
  console.log('🔍 Transcript type:', typeof transcript);
  console.log('🔍 Transcript length:', transcript ? transcript.length : 'null');
  console.log('🔍 Participants type:', typeof participants);
  console.log('🔍 Participants length:', participants ? participants.length : 'null');
  console.log('🔍 Raw transcript:', JSON.stringify(transcript));
  console.log('🔍 Raw participants:', JSON.stringify(participants));
  
  if (!transcript || !participants || participants.length === 0) {
    console.log('❌ Missing transcript or participants');
    console.log('❌ transcript exists:', !!transcript);
    console.log('❌ participants exists:', !!participants);
    console.log('❌ participants length:', participants?.length);
    return [];
  }

  const tasks = [];
  const lines = transcript.split('\n').filter(line => line.trim());
  
  console.log('📝 Processing lines:', lines);
  console.log('📝 Number of lines:', lines.length);
  
  // Quick test with sample data if no lines found
  if (lines.length === 0) {
    console.log('⚠️ No lines to process from transcript');
    console.log('⚠️ Original transcript was:', transcript);
    return [];
  }
  
  // Task detection patterns - enhanced to handle both speaker:message and direct text
  const taskPatterns = [
    // Direct assignments (with speaker)
    /(.+?): .*(will|going to|need to|should|must|have to|responsible for|assigned to|taking care of|handling) (.+)/gi,
    // Action items (with speaker)
    /(.+?): .*(action item|task|todo|follow[- ]?up|deliverable|assignment) (.+)/gi,
    // Commitments (with speaker)
    /(.+?): .*(I'll|I will|I can|I should|I need to|Let me) (.+)/gi,
    // Due dates and deadlines (with speaker)
    /(.+?): .*(by|until|before|deadline|due) (.+)/gi,
    // Responsibility mentions (with speaker)
    /(.+?): .*(responsible|owner|lead|assigned|delegate) (.+)/gi,
    // Direct requests with speaker (e.g. 'Speaker: John please make the report by tomorrow')
    /(.+?): (.+?) please ([^\.]+?)(?:\.|$)/gi,
    // Direct requests without speaker (e.g. 'John please send the report by tomorrow')
    /^([A-Za-z ]+?) please (.+?)(?:\.|$)/gi,
    // Direct task assignments without speaker (e.g. 'John should handle the documentation')
    /^([A-Za-z ]+?) (should|will|needs to|must|has to) (.+?)(?:\.|$)/gi
  ];

  console.log('🎯 Starting pattern matching with', taskPatterns.length, 'patterns');

  // Process each line of transcript
  lines.forEach((line, index) => {
    console.log(`🔍 Processing line ${index}: "${line}"`);
    
    taskPatterns.forEach((pattern, patternIndex) => {
      console.log(`🔍 Testing pattern ${patternIndex}:`, pattern.source);
      const matches = [...line.matchAll(pattern)];
      
      if (matches.length > 0) {
        console.log(`✅ Pattern ${patternIndex} matched:`, matches);
      }
      
      matches.forEach(match => {
        let speaker, actionText, assignedName;
        
        // Handle different pattern types
        if (patternIndex === 5) { // Direct request pattern with speaker (Speaker: John please make...)
          speaker = match[1]?.trim();
          assignedName = match[2]?.trim();
          actionText = match[3]?.trim();
          console.log('📝 Direct request with speaker detected:', { speaker, assignedName, actionText });
        } else if (patternIndex === 6) { // Direct request pattern without speaker (John please make...)
          assignedName = match[1]?.trim();
          actionText = match[2]?.trim();
          speaker = 'Meeting Host'; // Default speaker for direct requests
          console.log('📝 Direct request without speaker detected:', { assignedName, actionText });
        } else if (patternIndex === 7) { // Direct task assignment (John should handle...)
          assignedName = match[1]?.trim();
          actionText = `${match[2]} ${match[3]}`.trim();
          speaker = 'Meeting Host';
          console.log('📝 Direct task assignment detected:', { assignedName, actionText });
        } else {
          // Regular patterns with speaker: message format
          speaker = match[1]?.trim();
          actionText = match[3]?.trim();
          assignedName = speaker;
          console.log('📝 Regular pattern detected:', { speaker, actionText });
        }

        const context = match[0];

        if (actionText && actionText.length > 5) {
        // For meeting transcripts, we'll let the API handle user lookup by name
        // instead of limiting to meeting participants only
        console.log('� Task assignment detected:', { speaker, assignedName, actionText });
        
        // Extract due date if mentioned in the full line or action text
          const dueDateMatch = (line + ' ' + actionText).match(/(by|until|before) (.+?)(?:\.|,|$| and| but)/i);
          let dueDate = null;
          if (dueDateMatch) {
            dueDate = parseDateFromText(dueDateMatch[2]);
          }

          // Determine priority based on keywords
          const priority = determinePriority(actionText);

          // Generate task - let API handle user lookup instead of limiting to meeting participants
          const task = {
            id: `task_${Date.now()}_${index}`,
            title: generateTaskTitle(actionText),
            description: actionText,
            assignedTo: assignedName || speaker, // Pass the name, API will find the user
            assignedToName: assignedName || speaker,
            priority: priority,
            status: 'pending',
            dueDate: dueDate,
            source: 'meeting_transcript',
            context: context,
            extractedAt: new Date().toISOString(),
            confidence: calculateConfidence(line, actionText)
          };

          // Lower confidence threshold for direct requests and assignments
          const minConfidence = (patternIndex >= 5) ? 0.3 : 0.6;
          console.log('📊 Task confidence:', task.confidence, 'Min required:', minConfidence);
          
          if (task.confidence > minConfidence) {
            console.log('✅ Task added (will be assigned to any company member):', task);
            tasks.push(task);
          } else {
            console.log('❌ Task rejected (low confidence):', task);
          }
        } else {
          console.log('❌ Action text too short or missing:', actionText);
        }
      });
    });
  });

  console.log('📋 Final extracted tasks before deduplication:', tasks);
  console.log('📋 Number of tasks before deduplication:', tasks.length);
  
  // Remove duplicates and merge similar tasks
  const dedupedTasks = deduplicateTasks(tasks);
  
  console.log('📋 Final extracted tasks after deduplication:', dedupedTasks);
  console.log('📋 Number of tasks after deduplication:', dedupedTasks.length);
  
  return dedupedTasks;
}

/**
 * Generate a concise task title from action text
 */
function generateTaskTitle(actionText) {
  // Remove common filler words and extract core action
  const cleanText = actionText
    .replace(/^(I'll|I will|I can|I should|I need to|Let me|will|going to|need to|should|must|have to)\s+/i, '')
    .replace(/\s+(by|until|before|deadline|due).+$/i, '')
    .trim();

  // Capitalize first letter and limit length
  const title = (cleanText || 'Task').charAt(0).toUpperCase() + (cleanText || 'Task').slice(1);
  return title.length > 50 ? title.substring(0, 47) + '...' : title;
}

/**
 * Determine task priority based on keywords
 */
function determinePriority(actionText) {
  const text = actionText.toLowerCase();
  
  const highPriorityKeywords = ['urgent', 'asap', 'critical', 'emergency', 'immediately', 'priority', 'deadline'];
  const mediumPriorityKeywords = ['important', 'soon', 'this week', 'by end of'];
  
  if (highPriorityKeywords.some(keyword => text.includes(keyword))) {
    return 'high';
  } else if (mediumPriorityKeywords.some(keyword => text.includes(keyword))) {
    return 'medium';
  }
  
  return 'low';
}

/**
 * Parse date from natural language text
 */
function parseDateFromText(dateText) {
  if (!dateText) return null;
  
  const text = dateText.toLowerCase().trim();
  const now = new Date();
  
  // Handle relative dates
  if (text.includes('today')) {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (text.includes('tomorrow')) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  } else if (text.includes('next week')) {
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek;
  } else if (text.includes('end of week')) {
    const endOfWeek = new Date(now);
    const daysUntilFriday = 5 - now.getDay();
    endOfWeek.setDate(endOfWeek.getDate() + daysUntilFriday);
    return endOfWeek;
  }
  
  // Handle "in X days" pattern
  const inDaysMatch = text.match(/in\s+(\d+)\s+days?/i);
  if (inDaysMatch) {
    const daysToAdd = parseInt(inDaysMatch[1]);
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + daysToAdd);
    return futureDate;
  }
  
  // Handle "in X weeks" pattern
  const inWeeksMatch = text.match(/in\s+(\d+)\s+weeks?/i);
  if (inWeeksMatch) {
    const weeksToAdd = parseInt(inWeeksMatch[1]);
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + (weeksToAdd * 7));
    return futureDate;
  }
  
  // Handle weekdays with "by" or "on" (Monday, Tuesday, etc.)
  const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const weekdayPattern = new RegExp(`(?:by|on|this|next)\\s+(${weekdays.join('|')})`, 'i');
  const weekdayMatch = text.match(weekdayPattern);
  
  if (weekdayMatch) {
    const targetDayName = weekdayMatch[1].toLowerCase();
    const targetDayIndex = weekdays.indexOf(targetDayName);
    const currentDayIndex = now.getDay();
    let daysUntilTarget = targetDayIndex - currentDayIndex;
    
    // If the target day has already passed this week, schedule for next week
    if (daysUntilTarget <= 0) {
      daysUntilTarget += 7;
    }
    
    // Check if "next" is explicitly mentioned
    if (text.includes('next')) {
      daysUntilTarget += 7;
    }
    
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + daysUntilTarget);
    return targetDate;
  }
  
  // Handle simple weekday mentions without "by" or "on"
  const simpleWeekdayMatch = weekdays.find(day => text.includes(day));
  if (simpleWeekdayMatch) {
    const targetDayIndex = weekdays.indexOf(simpleWeekdayMatch);
    const currentDayIndex = now.getDay();
    let daysUntilTarget = targetDayIndex - currentDayIndex;
    
    // If the target day has already passed this week, schedule for next week
    if (daysUntilTarget <= 0) {
      daysUntilTarget += 7;
    }
    
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + daysUntilTarget);
    return targetDate;
  }
  
  // Handle dates like "20th of August" or "August 20th"
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'];
  
  // Match patterns like "20th of August" or "August 20th"
  const datePattern = /(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(\w+)|(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?/i;
  const match = text.match(datePattern);
  
  if (match) {
    let day, monthName;
    if (match[1] && match[2]) {
      // "20th of August" format
      day = parseInt(match[1]);
      monthName = match[2].toLowerCase();
    } else if (match[3] && match[4]) {
      // "August 20th" format
      monthName = match[3].toLowerCase();
      day = parseInt(match[4]);
    }
    
    const monthIndex = monthNames.indexOf(monthName);
    if (monthIndex !== -1 && day >= 1 && day <= 31) {
      const year = now.getFullYear();
      const targetDate = new Date(year, monthIndex, day);
      
      // If the date is in the past, assume next year
      if (targetDate < now) {
        targetDate.setFullYear(year + 1);
      }
      
      return targetDate;
    }
  }
  
  // Handle "end of month" or "end of [month name]"
  const endOfMonthMatch = text.match(/end\s+of\s+(\w+)/i);
  if (endOfMonthMatch) {
    const monthName = endOfMonthMatch[1].toLowerCase();
    if (monthName === 'month') {
      // End of current month
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return endOfMonth;
    } else {
      // End of specific month
      const monthIndex = monthNames.indexOf(monthName);
      if (monthIndex !== -1) {
        const year = now.getFullYear();
        const endOfSpecificMonth = new Date(year, monthIndex + 1, 0);
        
        // If the month has passed this year, assume next year
        if (endOfSpecificMonth < now) {
          endOfSpecificMonth.setFullYear(year + 1);
        }
        
        return endOfSpecificMonth;
      }
    }
  }
  
  // Try to parse specific dates
  try {
    const parsed = new Date(dateText);
    if (!isNaN(parsed.getTime()) && parsed > now) {
      return parsed;
    }
  } catch (e) {
    // Ignore parsing errors
  }
  
  return null;
}

/**
 * Find the best name match accounting for different naming conventions
 * Handles Indian names, partial matches, and different name orders
 */
function findBestNameMatch(searchName, participantName) {
  if (!searchName || !participantName) return false;
  
  const search = searchName.toLowerCase().trim();
  const participant = participantName.toLowerCase().trim();
  
  // Exact match
  if (search === participant) return true;
  
  // Split names into parts for better matching
  const searchParts = search.split(/\s+/);
  const participantParts = participant.split(/\s+/);
  
  // Check if any search part matches any participant part (for partial matches like "John" matching "John Smith")
  for (const searchPart of searchParts) {
    if (searchPart.length >= 3) { // Only consider parts with 3+ characters
      for (const participantPart of participantParts) {
        if (participantPart.includes(searchPart) || searchPart.includes(participantPart)) {
          return true;
        }
      }
    }
  }
  
  // Check for Indian naming patterns (first name + family name, or first + middle + last)
  // Handle cases like "Raj" matching "Raj Kumar Sharma" or "Kumar" matching "Raj Kumar"
  if (searchParts.length === 1 && participantParts.length > 1) {
    const searchPart = searchParts[0];
    if (searchPart.length >= 3) {
      return participantParts.some(part => part.startsWith(searchPart) || searchPart.startsWith(part));
    }
  }
  
  // Handle reverse case: "Raj Kumar" matching "Raj"
  if (participantParts.length === 1 && searchParts.length > 1) {
    const participantPart = participantParts[0];
    if (participantPart.length >= 3) {
      return searchParts.some(part => part.startsWith(participantPart) || participantPart.startsWith(part));
    }
  }
  
  // Fuzzy matching for similar names (accounting for spelling variations)
  if (search.length >= 4 && participant.length >= 4) {
    const similarity = calculateNameSimilarity(search, participant);
    return similarity > 0.7; // 70% similarity threshold
  }
  
  return false;
}

/**
 * Calculate name similarity using Levenshtein distance
 */
function calculateNameSimilarity(str1, str2) {
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 1 : 1 - (distance / maxLength);
}

/**
 * Calculate confidence score for task extraction
 */
function calculateConfidence(fullLine, actionText) {
  let confidence = 0.5; // Base confidence
  
  // Increase confidence for specific keywords
  const actionVerbs = ['will', 'going to', 'need to', 'should', 'must', 'responsible', 'send', 'prepare', 'complete', 'finish', 'submit'];
  const hasActionVerb = actionVerbs.some(verb => fullLine.toLowerCase().includes(verb));
  if (hasActionVerb) confidence += 0.2;
  
  // Increase confidence for time mentions
  const timeKeywords = ['by', 'until', 'deadline', 'tomorrow', 'today', 'next week', 'this week', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const hasTimeReference = timeKeywords.some(keyword => fullLine.toLowerCase().includes(keyword));
  if (hasTimeReference) confidence += 0.2;
  
  // Increase confidence for clear assignment language
  const assignmentKeywords = ['assigned', 'responsible', 'owner', 'I will', 'I\'ll', 'please'];
  const hasAssignment = assignmentKeywords.some(keyword => fullLine.toLowerCase().includes(keyword));
  if (hasAssignment) confidence += 0.3;
  
  // Special boost for direct requests with "please"
  if (fullLine.toLowerCase().includes('please')) {
    confidence += 0.2;
  }
  
  // Boost for common task words
  const taskWords = ['report', 'document', 'analysis', 'meeting', 'presentation', 'email', 'call', 'follow up', 'review'];
  const hasTaskWord = taskWords.some(word => fullLine.toLowerCase().includes(word));
  if (hasTaskWord) confidence += 0.1;
  
  return Math.min(confidence, 1.0);
}

/**
 * Remove duplicate and similar tasks
 */
function deduplicateTasks(tasks) {
  const uniqueTasks = [];
  
  tasks.forEach(task => {
    const similar = uniqueTasks.find(existing => 
      // Check for very similar titles or descriptions
      similarity(existing.title, task.title) > 0.7 ||
      similarity(existing.description, task.description) > 0.6 ||
      // Check for same assignee with similar action text
      (existing.assignedTo === task.assignedTo && 
       similarity(existing.description, task.description) > 0.5) ||
      // Check for exact same assignee and similar context
      (existing.assignedTo === task.assignedTo && 
       existing.context && task.context &&
       similarity(existing.context, task.context) > 0.8)
    );
    
    if (!similar) {
      uniqueTasks.push(task);
    } else if (task.confidence > similar.confidence) {
      // Replace with higher confidence task
      const index = uniqueTasks.indexOf(similar);
      uniqueTasks[index] = task;
    } else if (task.confidence === similar.confidence && task.description.length > similar.description.length) {
      // If same confidence, prefer the one with more descriptive text
      const index = uniqueTasks.indexOf(similar);
      uniqueTasks[index] = task;
    }
  });
  
  return uniqueTasks;
}

/**
 * Calculate similarity between two strings
 */
function similarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Create task assignments from meeting transcript
 * @param {string} meetingId - The meeting ID
 * @param {string} transcript - The meeting transcript
 * @param {Array} participants - Array of meeting participants
 * @returns {Promise<Array>} Array of created tasks
 */
export async function createTasksFromMeeting(meetingId, transcript, participants) {
  try {
    console.log('🚀 createTasksFromMeeting called with:', { meetingId, transcript, participants });
    console.log('🔍 Transcript type and length:', typeof transcript, transcript?.length);
    console.log('🔍 Participants type and length:', typeof participants, participants?.length);
    console.log('🔍 First few characters of transcript:', transcript?.substring(0, 200));
    console.log('🔍 Participants structure sample:', participants?.slice(0, 2));
    
    const extractedTasks = extractTasksFromTranscript(transcript, participants);
    
    console.log('📝 Extracted tasks before API call:', extractedTasks);
    
    if (extractedTasks.length === 0) {
      console.log('ℹ️ No tasks extracted, returning empty array');
      return [];
    }

    console.log('📤 Sending tasks to API...');
    
    // Save tasks to database
    const response = await fetch('/api/tasks/create-from-meeting', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        meetingId,
        tasks: extractedTasks
      }),
    });

    console.log('📥 API response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Tasks saved successfully:', result);
      return result.tasks;
    } else {
      const errorText = await response.text();
      console.error('❌ API error response:', errorText);
      console.error('Failed to save tasks:', response.statusText);
      return [];
    }
  } catch (error) {
    console.error('❌ Error creating tasks from meeting:', error);
    return [];
  }
}
