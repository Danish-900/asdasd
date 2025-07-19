import express from 'express'
import Employee from '../models/Employee.js'
import Attendance from '../models/Attendance.js'

const router = express.Router()

// Employee routes
router.get('/employees', async (req, res) => {
  try {
    const employees = await Employee.find().sort({ createdAt: -1 })
    res.json(employees)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/employees', async (req, res) => {
  try {
    const employee = new Employee(req.body)
    await employee.save()
    res.status(201).json(employee)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

router.put('/employees/:id', async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' })
    }
    res.json(employee)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

router.delete('/employees/:id', async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id)
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' })
    }
    res.json({ message: 'Employee deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Attendance routes
router.get('/attendance', async (req, res) => {
  try {
    const attendance = await Attendance.find()
      .populate('employee', 'name position')
      .sort({ date: -1 })
    res.json(attendance)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/attendance', async (req, res) => {
  try {
    const attendance = new Attendance(req.body)
    await attendance.save()
    await attendance.populate('employee', 'name position')
    res.status(201).json(attendance)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

export default router