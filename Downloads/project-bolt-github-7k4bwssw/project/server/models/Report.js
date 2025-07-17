import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  examId: {
    type: String,
    required: true,
    ref: 'Exam',
  },
  reportType: {
    type: String,
    required: true,
    enum: ['Excel', 'PDF'],
  },
  data: {
    totalStudents: Number,
    averageScore: Number,
    highestScore: Number,
    lowestScore: Number,
    passingRate: Number,
    questionAnalysis: [{
      questionNumber: Number,
      correctPercentage: Number,
      difficulty: String,
      commonWrongAnswer: String,
    }],
    scoreDistribution: [{
      range: String,
      count: Number,
      percentage: Number,
    }],
  },
  filePath: String,
  generatedAt: {
    type: Date,
    default: Date.now,
  },
  generatedBy: {
    type: String,
    default: 'System',
  },
});

export default mongoose.model('Report', reportSchema);