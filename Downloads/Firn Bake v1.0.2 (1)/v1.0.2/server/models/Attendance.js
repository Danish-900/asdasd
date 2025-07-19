import mongoose from 'mongoose'

const attendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['present', 'absent', 'late']
  },
  hoursWorked: {
    type: Number,
    min: 0,
    max: 24,
    default: 8
  }
}, {
  timestamps: true
})

// Ensure one attendance record per employee per day
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true })

export default mongoose.model('Attendance', attendanceSchema)