import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { checkMaintenanceMode } from './middleware/MaintenanceMode.js'

// Get the directory name for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from the correct path
dotenv.config({ path: path.join(__dirname, '.env') })

// Log environment variables for debugging
console.log('Environment variables loaded:')
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('PORT:', process.env.PORT)
console.log('SMTP_HOST:', process.env.SMTP_HOST)
console.log('SMTP_PORT:', process.env.SMTP_PORT)
console.log('SMTP_USER:', process.env.SMTP_USER ? 'Set' : 'Not set')
console.log('SMTP_PASS:', process.env.SMTP_PASS ? 'Set' : 'Not set')
console.log('MAINTENANCE_EMAIL_RECIPIENT:', process.env.MAINTENANCE_EMAIL_RECIPIENT)

// Import routes
import dashboardRoutes from './routes/dashboard.js'
import inventoryRoutes from './routes/inventory.js'
import financialRoutes from './routes/financial.js'
import hrRoutes from './routes/hr.js'
import qualityRoutes from './routes/quality.js'
import warehouseRoutes from './routes/warehouse.js'
import maintenanceRoutes from './routes/maintenance.js'
import maintenanceModeRoutes from './routes/maintenance-mode.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors())
app.use(express.json())

// Apply maintenance mode check to all routes
app.use(checkMaintenanceMode)

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://bugsbunny:fmsbugs@cluster0.jqubkg0.mongodb.net/factory-management'

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 30000, // 30 seconds timeout
  socketTimeoutMS: 45000, // 45 seconds socket timeout
  connectTimeoutMS: 30000 // 30 seconds connection timeout
})
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('MongoDB connection error:', error))

// Routes
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/financial', financialRoutes)
app.use('/api/hr', hrRoutes)
app.use('/api/quality', qualityRoutes)
app.use('/api/warehouse', warehouseRoutes)
app.use('/api/maintenance', maintenanceRoutes)
app.use('/api/maintenance-mode', maintenanceModeRoutes)

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'FIRN Bakers API is running' })
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})