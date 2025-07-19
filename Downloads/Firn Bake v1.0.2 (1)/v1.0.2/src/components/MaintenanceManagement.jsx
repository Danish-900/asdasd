import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Wrench, AlertTriangle, Clock, CheckCircle } from 'lucide-react'
import { format, isAfter, isBefore, addDays } from 'date-fns'
import api from '../utils/api'

const MaintenanceManagement = () => {
  const [maintenanceItems, setMaintenanceItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({
    equipmentName: '',
    description: '',
    maintenanceType: 'preventive',
    frequency: 'monthly',
    lastMaintenance: '',
    nextMaintenance: '',
    assignedTo: '',
    priority: 'medium',
    status: 'pending',
    cost: '',
    notes: ''
  })

  useEffect(() => {
    fetchMaintenanceItems()
  }, [])

  const fetchMaintenanceItems = async () => {
    try {
      const response = await api.get('/maintenance')
      setMaintenanceItems(response.data)
    } catch (error) {
      console.error('Error fetching maintenance items:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const itemData = {
        ...formData,
        cost: formData.cost ? parseFloat(formData.cost) : 0
      }
      
      if (editingItem) {
        await api.put(`/maintenance/${editingItem._id}`, itemData)
      } else {
        await api.post('/maintenance', itemData)
      }
      fetchMaintenanceItems()
      resetForm()
    } catch (error) {
      console.error('Error saving maintenance item:', error)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this maintenance item?')) {
      try {
        await api.delete(`/maintenance/${id}`)
        fetchMaintenanceItems()
      } catch (error) {
        console.error('Error deleting maintenance item:', error)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      equipmentName: '',
      description: '',
      maintenanceType: 'preventive',
      frequency: 'monthly',
      lastMaintenance: '',
      nextMaintenance: '',
      assignedTo: '',
      priority: 'medium',
      status: 'pending',
      cost: '',
      notes: ''
    })
    setEditingItem(null)
    setShowModal(false)
  }

  const handleEdit = (item) => {
    setFormData({
      equipmentName: item.equipmentName,
      description: item.description,
      maintenanceType: item.maintenanceType,
      frequency: item.frequency,
      lastMaintenance: item.lastMaintenance ? new Date(item.lastMaintenance).toISOString().split('T')[0] : '',
      nextMaintenance: item.nextMaintenance ? new Date(item.nextMaintenance).toISOString().split('T')[0] : '',
      assignedTo: item.assignedTo,
      priority: item.priority,
      status: item.status,
      cost: item.cost ? item.cost.toString() : '',
      notes: item.notes || ''
    })
    setEditingItem(item)
    setShowModal(true)
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} style={{ color: '#28a745' }} />
      case 'in-progress':
        return <Clock size={16} style={{ color: '#ffc107' }} />
      case 'overdue':
        return <AlertTriangle size={16} style={{ color: '#dc3545' }} />
      default:
        return <Wrench size={16} style={{ color: '#6c757d' }} />
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return '#dc3545'
      case 'medium':
        return '#ffc107'
      case 'low':
        return '#28a745'
      default:
        return '#6c757d'
    }
  }

  const isOverdue = (nextMaintenance) => {
    return nextMaintenance && isBefore(new Date(nextMaintenance), new Date())
  }

  const isDueSoon = (nextMaintenance) => {
    const today = new Date()
    const dueDate = new Date(nextMaintenance)
    const sevenDaysFromNow = addDays(today, 7)
    return nextMaintenance && isAfter(dueDate, today) && isBefore(dueDate, sevenDaysFromNow)
  }

  const overdueItems = maintenanceItems.filter(item => 
    item.nextMaintenance && isOverdue(item.nextMaintenance) && item.status !== 'completed'
  )
  
  const dueSoonItems = maintenanceItems.filter(item => 
    item.nextMaintenance && isDueSoon(item.nextMaintenance) && item.status !== 'completed'
  )

  const pendingItems = maintenanceItems.filter(item => item.status === 'pending')
  const completedItems = maintenanceItems.filter(item => item.status === 'completed')

  if (loading) {
    return (
      <div className="container" style={{ padding: '40px 20px' }}>
        <div className="loading">Loading maintenance data...</div>
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
            Maintenance Management
          </h1>
          <p style={{ color: '#6c757d' }}>
            Schedule and track equipment maintenance
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
        >
          <Plus size={18} />
          Add Maintenance Item
        </button>
      </div>

      {/* Alerts */}
      {overdueItems.length > 0 && (
        <div style={{
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <AlertTriangle size={20} style={{ color: '#721c24' }} />
          <div>
            <strong style={{ color: '#721c24' }}>Overdue Maintenance:</strong>
            <span style={{ color: '#721c24', marginLeft: '8px' }}>
              {overdueItems.length} item(s) are overdue for maintenance
            </span>
          </div>
        </div>
      )}

      {dueSoonItems.length > 0 && (
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Clock size={20} style={{ color: '#856404' }} />
          <div>
            <strong style={{ color: '#856404' }}>Due Soon:</strong>
            <span style={{ color: '#856404', marginLeft: '8px' }}>
              {dueSoonItems.length} item(s) due for maintenance within 7 days
            </span>
          </div>
        </div>
      )}

      {/* Maintenance Summary */}
      <div className="grid grid-4" style={{ marginBottom: '32px' }}>
        <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #6c757d' }}>
          <Wrench size={32} style={{ color: '#6c757d', marginBottom: '12px' }} />
          <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>
            {pendingItems.length}
          </h3>
          <p style={{ color: '#6c757d', fontSize: '14px' }}>Pending</p>
        </div>
        
        <div className="card" style={{ textAlign: '4px solid #dc3545' }}>
          <AlertTriangle size={32} style={{ color: '#dc3545', marginBottom: '12px' }} />
          <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>
            {overdueItems.length}
          </h3>
          <p style={{ color: '#6c757d', fontSize: '14px' }}>Overdue</p>
        </div>
        
        <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #ffc107' }}>
          <Clock size={32} style={{ color: '#ffc107', marginBottom: '12px' }} />
          <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>
            {dueSoonItems.length}
          </h3>
          <p style={{ color: '#6c757d', fontSize: '14px' }}>Due Soon</p>
        </div>
        
        <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #28a745' }}>
          <CheckCircle size={32} style={{ color: '#28a745', marginBottom: '12px' }} />
          <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>
            {completedItems.length}
          </h3>
          <p style={{ color: '#6c757d', fontSize: '14px' }}>Completed</p>
        </div>
      </div>

      {/* Maintenance Items Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Equipment</th>
              <th>Type</th>
              <th>Priority</th>
              <th>Next Maintenance</th>
              <th>Assigned To</th>
              <th>Status</th>
              <th>Cost</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {maintenanceItems.map((item) => {
              const overdue = item.nextMaintenance && isOverdue(item.nextMaintenance)
              const dueSoon = item.nextMaintenance && isDueSoon(item.nextMaintenance)
              
              return (
                <tr key={item._id} style={{
                  backgroundColor: overdue && item.status !== 'completed' ? '#fff5f5' : 
                                 dueSoon && item.status !== 'completed' ? '#fffbf0' : 'transparent'
                }}>
                  <td>
                    <div>
                      <div style={{ fontWeight: '500' }}>{item.equipmentName}</div>
                      <div style={{ fontSize: '12px', color: '#6c757d' }}>{item.description}</div>
                    </div>
                  </td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: item.maintenanceType === 'preventive' ? '#e3f2fd' : '#fff3e0',
                      color: item.maintenanceType === 'preventive' ? '#1565c0' : '#ef6c00'
                    }}>
                      {item.maintenanceType.charAt(0).toUpperCase() + item.maintenanceType.slice(1)}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: `${getPriorityColor(item.priority)}20`,
                      color: getPriorityColor(item.priority)
                    }}>
                      {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                    </span>
                  </td>
                  <td>
                    {item.nextMaintenance ? (
                      <div style={{
                        color: overdue ? '#dc3545' : dueSoon ? '#ffc107' : '#495057'
                      }}>
                        {format(new Date(item.nextMaintenance), 'MMM dd, yyyy')}
                        {overdue && <span style={{ marginLeft: '4px', fontSize: '12px' }}>(Overdue)</span>}
                        {dueSoon && !overdue && <span style={{ marginLeft: '4px', fontSize: '12px' }}>(Due Soon)</span>}
                      </div>
                    ) : (
                      <span style={{ color: '#6c757d' }}>Not scheduled</span>
                    )}
                  </td>
                  <td>{item.assignedTo || 'Unassigned'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {getStatusIcon(overdue && item.status !== 'completed' ? 'overdue' : item.status)}
                      <span style={{ fontSize: '12px', fontWeight: '500' }}>
                        {overdue && item.status !== 'completed' ? 'Overdue' : 
                         item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                    </div>
                  </td>
                  <td>
                    {item.cost ? `₨${item.cost.toLocaleString()}` : '-'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px' }}
                        onClick={() => handleEdit(item)}
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '6px 12px' }}
                        onClick={() => handleDelete(item._id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => resetForm()}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: '600' }}>
              {editingItem ? 'Edit Maintenance Item' : 'Add New Maintenance Item'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Equipment Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.equipmentName}
                    onChange={(e) => setFormData({ ...formData, equipmentName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Maintenance Type</label>
                  <select
                    className="form-select"
                    value={formData.maintenanceType}
                    onChange={(e) => setFormData({ ...formData, maintenanceType: e.target.value })}
                    required
                  >
                    <option value="preventive">Preventive</option>
                    <option value="corrective">Corrective</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Frequency</label>
                  <select
                    className="form-select"
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    required
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annually">Annually</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    className="form-select"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    required
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Last Maintenance</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.lastMaintenance}
                    onChange={(e) => setFormData({ ...formData, lastMaintenance: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Next Maintenance</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.nextMaintenance}
                    onChange={(e) => setFormData({ ...formData, nextMaintenance: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Assigned To</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    required
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                <button type="submit" className="btn btn-primary">
                  {editingItem ? 'Update' : 'Add'} Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default MaintenanceManagement