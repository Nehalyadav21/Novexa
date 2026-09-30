import mongoose from 'mongoose';

const teamInviteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  invitedAt: {
    type: Date,
    default: Date.now
  },
  respondedAt: Date
});

const teamMemberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
});

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Team name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company reference is required']
  },
  teamLead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Team lead is required']
  },
  members: [teamMemberSchema],
  invites: [teamInviteSchema],
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatNew'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
teamSchema.index({ company: 1, teamLead: 1 });
teamSchema.index({ 'members.user': 1 });
teamSchema.index({ 'invites.user': 1, 'invites.status': 1 });

export default mongoose.models.Team || mongoose.model('Team', teamSchema);
