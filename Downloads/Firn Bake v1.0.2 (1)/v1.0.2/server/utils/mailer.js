import nodemailer from 'nodemailer'
import schedule from 'node-schedule'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Get the directory name for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from the correct path
dotenv.config({ path: path.join(__dirname, '../.env') })

// Create transporter with SMTP configuration
const createTransporter = () => {
  console.log('SMTP Configuration:')
  console.log('Host:', process.env.SMTP_HOST)
  console.log('Port:', process.env.SMTP_PORT)
  console.log('User:', process.env.SMTP_USER)
  console.log('Secure: true')
  
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: true, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    debug: true, // Enable debug output
    logger: true // Log to console
  })
}

// Validate environment variables
const validateEmailConfig = () => {
  const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'MAINTENANCE_EMAIL_RECIPIENT']
  const missing = requiredVars.filter(varName => !process.env[varName])
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing)
    return false
  }
  
  if (process.env.SMTP_HOST !== 'smtp.gmail.com') {
    console.error('SMTP_HOST should be smtp.gmail.com, got:', process.env.SMTP_HOST)
    return false
  }
  
  if (process.env.SMTP_PORT !== '465') {
    console.error('SMTP_PORT should be 465 for Gmail, got:', process.env.SMTP_PORT)
    return false
  }
  
  return true
}

// Initialize email configuration validation
if (!validateEmailConfig()) {
  console.error('Email configuration validation failed!')
} else {
  console.log('Email configuration validated successfully')
}
    

// Send immediate maintenance notification
export const sendMaintenanceStartEmail = async (maintenanceEndTime) => {
  try {
    const transporter = createTransporter()
    
    const mailOptions = {
      from: `"FIRN Bakers" <${process.env.SMTP_USER}>`,
      to: process.env.MAINTENANCE_EMAIL_RECIPIENT,
      subject: '🚧 Site is now under maintenance',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #856404; margin: 0 0 10px 0;">🚧 Maintenance Mode Activated</h2>
            <p style="color: #856404; margin: 0;">The FIRN Bakers system is now under maintenance.</p>
          </div>
          
          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px;">
            <h3 style="color: #212529; margin: 0 0 15px 0;">Maintenance Details</h3>
            <ul style="color: #495057; margin: 0; padding-left: 20px;">
              <li><strong>Started:</strong> ${new Date().toLocaleString()}</li>
              ${maintenanceEndTime ? `<li><strong>Expected End:</strong> ${new Date(maintenanceEndTime).toLocaleString()}</li>` : ''}
              <li><strong>Status:</strong> System temporarily unavailable</li>
            </ul>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background-color: #e3f2fd; border-radius: 8px;">
            <p style="color: #1565c0; margin: 0; font-size: 14px;">
              <strong>Note:</strong> ${maintenanceEndTime ? 'You will receive a reminder email 24 hours before maintenance ends.' : 'No end time specified - manual notification required.'}
            </p>
          </div>
          
          <div style="margin-top: 20px; text-align: center; color: #6c757d; font-size: 12px;">
            <p>This is an automated message from FIRN Bakers</p>
          </div>
        </div>
      `
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('Maintenance start email sent:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Error sending maintenance start email:', error)
    return { success: false, error: error.message }
  }
}

// Send reminder email 24 hours before maintenance ends
export const sendMaintenanceReminderEmail = async (maintenanceEndTime) => {
  try {
    const transporter = createTransporter()
    
    const mailOptions = {
      from: `"FIRN Bakers" <${process.env.SMTP_USER}>`,
      to: process.env.MAINTENANCE_EMAIL_RECIPIENT,
      subject: '⏰ Reminder: Maintenance ends in 24 hours',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #856404; margin: 0 0 10px 0;">⏰ Maintenance Ending Soon</h2>
            <p style="color: #856404; margin: 0;">This is a reminder that maintenance will end in approximately 24 hours.</p>
          </div>
          
          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px;">
            <h3 style="color: #212529; margin: 0 0 15px 0;">Maintenance Schedule</h3>
            <ul style="color: #495057; margin: 0; padding-left: 20px;">
              <li><strong>Expected End:</strong> ${new Date(maintenanceEndTime).toLocaleString()}</li>
              <li><strong>Time Remaining:</strong> Approximately 24 hours</li>
              <li><strong>Current Status:</strong> Still under maintenance</li>
            </ul>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background-color: #d4edda; border-radius: 8px;">
            <p style="color: #155724; margin: 0; font-size: 14px;">
              <strong>Action Required:</strong> Please prepare for system restoration and ensure all maintenance tasks are completed on schedule.
            </p>
          </div>
          
          <div style="margin-top: 20px; text-align: center; color: #6c757d; font-size: 12px;">
            <p>This is an automated reminder from FIRN Bakers</p>
          </div>
        </div>
      `
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('Maintenance reminder email sent:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Error sending maintenance reminder email:', error)
    return { success: false, error: error.message }
  }
}

// Schedule maintenance reminder email
export const scheduleMaintenanceReminder = (maintenanceEndTime) => {
  if (!maintenanceEndTime) {
    console.log('No maintenance end time provided - skipping reminder scheduling')
    return null
  }

  const endTime = new Date(maintenanceEndTime)
  const reminderTime = new Date(endTime.getTime() - (24 * 60 * 60 * 1000)) // 24 hours before
  
  // Check if reminder time is in the future
  if (reminderTime <= new Date()) {
    console.log('Reminder time is in the past - skipping scheduling')
    return null
  }

  console.log(`Scheduling maintenance reminder for: ${reminderTime.toLocaleString()}`)
  
  const job = schedule.scheduleJob(reminderTime, async () => {
    console.log('Executing scheduled maintenance reminder...')
    await sendMaintenanceReminderEmail(maintenanceEndTime)
  })

  return job
}

// Cancel scheduled maintenance reminder
export const cancelMaintenanceReminder = (job) => {
  if (job) {
    job.cancel()
    console.log('Maintenance reminder job cancelled')
    return true
  }
  return false
}

// Test email configuration
export const testEmailConfiguration = async () => {
  try {
    const transporter = createTransporter()
    await transporter.verify()
    console.log('Email configuration is valid')
    return { success: true, message: 'Email configuration is valid' }
  } catch (error) {
    console.error('Email configuration error:', error)
    return { success: false, error: error.message }
  }
}

// Send maintenance end notification
export const sendMaintenanceEndEmail = async () => {
  try {
    const transporter = createTransporter()
    
    const mailOptions = {
      from: `"FIRN Bakers" <${process.env.SMTP_USER}>`,
      to: process.env.MAINTENANCE_EMAIL_RECIPIENT,
      subject: '✅ Maintenance completed - System restored',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #155724; margin: 0 0 10px 0;">✅ Maintenance Completed</h2>
            <p style="color: #155724; margin: 0;">The FIRN Bakers system maintenance has been completed and the system is now operational.</p>
          </div>
          
          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px;">
            <h3 style="color: #212529; margin: 0 0 15px 0;">System Status</h3>
            <ul style="color: #495057; margin: 0; padding-left: 20px;">
              <li><strong>Completed:</strong> ${new Date().toLocaleString()}</li>
              <li><strong>Status:</strong> System fully operational</li>
              <li><strong>Access:</strong> All users can now access the system</li>
            </ul>
          </div>
          
          <div style="margin-top: 20px; text-align: center; color: #6c757d; font-size: 12px;">
            <p>This is an automated notification from FIRN Bakers</p>
          </div>
        </div>
      `
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('Maintenance end email sent:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Error sending maintenance end email:', error)
    return { success: false, error: error.message }
  }
}