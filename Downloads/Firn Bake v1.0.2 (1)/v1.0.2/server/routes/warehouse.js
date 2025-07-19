import express from 'express'
import Warehouse from '../models/Warehouse.js'

const router = express.Router()

// Get all warehouses
router.get('/', async (req, res) => {
  try {
    const warehouses = await Warehouse.find().sort({ createdAt: -1 })
    res.json(warehouses)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create new warehouse
router.post('/', async (req, res) => {
  try {
    const warehouse = new Warehouse(req.body)
    await warehouse.save()
    res.status(201).json(warehouse)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Update warehouse
router.put('/:id', async (req, res) => {
  try {
    const warehouse = await Warehouse.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    if (!warehouse) {
      return res.status(404).json({ error: 'Warehouse not found' })
    }
    res.json(warehouse)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Delete warehouse
router.delete('/:id', async (req, res) => {
  try {
    const warehouse = await Warehouse.findByIdAndDelete(req.params.id)
    if (!warehouse) {
      return res.status(404).json({ error: 'Warehouse not found' })
    }
    res.json({ message: 'Warehouse deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router