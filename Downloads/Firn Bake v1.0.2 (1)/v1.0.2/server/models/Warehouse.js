import mongoose from 'mongoose'

const warehouseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  capacity: {
    type: Number,
    required: true,
    min: 0
  },
  currentStock: {
    type: Number,
    required: true,
    min: 0
  },
  defectiveItems: {
    type: Number,
    default: 0,
    min: 0
  },
  manager: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  type: {
    type: String,
    required: true,
    enum: ['storage', 'distribution', 'manufacturing']
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  }
}, {
  timestamps: true
})

export default mongoose.model('Warehouse', warehouseSchema)