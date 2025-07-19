import mongoose from 'mongoose'

const qualityRecordSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true,
    trim: true
  },
  productName: {
    type: String,
    required: true,
    trim: true
  },
  batchNumber: {
    type: String,
    required: true,
    trim: true
  },
  totalQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  goodQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  defectiveQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  defectType: {
    type: String,
    trim: true
  },
  inspectionDate: {
    type: Date,
    required: true
  },
  inspector: {
    type: String,
    required: true,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
})

export default mongoose.model('QualityRecord', qualityRecordSchema)