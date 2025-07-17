import mongoose from 'mongoose';

const resultSchema = new mongoose.Schema({
  examId: {
    type: String,
    required: true,
    ref: 'Exam',
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Student',
  },
  answers: [{
    question: Number,
    answer: String, // A, B, C, D, E, or 'BLANK'
  }],
  score: {
    type: Number,
    required: true,
    min: 0,
  },
  totalMarks: {
    type: Number,
    required: true,
  },
  percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  result: {
    type: String,
    required: true,
    enum: ['Pass', 'Fail'],
  },
  processedAt: {
    type: Date,
    default: Date.now,
  },
});

resultSchema.index({ examId: 1, studentId: 1 }, { unique: true });

export default mongoose.model('Result', resultSchema);