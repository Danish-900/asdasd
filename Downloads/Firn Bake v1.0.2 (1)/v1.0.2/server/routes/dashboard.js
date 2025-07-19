import express from 'express'
import Product from '../models/Product.js'
import Employee from '../models/Employee.js'
import Attendance from '../models/Attendance.js'
import QualityRecord from '../models/QualityRecord.js'
import MaintenanceItem from '../models/MaintenanceItem.js'

const router = express.Router()

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    // Inventory stats
    const totalProducts = await Product.countDocuments()
    const lowStockProducts = await Product.countDocuments({
      $expr: { $lte: ['$quantity', '$minStock'] }
    })

    // Employee stats
    const totalEmployees = await Employee.countDocuments({ status: 'active' })
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const presentToday = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow },
      status: 'present'
    })

    // Quality stats
    const qualityRecords = await QualityRecord.find()
    const totalGood = qualityRecords.reduce((sum, record) => sum + record.goodQuantity, 0)
    const totalBad = qualityRecords.reduce((sum, record) => sum + record.defectiveQuantity, 0)

    // Maintenance stats
    const pendingMaintenance = await MaintenanceItem.countDocuments({ status: 'pending' })
    const overdueMaintenance = await MaintenanceItem.countDocuments({
      nextMaintenance: { $lt: new Date() },
      status: { $ne: 'completed' }
    })

    res.json({
      inventory: {
        total: totalProducts,
        lowStock: lowStockProducts
      },
      employees: {
        total: totalEmployees,
        present: presentToday
      },
      quality: {
        goodProducts: totalGood,
        badProducts: totalBad
      },
      maintenance: {
        pending: pendingMaintenance,
        overdue: overdueMaintenance
      }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router