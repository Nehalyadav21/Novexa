/**
 * AI-Powered Task Assignment from Chat Messages
 * 
 * This module analyzes chat messages to automatically detect and assign tasks
 * to participants based on conversation patterns and commitments.
 */

/**
 * Extract tasks from chat message content
 * @param {string} message - The chat message content
 * @param {object} sender - The message sender object
 * @param {Array} participants - Array of chat participants
 * @returns {Array} Array of detected tasks with assignments
 */
export function extractTasksFromChatMessage(message, sender, participants) {
  console.log('🧪 extractTasksFromChatMessage called with:', { message, sender, participants });
  
  if (!message || !sender || !participants || participants.length === 0) {
    console.log('❌ Missing message, sender, or participants');
    return [];
  }

  const tasks = [];
  const messageText = message.trim();
  
  console.log('📝 Processing message:', messageText);
  
  // Task detection patterns for chat messages
  const taskPatterns = [
    // Direct assignments to someone (e.g., "John, please make the report by Friday")
    /([A-Za-z ]+?),?\s+(please|can you|could you|would you|need you to|assign you to|you should|you need to|take care of|handle|do|complete|finish|work on|prepare|create|make|send|submit|review|check|update|fix)\s+([^\.]+?)(?:\.|$)/gi,
    
    // Task assignments with "can/could" (e.g., "Can John handle this?")
    /(can|could|should|will)\s+([A-Za-z ]+?)\s+(handle|do|complete|finish|work on|take care of|manage|lead|own|be responsible for)\s+([^\.]+?)(?:\.|$)/gi,
    
    // Direct requests (e.g., "John please make the report by 20th of August")
    /([A-Za-z ]+?)\s+(please|pls)\s+([^\.]+?)(?:\.|$)/gi,
    
    // Responsibility assignments (e.g., "John is responsible for the report")
    /([A-Za-z ]+?)\s+(is|will be|should be|needs to be)\s+(responsible for|in charge of|leading|handling|working on|assigned to|taking care of)\s+([^\.]+?)(?:\.|$)/gi,
    
    // Action items with names (e.g., "Action item: John - create the presentation")
    /(action item|task|todo|assignment)[:\-\s]+([A-Za-z ]+?)[:\-\s]+([^\.]+?)(?:\.|$)/gi,
    
    // Self-assignments (e.g., "I'll take care of the report")
    /(I'll|I will|I can|I should|I need to|Let me|I'm going to)\s+([^\.]+?)(?:\.|$)/gi,
    
    // Team assignments (e.g., "Everyone needs to submit their reports by Friday")
    /(everyone|all|team|we all)\s+(need to|should|must|have to)\s+([^\.]+?)(?:\.|$)/gi,
    
    // Due date patterns (e.g., "Submit the report by Friday")
    /(submit|send|complete|finish|deliver|provide|prepare|create|make|update|review)\s+([^\.]+?)\s+(by|before|until|due)\s+([^\.]+?)(?:\.|$)/gi
  ];

  // Process the message against all patterns
  taskPatterns.forEach((pattern, patternIndex) => {
    const matches = [...messageText.matchAll(pattern)];
    
    if (matches.length > 0) {
      console.log(`✅ Pattern ${patternIndex} matched:`, matches);
    }
    
    matches.forEach(match => {
      let assignedName, actionText, speaker = sender.name;
      
      // Handle different pattern types
      switch (patternIndex) {
        case 0: // Direct assignments (John, please...)
          assignedName = match[1]?.trim();
          actionText = `${match[2]} ${match[3]}`.trim();
          break;
          
        case 1: // Can/could assignments (Can John handle...)
          assignedName = match[2]?.trim();
          actionText = `${match[3]} ${match[4]}`.trim();
          break;
          
        case 2: // Direct requests (John please...)
          assignedName = match[1]?.trim();
          actionText = match[3]?.trim();
          break;
          
        case 3: // Responsibility assignments (John is responsible for...)
          assignedName = match[1]?.trim();
          actionText = `${match[3]} ${match[4]}`.trim();
          break;
          
        case 4: // Action items (Action item: John - ...)
          assignedName = match[2]?.trim();
          actionText = match[3]?.trim();
          break;
          
        case 5: // Self-assignments (I'll...)
          assignedName = sender.name;
          actionText = match[2]?.trim();
          break;
          
        case 6: // Team assignments (Everyone needs to...)
          assignedName = 'Team';
          actionText = match[3]?.trim();
          break;
          
        case 7: // Due date patterns (Submit... by...)
          assignedName = sender.name; // Assume self-assignment if no explicit assignment
          actionText = `${match[1]} ${match[2]} ${match[3]} ${match[4]}`.trim();
          break;
      }

      const context = match[0];

      if (actionText && actionText.length > 5) {
        // Find participant by name
        let assignedParticipant = null;
        
        if (assignedName && assignedName.toLowerCase() !== 'team') {
          console.log(`🔍 Looking for participant with name: "${assignedName}"`);
          console.log('📝 Available participants:', participants.map(p => p.name));
          
          assignedParticipant = participants.find(p => 
            p.name && findBestNameMatch(assignedName, p.name)
          );
        }

        console.log(' Found participant:', assignedParticipant, 'for assigned name:', assignedName);

        // Extract due date if mentioned
        const dueDateMatch = actionText.match(/(by|until|before|due)\s+(.+?)(?:\.|,|$)/i);
        let dueDate = null;
        if (dueDateMatch) {
          dueDate = parseDateFromText(dueDateMatch[2]);
        }

        // Determine priority based on keywords
        const priority = determinePriority(actionText);

        // Handle team assignments differently
        if (assignedName && assignedName.toLowerCase() === 'team') {
          // Create a task for each participant
          participants.forEach(participant => {
            if (participant._id !== sender._id) { // Don't assign to the sender
              const task = {
                id: `chat_task_${Date.now()}_${participant._id}`,
                title: generateTaskTitle(actionText),
                description: actionText,
                assignedTo: participant._id || participant.id,
                assignedToName: participant.name,
                priority: priority,
                status: 'pending',
                dueDate: dueDate,
                source: 'chat_message',
                context: context,
                assignedBy: sender._id || sender.id,
                assignedByName: sender.name,
                extractedAt: new Date().toISOString(),
                confidence: calculateConfidence(messageText, actionText, patternIndex)
              };

              const minConfidence = 0.5;
              if (task.confidence > minConfidence) {
                console.log('✅ Team task added:', task);
                tasks.push(task);
              }
            }
          });
        } else {
          // Create individual task
          const task = {
            id: `chat_task_${Date.now()}_${Math.random()}`,
            title: generateTaskTitle(actionText),
            description: actionText,
            assignedTo: assignedParticipant?._id || assignedParticipant?.id || assignedName || sender._id,
            assignedToName: assignedParticipant?.name || assignedName || sender.name,
            priority: priority,
            status: 'pending',
            dueDate: dueDate,
            source: 'chat_message',
            context: context,
            assignedBy: sender._id || sender.id,
            assignedByName: sender.name,
            extractedAt: new Date().toISOString(),
            confidence: calculateConfidence(messageText, actionText, patternIndex)
          };

          // Lower confidence threshold for direct assignments
          const minConfidence = patternIndex <= 4 ? 0.4 : 0.6;
          console.log('📊 Task confidence:', task.confidence, 'Min required:', minConfidence);
          
          if (task.confidence > minConfidence) {
            console.log('✅ Task added:', task);
            tasks.push(task);
          } else {
            console.log('❌ Task rejected (low confidence):', task);
          }
        }
      } else {
        console.log('❌ Action text too short or missing:', actionText);
      }
    });
  });

  console.log('📋 Final extracted tasks from chat:', tasks);
  
  // Remove duplicates and merge similar tasks
  return deduplicateTasks(tasks);
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
 * Generate a concise task title from action text
 */
function generateTaskTitle(actionText) {
  // Remove common filler words and extract core action
  const cleanText = actionText
    .replace(/^(please|can you|could you|would you|need you to|I'll|I will|I can|I should|I need to|Let me|will|going to|need to|should|must|have to|handle|do|complete|finish|work on|take care of|manage|lead|own|be responsible for|responsible for|in charge of|leading|handling|working on|assigned to|taking care of)\s+/i, '')
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
  
  const highPriorityKeywords = ['urgent', 'asap', 'critical', 'emergency', 'immediately', 'priority', 'deadline', 'today'];
  const mediumPriorityKeywords = ['important', 'soon', 'this week', 'by end of', 'tomorrow', 'friday'];
  
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
  } else if (text.includes('this week') || text.includes('end of week') || text.includes('friday')) {
    const endOfWeek = new Date(now);
    const daysUntilFriday = 5 - now.getDay();
    endOfWeek.setDate(endOfWeek.getDate() + (daysUntilFriday > 0 ? daysUntilFriday : 7));
    return endOfWeek;
  } else if (text.includes('monday')) {
    const monday = new Date(now);
    const daysUntilMonday = (8 - now.getDay()) % 7;
    monday.setDate(monday.getDate() + daysUntilMonday);
    return monday;
  } else if (text.includes('tuesday')) {
    const tuesday = new Date(now);
    const daysUntilTuesday = (9 - now.getDay()) % 7;
    tuesday.setDate(tuesday.getDate() + daysUntilTuesday);
    return tuesday;
  } else if (text.includes('wednesday')) {
    const wednesday = new Date(now);
    const daysUntilWednesday = (10 - now.getDay()) % 7;
    wednesday.setDate(wednesday.getDate() + daysUntilWednesday);
    return wednesday;
  } else if (text.includes('thursday')) {
    const thursday = new Date(now);
    const daysUntilThursday = (11 - now.getDay()) % 7;
    thursday.setDate(thursday.getDate() + daysUntilThursday);
    return thursday;
  } else if (text.includes('saturday')) {
    const saturday = new Date(now);
    const daysUntilSaturday = (13 - now.getDay()) % 7;
    saturday.setDate(saturday.getDate() + daysUntilSaturday);
    return saturday;
  } else if (text.includes('sunday')) {
    const sunday = new Date(now);
    const daysUntilSunday = (14 - now.getDay()) % 7;
    sunday.setDate(sunday.getDate() + daysUntilSunday);
    return sunday;
  } else if (text.includes('next month')) {
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth;
  } else if (text.includes('next friday')) {
    const nextFriday = new Date(now);
    const daysUntilFriday = 5 - now.getDay();
    nextFriday.setDate(nextFriday.getDate() + (daysUntilFriday <= 0 ? 7 + daysUntilFriday : daysUntilFriday));
    return nextFriday;
  } else if (text.includes('in') && text.includes('days')) {
    // Handle "in 3 days", "in 5 days", etc.
    const daysMatch = text.match(/in\s+(\d+)\s+days?/i);
    if (daysMatch) {
      const days = parseInt(daysMatch[1]);
      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + days);
      return futureDate;
    }
  } else if (text.includes('in') && text.includes('week')) {
    // Handle "in 1 week", "in 2 weeks", etc.
    const weeksMatch = text.match(/in\s+(\d+)\s+weeks?/i);
    if (weeksMatch) {
      const weeks = parseInt(weeksMatch[1]);
      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + (weeks * 7));
      return futureDate;
    }
  } else if (text.includes('end of month')) {
    // End of current month
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return endOfMonth;
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
  
  // Handle simple date formats like "12/25", "25-12", etc.
  const simpleDatePattern = /(\d{1,2})[\/\-](\d{1,2})/;
  const simpleMatch = text.match(simpleDatePattern);
  if (simpleMatch) {
    const first = parseInt(simpleMatch[1]);
    const second = parseInt(simpleMatch[2]);
    
    // Assume MM/DD format if first number > 12, otherwise DD/MM
    let month, day;
    if (first > 12) {
      day = first;
      month = second - 1; // Month is 0-indexed
    } else if (second > 12) {
      month = first - 1;
      day = second;
    } else {
      // Ambiguous, assume MM/DD for US format
      month = first - 1;
      day = second;
    }
    
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const year = now.getFullYear();
      const targetDate = new Date(year, month, day);
      
      // If the date is in the past, assume next year
      if (targetDate < now) {
        targetDate.setFullYear(year + 1);
      }
      
      return targetDate;
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
 * Calculate confidence score for task extraction
 */
function calculateConfidence(fullMessage, actionText, patternIndex) {
  let confidence = 0.5; // Base confidence
  
  // Higher confidence for direct assignments (patterns 0-4)
  if (patternIndex <= 4) {
    confidence += 0.2;
  }
  
  // Increase confidence for specific keywords
  const actionVerbs = ['please', 'can you', 'need to', 'should', 'must', 'responsible', 'assigned', 'handle'];
  const hasActionVerb = actionVerbs.some(verb => fullMessage.toLowerCase().includes(verb));
  if (hasActionVerb) confidence += 0.2;
  
  // Increase confidence for time mentions
  const timeKeywords = ['by', 'until', 'deadline', 'tomorrow', 'friday', 'next week', 'today'];
  const hasTimeReference = timeKeywords.some(keyword => actionText.toLowerCase().includes(keyword));
  if (hasTimeReference) confidence += 0.2;
  
  // Increase confidence for clear assignment language
  const assignmentKeywords = ['assigned', 'responsible', 'owner', 'please', 'can you', 'action item'];
  const hasAssignment = assignmentKeywords.some(keyword => fullMessage.toLowerCase().includes(keyword));
  if (hasAssignment) confidence += 0.1;
  
  return Math.min(confidence, 1.0);
}

/**
 * Remove duplicate and similar tasks
 */
function deduplicateTasks(tasks) {
  const uniqueTasks = [];
  
  tasks.forEach(task => {
    const similar = uniqueTasks.find(existing => 
      (existing.assignedTo === task.assignedTo && 
       (similarity(existing.title, task.title) > 0.8 ||
        similarity(existing.description, task.description) > 0.7))
    );
    
    if (!similar) {
      uniqueTasks.push(task);
    } else if (task.confidence > similar.confidence) {
      // Replace with higher confidence task
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
 * Create task assignments from chat message
 * @param {string} chatId - The chat ID
 * @param {string} message - The chat message content
 * @param {object} sender - The message sender
 * @param {Array} participants - Array of chat participants
 * @param {object} session - User session for authentication
 * @returns {Promise<Object>} Object with created tasks and processing results
 */
export async function createTasksFromChatMessage(chatId, message, sender, participants, session) {
  try {
    console.log('🚀 createTasksFromChatMessage called with:', { chatId, message, sender, participants });
    
    const extractedTasks = extractTasksFromChatMessage(message, sender, participants);
    
    console.log('📝 Extracted tasks before database save:', extractedTasks);
    
    if (extractedTasks.length === 0) {
      console.log('ℹ️ No tasks extracted from chat message, returning empty result');
      return { createdTasks: [], extractedTasks: [], errors: [] };
    }

    // Import database connection and Task model dynamically
    const connectDB = (await import('@/lib/mongodb')).default;
    const Task = (await import('@/models/Task')).default;
    const User = (await import('@/models/User')).default;
    const Company = (await import('@/models/Company')).default;
    
    console.log('📤 Saving chat tasks to database...');
    
    await connectDB();

    const createdTasks = [];
    const errors = [];

    // Process each extracted task
    for (const taskData of extractedTasks) {
      try {
        console.log('💾 Processing chat task:', taskData);

        // First, verify if the assigned user exists in the system before creating the task
        const assigneeUser = await User.findById(taskData.assignedTo);
        if (!assigneeUser && taskData.assignedTo !== (session ? session.user.id : sender._id)) {
          console.log('❌ Assignee user not found in database:', taskData.assignedToName);
          errors.push({
            taskTitle: taskData.title,
            assignedToName: taskData.assignedToName,
            reason: 'User not found in the system',
            type: 'user_not_found'
          });
          continue; // Skip this task
        }

        // Get sender information for seniority validation
        const senderUser = session ? await User.findById(session.user.id) : await User.findById(sender._id);
        if (!senderUser) {
          console.log('❌ Sender user not found');
          errors.push({
            taskTitle: taskData.title,
            assignedToName: taskData.assignedToName,
            reason: 'Sender not found in the system',
            type: 'sender_not_found'
          });
          continue; // Skip this task
        }

        // Get company information for seniority levels
        const company = await Company.findById(senderUser.company);
        if (!company) {
          console.log('❌ Could not find company for seniority validation');
          errors.push({
            taskTitle: taskData.title,
            assignedToName: taskData.assignedToName,
            reason: 'Company not found',
            type: 'company_not_found'
          });
          continue; // Skip this task
        }

        // Find sender and assignee company members
        const senderMember = company.members.find(m => m.user.toString() === senderUser._id.toString());
        const assigneeMember = company.members.find(m => m.user.toString() === assigneeUser._id.toString());

        if (!senderMember || !assigneeMember) {
          console.log('❌ Sender or assignee not found in company members');
          errors.push({
            taskTitle: taskData.title,
            assignedToName: taskData.assignedToName,
            reason: 'User not a member of the company',
            type: 'not_company_member'
          });
          continue; // Skip this task
        }

        // Check seniority levels - only users with higher seniority can assign tasks to users with lower seniority
        const isOwner = company.owner.toString() === senderUser._id.toString();
        
        if (!isOwner && senderUser._id.toString() !== assigneeUser._id.toString()) { // Allow self-assignment
          const senderRole = company.roles.find(r => r.name === senderMember.role);
          const assigneeRole = company.roles.find(r => r.name === assigneeMember.role);

          if (senderRole && assigneeRole) {
            // Set default seniority levels - Owner should have level 1 (highest)
            const senderSeniority = senderRole.name === 'Owner' ? 1 : (senderRole.seniorityLevel || 10);
            const assigneeSeniority = assigneeRole.name === 'Owner' ? 1 : (assigneeRole.seniorityLevel || 10);

            // Check if sender has higher seniority level (lower number means higher seniority)
            if (senderSeniority >= assigneeSeniority) {
              console.log(`❌ Seniority check failed: Sender level ${senderSeniority} cannot assign to level ${assigneeSeniority}`);
              errors.push({
                taskTitle: taskData.title,
                assignedToName: taskData.assignedToName,
                reason: `Insufficient seniority level to assign tasks to ${assigneeUser.name}`,
                type: 'insufficient_seniority'
              });
              continue; // Skip this task - don't create it or notify
            }
          }
        }

        const task = new Task({
          title: taskData.title,
          description: taskData.description,
          assignedTo: taskData.assignedTo,
          assignedBy: taskData.assignedBy || (session ? session.user.id : sender._id),
          company: session ? session.user.company : sender.company,
          priority: taskData.priority || 'medium',
          status: taskData.status || 'pending',
          dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
          source: 'chat_message',
          sourceMetadata: {
            chatId: chatId,
            context: taskData.context,
            confidence: taskData.confidence,
            extractedAt: taskData.extractedAt
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });

        const savedTask = await task.save();
        console.log('✅ Chat task saved:', savedTask._id);

        // Populate the assigned user information
        await savedTask.populate('assignedTo', 'name email');
        await savedTask.populate('assignedBy', 'name email');

        createdTasks.push({
          id: savedTask._id,
          title: savedTask.title,
          description: savedTask.description,
          assignedTo: savedTask.assignedTo,
          assignedBy: savedTask.assignedBy,
          priority: savedTask.priority,
          status: savedTask.status,
          dueDate: savedTask.dueDate,
          source: savedTask.source,
          createdAt: savedTask.createdAt
        });

      } catch (taskError) {
        console.error('❌ Error creating individual chat task:', taskError);
        errors.push({
          taskTitle: taskData.title || 'Unknown task',
          assignedToName: taskData.assignedToName || 'Unknown user',
          reason: taskError.message || 'Database error',
          type: 'database_error'
        });
        // Continue with other tasks even if one fails
      }
    }

    console.log('🎉 Chat tasks creation completed. Created:', createdTasks.length, 'Errors:', errors.length);
    return { 
      createdTasks, 
      extractedTasks, 
      errors,
      totalExtracted: extractedTasks.length,
      totalCreated: createdTasks.length 
    };
    
  } catch (error) {
    console.error('❌ Error creating tasks from chat message:', error);
    return { 
      createdTasks: [], 
      extractedTasks: [], 
      errors: [{ reason: error.message, type: 'system_error' }] 
    };
  }
}
