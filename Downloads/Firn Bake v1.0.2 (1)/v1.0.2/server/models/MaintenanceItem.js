import mongoose from 'mongoose'

const maintenanceItemSchema = new mongoose.Schema({
  equipmentName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  maintenanceType: {
    type: String,
    required: true,
    enum: ['preventive', 'corrective', 'emergency']
  },
  frequency: {
    type: String,
    required: true,
    enum: ['weekly', 'monthly', 'quarterly', 'annually']
  },
  lastMaintenance: {
    type: Date
  },
  nextMaintenance: {
    type: Date
  },
  assignedTo: {
    type: String,
    trim: true
  },
  priority: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'in-progress', 'completed'],
    default: 'pending'
  },
  cost: {
    type: Number,
    min: 0,
    default: 0
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
})

export default mongoose.model('MaintenanceItem', maintenanceItemSchema)