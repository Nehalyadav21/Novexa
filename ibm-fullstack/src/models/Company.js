import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Role name is required']
  },
  description: String,
  seniorityLevel: {
    type: Number,
    default: 10,
    min: 1,
    max: 10
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const memberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required']
  },
  role: {
    type: String,
    required: [true, 'Role is required']
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
});

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Company name is required'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Company description is required']
  },
  password: {
    type: String,
    required: [true, 'Company password is required']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner is required']
  },
  roles: [roleSchema],
  members: [memberSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Delete the old model if it exists (helpful during development)
mongoose.models = {};

const Company = mongoose.model('Company', companySchema);
export default Company;
