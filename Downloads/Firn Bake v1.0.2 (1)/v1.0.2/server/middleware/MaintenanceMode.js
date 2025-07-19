import MaintenanceMode from '../models/MaintenanceMode.js'

// Middleware to check if system is in maintenance mode
export const checkMaintenanceMode = async (req, res, next) => {
  try {
    // Skip maintenance check for maintenance-mode routes and health check
    const exemptPaths = [
      '/api/maintenance-mode',
      '/api/health'
    ]
    
    const isExempt = exemptPaths.some(path => req.path.startsWith(path))
    if (isExempt) {
      return next()
    }

    const maintenanceMode = await MaintenanceMode.findOne({ isActive: true }).maxTimeMS(5000)
    
    if (maintenanceMode) {
      return res.status(503).json({
        error: 'System is currently under maintenance',
        maintenance: {
          isActive: true,
          startTime: maintenanceMode.startTime,
          endTime: maintenanceMode.endTime,
          reason: maintenanceMode.reason,
          estimatedDuration: maintenanceMode.estimatedDuration
        }
      })
    }

    next()
  } catch (error) {
    console.error('Error checking maintenance mode:', error)
    // Continue if there's an error checking maintenance mode (fail-safe)
    next()
  }
}