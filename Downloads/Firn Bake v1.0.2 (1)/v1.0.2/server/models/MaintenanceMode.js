import mongoose from 'mongoose'

const maintenanceModeSchema = new mongoose.Schema({
  isActive: {
    type: Boolean,
    default: false
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  reason: {
    type: String,
    trim: true
  },
  estimatedDuration: {
    type: String,
    trim: true
  },
  createdBy: {
    type: String,
    required: true,
    trim: true
  },
  emailsSent: {
    startNotification: {
      type: Boolean,
      default: false
    },
    reminderScheduled: {
      type: Boolean,
      default: false
    },
    endNotification: {
      type: Boolean,
      default: false
    }
  },
  scheduledJobId: {
    type: String
  }
}, {
  timestamps: true
})

// Ensure only one active maintenance mode at a time
maintenanceModeSchema.index({ isActive: 1 }, { 
  unique: true, 
  partialFilterExpression: { isActive: true } 
})

export default mongoose.model('MaintenanceMode', maintenanceModeSchema)