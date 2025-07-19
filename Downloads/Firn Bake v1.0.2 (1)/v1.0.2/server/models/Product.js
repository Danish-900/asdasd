import mongoose from 'mongoose'

const productSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  batchId: {
    type: String,
    required: true,
    trim: true
  },
  batchQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  batchPrice: {
    type: Number,
    required: true,
    min: 0
  },
  batchDiscount: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  brand: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  minStock: {
    type: Number,
    required: true,
    min: 0
  },
  price: {
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
  supplier: {
    type: String,
    required: true,
    trim: true
  },
  distributor: {
    type: String,
    trim: true
  },
  warehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  discount: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  isRawMaterial: {
    type: Boolean,
    default: false
  },
  discountReason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
})

export default mongoose.model('Product', productSchema)