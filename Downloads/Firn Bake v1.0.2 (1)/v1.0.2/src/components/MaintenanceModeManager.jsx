import React, { useState, useEffect } from 'react'
import { Settings, Power, PowerOff, Clock, Mail, AlertTriangle, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import api from '../utils/api'

const MaintenanceModeManager = () => {
  const [maintenanceStatus, setMaintenanceStatus] = useState({
    isActive: false,
    data: null
  })
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [showActivateModal, setShowActivateModal] = useState(false)
  const [emailTestResult, setEmailTestResult] = useState(null)
  const [formData, setFormData] = useState({
    reason: '',
    estimatedDuration: '',
    endTime: '',
    createdBy: 'System Administrator'
  })

  useEffect(() => {
    fetchMaintenanceStatus()
    fetchMaintenanceHistory()
  }, [])

  const fetchMaintenanceStatus = async () => {
    try {
      const response = await api.get('/maintenance-mode/status')
      setMaintenanceStatus(response.data)
    } catch (error) {
      console.error('Error fetching maintenance status:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMaintenanceHistory = async () => {
    try {
      const response = await api.get('/maintenance-mode/history')
      setHistory(response.data)
    } catch (error) {
      console.error('Error fetching maintenance history:', error)
    }
  }

  const handleActivateMaintenance = async (e) => {
    e.preventDefault()
    try {
      const response = await api.post('/maintenance-mode/activate', formData)
      setMaintenanceStatus({
        isActive: true,
        data: response.data.data
      })
      fetchMaintenanceHistory()
      resetForm()
      alert(`Maintenance mode activated successfully!\nEmail notification: ${response.data.emailNotification}\nReminder scheduled: ${response.data.reminderScheduled ? 'Yes' : 'No'}`)
    } catch (error) {
      console.error('Error activating maintenance mode:', error)
      alert('Error activating maintenance mode: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleDeactivateMaintenance = async () => {
    if (window.confirm('Are you sure you want to deactivate maintenance mode?')) {
      try {
        const response = await api.post('/maintenance-mode/deactivate')
        setMaintenanceStatus({
          isActive: false,
          data: null
        })
        fetchMaintenanceHistory()
        alert(`Maintenance mode deactivated successfully!\nEmail notification: ${response.data.emailNotification}`)
      } catch (error) {
        console.error('Error deactivating maintenance mode:', error)
        alert('Error deactivating maintenance mode: ' + (error.response?.data?.error || error.message))
      }
    }
  }

  const handleTestEmail = async () => {
    try {
      setEmailTestResult({ loading: true })
      const response = await api.post('/maintenance-mode/test-email')
      setEmailTestResult(response.data)
    } catch (error) {
      console.error('Error testing email:', error)
      setEmailTestResult({ success: false, error: error.message })
    }
  }

  const resetForm = () => {
    setFormData({
      reason: '',
      estimatedDuration: '',
      endTime: '',
      createdBy: 'System Administrator'
    })
    setShowActivateModal(false)
  }

  if (loading) {
    return (
      <div className="container" style={{ padding: '40px 20px' }}>
        <div className="loading">Loading maintenance mode data...</div>
      </div>
    )
  }

  return (
    <div className="container" style={{ padding: '40px 20px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px'
      }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#212529', marginBottom: '8px' }}>
            Maintenance Mode Manager
          </h1>
          <p style={{ color: '#6c757d' }}>
            Control system maintenance mode with automatic email notifications
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn btn-secondary"
            onClick={handleTestEmail}
          >
            <Mail size={18} />
            Test Email
          </button>
          {!maintenanceStatus.isActive ? (
            <button
              className="btn btn-primary"
              onClick={() => setShowActivateModal(true)}
            >
              <Power size={18} />
              Activate Maintenance
            </button>
          ) : (
            <button
              className="btn btn-danger"
              onClick={handleDeactivateMaintenance}
            >
              <PowerOff size={18} />
              Deactivate Maintenance
            </button>
          )}
        </div>
      </div>

      {/* Email Test Result */}
      {emailTestResult && (
        <div style={{
          backgroundColor: emailTestResult.success ? '#d4edda' : '#f8d7da',
          border: `1px solid ${emailTestResult.success ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          {emailTestResult.loading ? (
            <>
              <Clock size={20} style={{ color: '#6c757d' }} />
              <span style={{ color: '#6c757d' }}>Testing email configuration...</span>
            </>
          ) : emailTestResult.success ? (
            <>
              <CheckCircle size={20} style={{ color: '#155724' }} />
              <span style={{ color: '#155724' }}>Email configuration is working correctly!</span>
            </>
          ) : (
            <>
              <AlertTriangle size={20} style={{ color: '#721c24' }} />
              <span style={{ color: '#721c24' }}>Email configuration error: {emailTestResult.error}</span>
            </>
          )}
        </div>
      )}

      {/* Current Status */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '20px'
        }}>
          <div style={{
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: maintenanceStatus.isActive ? '#f8d7da' : '#d4edda',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Settings size={24} style={{ 
              color: maintenanceStatus.isActive ? '#721c24' : '#155724' 
            }} />
          </div>
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>
              System Status
            </h3>
            <span style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              backgroundColor: maintenanceStatus.isActive ? '#f8d7da' : '#d4edda',
              color: maintenanceStatus.isActive ? '#721c24' : '#155724'
            }}>
              {maintenanceStatus.isActive ? 'Under Maintenance' : 'Operational'}
            </span>
          </div>
        </div>

        {maintenanceStatus.isActive && maintenanceStatus.data && (
          <div style={{
            padding: '16px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
              Current Maintenance Details
            </h4>
            <div className="grid grid-2">
              <div>
                <p style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>Started</p>
                <p style={{ fontSize: '14px', fontWeight: '500' }}>
                  {format(new Date(maintenanceStatus.data.startTime), 'MMM dd, yyyy HH:mm')}
                </p>
              </div>
              {maintenanceStatus.data.endTime && (
                <div>
                  <p style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>Expected End</p>
                  <p style={{ fontSize: '14px', fontWeight: '500' }}>
                    {format(new Date(maintenanceStatus.data.endTime), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              )}
              <div>
                <p style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>Reason</p>
                <p style={{ fontSize: '14px', fontWeight: '500' }}>
                  {maintenanceStatus.data.reason || 'Not specified'}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '14px', color: '#6c757d', marginBottom: '4px' }}>Duration</p>
                <p style={{ fontSize: '14px', fontWeight: '500' }}>
                  {maintenanceStatus.data.estimatedDuration || 'Unknown'}
                </p>
              </div>
            </div>
            
            {/* Email Status */}
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e9ecef' }}>
              <h5 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                Email Notifications
              </h5>
              <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                <span style={{ 
                  color: maintenanceStatus.data.emailsSent?.startNotification ? '#28a745' : '#dc3545' 
                }}>
                  Start: {maintenanceStatus.data.emailsSent?.startNotification ? '✓ Sent' : '✗ Failed'}
                </span>
                <span style={{ 
                  color: maintenanceStatus.data.emailsSent?.reminderScheduled ? '#28a745' : '#6c757d' 
                }}>
                  Reminder: {maintenanceStatus.data.emailsSent?.reminderScheduled ? '✓ Scheduled' : '- Not scheduled'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Maintenance History */}
      <div className="card">
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
          Maintenance History
        </h3>
        {history.length === 0 ? (
          <p style={{ color: '#6c757d', textAlign: 'center', padding: '20px' }}>
            No maintenance history available
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Duration</th>
                  <th>Reason</th>
                  <th>Created By</th>
                  <th>Email Status</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record) => (
                  <tr key={record._id}>
                    <td>{format(new Date(record.startTime), 'MMM dd, yyyy HH:mm')}</td>
                    <td>
                      {record.endTime 
                        ? format(new Date(record.endTime), 'MMM dd, yyyy HH:mm')
                        : record.isActive ? 'Ongoing' : 'Not set'
                      }
                    </td>
                    <td>{record.estimatedDuration || 'Unknown'}</td>
                    <td>{record.reason || 'Not specified'}</td>
                    <td>{record.createdBy}</td>
                    <td>
                      <div style={{ fontSize: '12px' }}>
                        <div style={{ color: record.emailsSent?.startNotification ? '#28a745' : '#dc3545' }}>
                          Start: {record.emailsSent?.startNotification ? '✓' : '✗'}
                        </div>
                        <div style={{ color: record.emailsSent?.reminderScheduled ? '#28a745' : '#6c757d' }}>
                          Reminder: {record.emailsSent?.reminderScheduled ? '✓' : '-'}
                        </div>
                        <div style={{ color: record.emailsSent?.endNotification ? '#28a745' : '#6c757d' }}>
                          End: {record.emailsSent?.endNotification ? '✓' : '-'}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor: record.isActive ? '#fff3cd' : '#d4edda',
                        color: record.isActive ? '#856404' : '#155724'
                      }}>
                        {record.isActive ? 'Active' : 'Completed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Activate Maintenance Modal */}
      {showActivateModal && (
        <div className="modal-overlay" onClick={() => resetForm()}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: '600' }}>
              Activate Maintenance Mode
            </h2>
            <div style={{
              padding: '12px',
              backgroundColor: '#fff3cd',
              borderRadius: '6px',
              marginBottom: '20px',
              fontSize: '14px',
              color: '#856404'
            }}>
              <strong>Note:</strong> Activating maintenance mode will immediately send an email notification 
              and schedule a reminder 24 hours before the end time (if specified).
            </div>
            <form onSubmit={handleActivateMaintenance}>
              <div className="form-group">
                <label className="form-label">Reason for Maintenance *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="e.g., System updates, Database maintenance"
                  required
                />
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Estimated Duration</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.estimatedDuration}
                    onChange={(e) => setFormData({ ...formData, estimatedDuration: e.target.value })}
                    placeholder="e.g., 2 hours, 30 minutes"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Expected End Time</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Created By</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.createdBy}
                  onChange={(e) => setFormData({ ...formData, createdBy: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={resetForm}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger">
                  Activate Maintenance Mode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default MaintenanceModeManager