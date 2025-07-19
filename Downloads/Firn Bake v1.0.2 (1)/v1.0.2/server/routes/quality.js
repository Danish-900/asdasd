import express from 'express'
import QualityRecord from '../models/QualityRecord.js'

const router = express.Router()

// Get all quality records
router.get('/', async (req, res) => {
  try {
    const records = await QualityRecord.find().sort({ inspectionDate: -1 })
    res.json(records)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create new quality record
router.post('/', async (req, res) => {
  try {
    const record = new QualityRecord(req.body)
    await record.save()
    res.status(201).json(record)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Update quality record
router.put('/:id', async (req, res) => {
  try {
    const record = await QualityRecord.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    if (!record) {
      return res.status(404).json({ error: 'Quality record not found' })
    }
    res.json(record)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Delete quality record
router.delete('/:id', async (req, res) => {
  try {
    const record = await QualityRecord.findByIdAndDelete(req.params.id)
    if (!record) {
      return res.status(404).json({ error: 'Quality record not found' })
    }
    res.json({ message: 'Quality record deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router