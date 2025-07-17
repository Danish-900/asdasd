import mongoose from 'mongoose';

const responseSchema = new mongoose.Schema({
  examId: {
    type: String,
    required: true,
    ref: 'Exam',
  },
  studentId: {
    type: String,
    required: true,
  },
  responses: {
    type: [String],
    required: true,
    validate: {
      validator: function(arr) {
        return arr.every(response => 
          ['A', 'B', 'C', 'D', 'E', 'BLANK', 'MULTIPLE'].includes(response)
        );
      },
      message: 'Responses must contain valid options (A-E, BLANK, MULTIPLE)',
    },
  },
  score: {
    type: Number,
    required: true,
    min: 0,
  },
  accuracy: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  correctAnswers: {
    type: Number,
    required: true,
    min: 0,
  },
  incorrectAnswers: {
    type: Number,
    required: true,
    min: 0,
  },
  blankAnswers: {
    type: Number,
    default: 0,
  },
  multipleMarks: {
    type: Number,
    default: 0,
  },
  processingMetadata: {
    imageQuality: Number,
    processingTime: Number,
    confidence: Number,
  },
  processedAt: {
    type: Date,
    default: Date.now,
  },
});

responseSchema.index({ examId: 1, studentId: 1 }, { unique: true });

export default mongoose.model('Response', responseSchema);