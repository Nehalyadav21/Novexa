import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required']
  },
  type: {
    type: String,
    enum: [
      'company_join', 
      'team_invite', 
      'team_deleted',
      'chat_message', 
      'task_assigned', 
      'meeting_invite',
      'meeting_invite_live',
      'meeting_started',
      'meeting_ended'
    ],
    required: [true, 'Notification type is required']
  },
  title: {
    type: String,
    required: [true, 'Notification title is required']
  },
  message: {
    type: String,
    required: [true, 'Notification message is required']
  },
  read: {
    type: Boolean,
    default: false
  },
  actionUrl: String, // URL to redirect when clicked
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better performance
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ user: 1, type: 1 });

export default mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
