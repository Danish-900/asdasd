import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
  examId: {
    type: String,
    required: true,
    ref: 'Exam',
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  lockerNumber: {
    type: String,
    required: true,
    trim: true,
  },
  rank: {
    type: String,
    required: true,
    trim: true,
  },
  copyNumber: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

studentSchema.index({ examId: 1, lockerNumber: 1 }, { unique: true });

export default mongoose.model('Student', studentSchema);