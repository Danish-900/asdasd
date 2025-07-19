import express from 'express'
import MaintenanceItem from '../models/MaintenanceItem.js'

const router = express.Router()

// Get all maintenance items
router.get('/', async (req, res) => {
  try {
    const items = await MaintenanceItem.find().sort({ nextMaintenance: 1 })
    res.json(items)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create new maintenance item
router.post('/', async (req, res) => {
  try {
    const item = new MaintenanceItem(req.body)
    await item.save()
    res.status(201).json(item)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Update maintenance item
router.put('/:id', async (req, res) => {
  try {
    const item = await MaintenanceItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    if (!item) {
      return res.status(404).json({ error: 'Maintenance item not found' })
    }
    res.json(item)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Delete maintenance item
router.delete('/:id', async (req, res) => {
  try {
    const item = await MaintenanceItem.findByIdAndDelete(req.params.id)
    if (!item) {
      return res.status(404).json({ error: 'Maintenance item not found' })
    }
    res.json({ message: 'Maintenance item deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router