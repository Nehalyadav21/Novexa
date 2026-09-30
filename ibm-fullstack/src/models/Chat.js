import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Message content is required']
  },
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: [true, 'Message role is required']
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: Object,
    default: {}
  }
});

const goalSchema = new mongoose.Schema({
  goal_id: {
    type: String,
    required: true,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'paused'],
    default: 'in_progress'
  },
  progress: [{
    timestamp: { type: Date, default: Date.now },
    note: String
  }],
  created_at: {
    type: Date,
    default: Date.now
  }
});

const chatSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required']
  },
  title: {
    type: String,
    default: 'New Chat'
  },
  messages: [messageSchema],
  personality: {
    type: String,
    enum: ['friendly', 'formal', 'mentor', 'fun', 'professional'],
    default: 'friendly'
  },
  goals: [goalSchema],
  context: {
    type: String,
    default: ''
  },
  analytics: {
    total_messages: { type: Number, default: 0 },
    avg_response_time: { type: Number, default: 0 },
    last_activity: { type: Date, default: Date.now }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Delete old model if it exists (helpful during development)
mongoose.models = {};

const Chat = mongoose.model('Chat', chatSchema);
export default Chat;
