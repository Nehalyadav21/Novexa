import mongoose from 'mongoose';

const transcriptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Allow null for anonymous users
  },
  userName: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  confidence: {
    type: Number,
    default: 0
  }
});

const participantSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['invited', 'accepted', 'declined', 'joined', 'left'],
    default: 'invited'
  },
  joinedAt: Date,
  leftAt: Date
});

const meetingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  hostName: {
    type: String,
    required: true
  },
  participants: [participantSchema],
  scheduledAt: {
    type: Date,
    required: true
  },
  startedAt: Date,
  endedAt: Date,
  status: {
    type: String,
    enum: ['scheduled', 'started', 'ended', 'cancelled'],
    default: 'scheduled'
  },
  meetingId: {
    type: String,
    unique: true,
    required: true
  },
  password: {
    type: String,
    required: false,
    trim: true
  },
  transcripts: [transcriptSchema],
  summary: {
    type: String
  },
  summaryGeneratedAt: Date,
  duration: Number, // in minutes
  recordingUrl: String,
  signalingData: [{
    type: String,
    fromUserId: String,
    toUserId: String,
    signal: mongoose.Schema.Types.Mixed,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  settings: {
    audioEnabled: {
      type: Boolean,
      default: true
    },
    videoEnabled: {
      type: Boolean,
      default: true
    },
    transcriptionEnabled: {
      type: Boolean,
      default: true
    },
    recordingEnabled: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
meetingSchema.index({ hostId: 1, createdAt: -1 });
meetingSchema.index({ 'participants.userId': 1 });
// meetingId already has unique: true, so no need for manual index
meetingSchema.index({ status: 1, scheduledAt: 1 });

// Virtual for meeting duration calculation
meetingSchema.virtual('actualDuration').get(function() {
  if (this.startedAt && this.endedAt) {
    return Math.round((this.endedAt - this.startedAt) / (1000 * 60)); // minutes
  }
  return 0;
});

// Method to add transcript
meetingSchema.methods.addTranscript = function(userId, userName, text, confidence = 0) {
  this.transcripts.push({
    userId,
    userName,
    text,
    confidence,
    timestamp: new Date()
  });
  return this.save();
};

// Method to generate summary
meetingSchema.methods.generateSummary = async function() {
  if (this.transcripts.length === 0) {
    return null;
  }

  try {
    // Prepare transcript text for summarization
    const transcriptText = this.transcripts
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(t => `${t.userName}: ${t.text}`)
      .join('\n');

    // Call WatsonX for summarization
    const response = await fetch('/api/meetings/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        meetingId: this._id,
        transcript: transcriptText,
        title: this.title
      })
    });

    if (response.ok) {
      const { summary } = await response.json();
      this.summary = summary;
      this.summaryGeneratedAt = new Date();
      await this.save();
      return summary;
    }
  } catch (error) {
    console.error('Failed to generate summary:', error);
  }
  return null;
};

export default mongoose.models.Meeting || mongoose.model('Meeting', meetingSchema);
