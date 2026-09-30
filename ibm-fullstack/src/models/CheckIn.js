import mongoose from 'mongoose';

const checkInSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required']
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company reference is required']
  },
  date: {
    type: Date,
    required: [true, 'Check-in date is required']
  },
  checkInTime: {
    type: Date,
    default: Date.now
  },
  location: String,
  notes: String,
  status: {
    type: String,
    enum: ['present', 'late', 'absent'],
    default: 'present'
  }
}, {
  timestamps: true
});

// Ensure one check-in per user per day
checkInSchema.index({ user: 1, date: 1 }, { unique: true });

export default mongoose.models.CheckIn || mongoose.model('CheckIn', checkInSchema);
