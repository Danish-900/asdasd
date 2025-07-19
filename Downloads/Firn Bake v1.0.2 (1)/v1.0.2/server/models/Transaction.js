import mongoose from 'mongoose'

const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['income', 'expense']
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'PKR',
    enum: ['PKR', 'USD'],
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  productId: {
    type: String,
    trim: true
  },
  quantity: {
    type: Number,
    min: 0
  },
  purchaseOrder: {
    type: String,
    trim: true
  },
  supplier: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'completed'
  },
  batchId: {
    type: String,
    trim: true
  },
  dispatchType: {
    type: String,
    enum: ['dispatch', 'payment'],
    trim: true
  },
  invoiceNumber: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
})

export default mongoose.model('Transaction', transactionSchema)