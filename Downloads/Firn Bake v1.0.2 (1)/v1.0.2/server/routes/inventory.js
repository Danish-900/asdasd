import express from 'express'
import Product from '../models/Product.js'

const router = express.Router()

// Get all products
router.get('/', async (req, res) => {
  try {
    const { type } = req.query
    let query = {}
    
    if (type === 'raw') {
      query.isRawMaterial = true
    } else if (type === 'finished') {
      query.isRawMaterial = false
    }
    
    const products = await Product.find(query).sort({ createdAt: -1 })
    res.json(products)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create new product
router.post('/', async (req, res) => {
  try {
    const productData = {
      ...req.body,
      batchId: `BATCH-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      currency: req.body.currency || 'PKR' // Default to PKR if not specified
    }
    const product = new Product(productData)
    await product.save()
    res.status(201).json(product)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Update product
router.put('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }
    res.json(product)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Delete product
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id)
    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }
    res.json({ message: 'Product deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router