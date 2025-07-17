// Exam.js
import mongoose from 'mongoose';

const examSchema = new mongoose.Schema({
  examId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  dateTime: {
    type: Date,
    required: true,
  },
  numQuestions: {
    type: Number,
    required: true,
    min: 1,
    max: 200,
  },
  marksPerMcq: {
    type: Number,
    required: true,
    min: 0.5,
  },
  passingPercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  wing: {
    type: String,
    required: true,
    trim: true,
  },
  course: {
    type: String,
    required: true,
    trim: true,
  },
  module: {
    type: String,
    required: true,
    trim: true,
  },
  sponsorDS: {
    type: String,
    required: true,
    trim: true,
  },
  instructions: {
    type: String,
    default: '',
  },
  answerKey: {
    type: [String],
    required: false,
    validate: {
      validator: function (arr) {
        // Allow empty array or undefined
        if (!arr || arr.length === 0) return true;
        // Validate array length and contents when provided
        return arr.length === this.numQuestions && 
               arr.every(answer => ['A', 'B', 'C', 'D', 'E'].includes(answer));
      },
      message: 'Answer key must match number of questions and contain valid options (A-E)',
    },
  },
  studentsUploaded: {
    type: Boolean,
    default: false,
  },
  solutionUploaded: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: String,
    default: 'System',
  },
});

export default mongoose.model('Exam', examSchema);