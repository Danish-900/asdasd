import mongoose from 'mongoose';

const solutionSchema = new mongoose.Schema({
  examId: {
    type: String,
    required: true,
    ref: 'Exam',
    unique: true,
  },
  solutions: [{
    question: {
      type: Number,
      required: true,
    },
    answer: {
      type: String,
      required: true,
      enum: ['A', 'B', 'C', 'D', 'E'],
    },
  }],
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Solution', solutionSchema);