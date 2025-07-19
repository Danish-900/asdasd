import express from 'express'
import MaintenanceMode from '../models/MaintenanceMode.js'
import { 
  sendMaintenanceStartEmail, 
  sendMaintenanceEndEmail,
  scheduleMaintenanceReminder,
  cancelMaintenanceReminder,
  testEmailConfiguration
} from '../utils/mailer.js'

const router = express.Router()

// Global variable to store scheduled job
let scheduledReminderJob = null

// Get current maintenance mode status
router.get('/status', async (req, res) => {
  try {
    const maintenanceMode = await MaintenanceMode.findOne({ isActive: true })
    res.json({
      isActive: !!maintenanceMode,
      data: maintenanceMode
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Activate maintenance mode
router.post('/activate', async (req, res) => {
  try {
    const { reason, estimatedDuration, endTime, createdBy } = req.body

    // Check if maintenance mode is already active
    const existingMaintenance = await MaintenanceMode.findOne({ isActive: true })
    if (existingMaintenance) {
      return res.status(400).json({ error: 'Maintenance mode is already active' })
    }

    // Create new maintenance mode record
    const maintenanceMode = new MaintenanceMode({
      isActive: true,
      startTime: new Date(),
      endTime: endTime ? new Date(endTime) : null,
      reason: reason || 'Scheduled maintenance',
      estimatedDuration: estimatedDuration || 'Unknown',
      createdBy: createdBy || 'System Administrator'
    })

    await maintenanceMode.save()

    // Send immediate notification email
    try {
      const emailResult = await sendMaintenanceStartEmail(endTime)
      if (emailResult.success) {
        maintenanceMode.emailsSent.startNotification = true
        console.log('Maintenance start email sent successfully')
      } else {
        console.error('Failed to send maintenance start email:', emailResult.error)
      }
    } catch (emailError) {
      console.error('Error sending maintenance start email:', emailError)
    }

    // Schedule reminder email if end time is provided
    if (endTime) {
      try {
        scheduledReminderJob = scheduleMaintenanceReminder(endTime)
        if (scheduledReminderJob) {
          maintenanceMode.emailsSent.reminderScheduled = true
          maintenanceMode.scheduledJobId = scheduledReminderJob.name || 'scheduled'
          console.log('Maintenance reminder scheduled successfully')
        }
      } catch (scheduleError) {
        console.error('Error scheduling maintenance reminder:', scheduleError)
      }
    }

    await maintenanceMode.save()

    res.status(201).json({
      message: 'Maintenance mode activated successfully',
      data: maintenanceMode,
      emailNotification: maintenanceMode.emailsSent.startNotification ? 'sent' : 'failed',
      reminderScheduled: maintenanceMode.emailsSent.reminderScheduled
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Deactivate maintenance mode
router.post('/deactivate', async (req, res) => {
  try {
    const maintenanceMode = await MaintenanceMode.findOne({ isActive: true })
    
    if (!maintenanceMode) {
      return res.status(400).json({ error: 'No active maintenance mode found' })
    }

    // Cancel scheduled reminder if exists
    if (scheduledReminderJob) {
      cancelMaintenanceReminder(scheduledReminderJob)
      scheduledReminderJob = null
    }

    // Update maintenance mode record
    maintenanceMode.isActive = false
    maintenanceMode.endTime = new Date()

    // Send maintenance end notification
    try {
      const emailResult = await sendMaintenanceEndEmail()
      if (emailResult.success) {
        maintenanceMode.emailsSent.endNotification = true
        console.log('Maintenance end email sent successfully')
      } else {
        console.error('Failed to send maintenance end email:', emailResult.error)
      }
    } catch (emailError) {
      console.error('Error sending maintenance end email:', emailError)
    }

    await maintenanceMode.save()

    res.json({
      message: 'Maintenance mode deactivated successfully',
      data: maintenanceMode,
      emailNotification: maintenanceMode.emailsSent.endNotification ? 'sent' : 'failed'
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get maintenance mode history
router.get('/history', async (req, res) => {
  try {
    const history = await MaintenanceMode.find()
      .sort({ createdAt: -1 })
      .limit(10)
    res.json(history)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Test email configuration
router.post('/test-email', async (req, res) => {
  try {
    const result = await testEmailConfiguration()
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Update maintenance mode (extend time, change reason, etc.)
router.put('/update', async (req, res) => {
  try {
    const { endTime, reason, estimatedDuration } = req.body
    
    const maintenanceMode = await MaintenanceMode.findOne({ isActive: true })
    if (!maintenanceMode) {
      return res.status(400).json({ error: 'No active maintenance mode found' })
    }

    // Update fields if provided
    if (endTime) {
      maintenanceMode.endTime = new Date(endTime)
      
      // Cancel existing reminder and schedule new one
      if (scheduledReminderJob) {
        cancelMaintenanceReminder(scheduledReminderJob)
      }
      
      scheduledReminderJob = scheduleMaintenanceReminder(endTime)
      if (scheduledReminderJob) {
        maintenanceMode.emailsSent.reminderScheduled = true
        maintenanceMode.scheduledJobId = scheduledReminderJob.name || 'rescheduled'
      }
    }
    
    if (reason) maintenanceMode.reason = reason
    if (estimatedDuration) maintenanceMode.estimatedDuration = estimatedDuration

    await maintenanceMode.save()

    res.json({
      message: 'Maintenance mode updated successfully',
      data: maintenanceMode
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router