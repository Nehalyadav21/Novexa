import mongoose from 'mongoose';

const taskProofSchema = new mongoose.Schema({
  description: {
    type: String,
    required: [true, 'Proof description is required']
  },
  fileUrl: String, // URL to uploaded file (PDF, image, etc.)
  fileName: String,
  fileType: String,
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required']
  },
  description: {
    type: String,
    required: [true, 'Task description is required']
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedToName: String, // For meeting-generated tasks where we might not have ObjectId
  assignedToTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  assignedToRole: String, // Role of the assigned user
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  deadline: Date, // Made optional for meeting-generated tasks
  dueDate: Date, // Alternative field name for meeting tasks
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'overdue'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  source: {
    type: String,
    enum: ['manual', 'meeting_transcript', 'imported', 'chat_message'],
    default: 'manual'
  },
  sourceMetadata: {
    meetingId: String,
    chatId: String,
    context: String,
    confidence: Number,
    extractedAt: Date
  },
  proof: taskProofSchema,
  completedAt: Date,
  notes: String
}, {
  timestamps: true
});

// Indexes for better performance
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ assignedBy: 1, createdAt: -1 });
taskSchema.index({ company: 1, deadline: 1 });

export default mongoose.models.Task || mongoose.model('Task', taskSchema);
