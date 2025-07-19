import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Warehouse, MapPin, Phone, Mail, AlertTriangle, Package } from 'lucide-react'
import api from '../utils/api'

const SaleManagement = () => {
  const [warehouses, setWarehouses] = useState([])
  const [products, setProducts] = useState([])
  const [qualityRecords, setQualityRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    capacity: '',
    currentStock: '',
    manager: '',
    phone: '',
    email: '',
    type: 'storage',
    status: 'active',
    defectiveItems: '0'
  })

  useEffect(() => {
    fetchWarehouses()
    fetchProducts()
    fetchQualityRecords()
  }, [])

  const fetchWarehouses = async () => {
    try {
      const response = await api.get('/warehouse')
      setWarehouses(response.data)
    } catch (error) {
      console.error('Error fetching warehouses:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await api.get('/inventory')
      setProducts(response.data)
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const fetchQualityRecords = async () => {
    try {
      const response = await api.get('/quality')
      setQualityRecords(response.data)
    } catch (error) {
      console.error('Error fetching quality records:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const warehouseData = {
        ...formData,
        capacity: parseInt(formData.capacity),
        currentStock: parseInt(formData.currentStock),
        defectiveItems: parseInt(formData.defectiveItems || 0)
      }
      
      if (editingWarehouse) {
        await api.put(`/warehouse/${editingWarehouse._id}`, warehouseData)
      } else {
        await api.post('/warehouse', warehouseData)
      }
      fetchWarehouses()
      resetForm()
    } catch (error) {
      console.error('Error saving warehouse:', error)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this warehouse?')) {
      try {
        await api.delete(`/warehouse/${id}`)
        fetchWarehouses()
      } catch (error) {
        console.error('Error deleting warehouse:', error)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      location: '',
      capacity: '',
      currentStock: '',
      manager: '',
      phone: '',
      email: '',
      type: 'storage',
      status: 'active',
      defectiveItems: '0'
    })
    setEditingWarehouse(null)
    setShowModal(false)
  }

  const handleEdit = (warehouse) => {
    setFormData({
      name: warehouse.name,
      location: warehouse.location,
      capacity: warehouse.capacity.toString(),
      currentStock: warehouse.currentStock.toString(),
      manager: warehouse.manager,
      phone: warehouse.phone || '',
      email: warehouse.email || '',
      type: warehouse.type,
      status: warehouse.status,
      defectiveItems: (warehouse.defectiveItems || 0).toString()
    })
    setEditingWarehouse(warehouse)
    setShowModal(true)
  }

  const getWarehouseProducts = (warehouseId) => {
    return products.filter(product => product.warehouseId === warehouseId)
  }

  const getDefectiveCountForWarehouse = (warehouseId) => {
    const warehouseProducts = getWarehouseProducts(warehouseId)
    let totalDefective = 0
    
    warehouseProducts.forEach(product => {
      const productDefects = qualityRecords
        .filter(record => record.productId === product.productId)
        .reduce((sum, record) => sum + record.defectiveQuantity, 0)
      totalDefective += productDefects
    })
    
    return totalDefective
  }

  const totalCapacity = warehouses.reduce((sum, warehouse) => sum + warehouse.capacity, 0)
  const totalCurrentStock = warehouses.reduce((sum, warehouse) => sum + warehouse.currentStock, 0)
  const totalDefectiveItems = warehouses.reduce((sum, warehouse) => sum + (warehouse.defectiveItems || 0), 0)
  const utilizationRate = totalCapacity > 0 ? ((totalCurrentStock / totalCapacity) * 100).toFixed(1) : 0

  if (loading) {
    return (
      <div className="container" style={{ padding: '40px 20px' }}>
        <div className="loading">Loading warehouse data...</div>
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
            Sale
          </h1>
          <p style={{ color: '#6c757d' }}>
            Manage warehouse locations, storage capacity, and track defective items
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
        >
          <Plus size={18} />
          Add Warehouse
        </button>
      </div>

      {/* Warehouse Summary */}
      <div className="grid grid-4" style={{ marginBottom: '32px' }}>
        <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #20c997' }}>
          <Warehouse size={32} style={{ color: '#20c997', marginBottom: '12px' }} />
          <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>
            {warehouses.length}
          </h3>
          <p style={{ color: '#6c757d', fontSize: '14px' }}>Total Warehouses</p>
        </div>
        
        <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #17a2b8' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '4px',
            backgroundColor: '#17a2b8',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            fontSize: '12px',
            fontWeight: '600'
          }}>
            CAP
          </div>
          <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>
            {totalCapacity.toLocaleString()}
          </h3>
          <p style={{ color: '#6c757d', fontSize: '14px' }}>Total Capacity</p>
        </div>
        
        <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #fd7e14' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#fd7e14',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            %
          </div>
          <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>
            {utilizationRate}%
          </h3>
          <p style={{ color: '#6c757d', fontSize: '14px' }}>Utilization Rate</p>
        </div>

        <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #dc3545' }}>
          <AlertTriangle size={32} style={{ color: '#dc3545', marginBottom: '12px' }} />
          <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>
            {totalDefectiveItems.toLocaleString()}
          </h3>
          <p style={{ color: '#6c757d', fontSize: '14px' }}>Defective Items</p>
        </div>
      </div>

      {/* Warehouses Grid */}
      <div className="grid grid-2">
        {warehouses.map((warehouse) => {
          const utilization = ((warehouse.currentStock / warehouse.capacity) * 100).toFixed(1)
          const warehouseProducts = getWarehouseProducts(warehouse._id)
          const defectiveCount = getDefectiveCountForWarehouse(warehouse._id)
          
          return (
            <div key={warehouse._id} className="card">
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    padding: '8px',
                    borderRadius: '8px',
                    backgroundColor: '#20c99715',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Warehouse size={20} style={{ color: '#20c997' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
                      {warehouse.name}
                    </h3>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: warehouse.status === 'active' ? '#d4edda' : '#f8d7da',
                      color: warehouse.status === 'active' ? '#155724' : '#721c24'
                    }}>
                      {warehouse.status.charAt(0).toUpperCase() + warehouse.status.slice(1)}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px' }}
                    onClick={() => handleEdit(warehouse)}
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '6px 12px' }}
                    onClick={() => handleDelete(warehouse._id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <MapPin size={16} style={{ color: '#6c757d' }} />
                  <span style={{ fontSize: '14px', color: '#6c757d' }}>{warehouse.location}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#6c757d' }}>
                    Manager: {warehouse.manager}
                  </span>
                </div>
                {warehouse.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Phone size={16} style={{ color: '#6c757d' }} />
                    <span style={{ fontSize: '14px', color: '#6c757d' }}>{warehouse.phone}</span>
                  </div>
                )}
                {warehouse.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Mail size={16} style={{ color: '#6c757d' }} />
                    <span style={{ fontSize: '14px', color: '#6c757d' }}>{warehouse.email}</span>
                  </div>
                )}
              </div>

              {/* Products in Warehouse */}
              <div style={{
                padding: '12px',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                marginBottom: '12px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px'
                }}>
                  <Package size={16} style={{ color: '#6c757d' }} />
                  <span style={{ fontSize: '13px', fontWeight: '500', color: '#495057' }}>
                    Products: {warehouseProducts.length}
                  </span>
                </div>
                {(warehouse.defectiveItems || defectiveCount) > 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 8px',
                    backgroundColor: '#f8d7da',
                    borderRadius: '4px',
                    marginBottom: '8px'
                  }}>
                    <AlertTriangle size={14} style={{ color: '#721c24' }} />
                    <span style={{ fontSize: '12px', color: '#721c24' }}>
                      Defective Items: {warehouse.defectiveItems || defectiveCount}
                    </span>
                  </div>
                )}
                {warehouseProducts.slice(0, 3).map((product) => (
                  <div key={product._id} style={{
                    fontSize: '11px',
                    color: '#6c757d',
                    marginBottom: '2px'
                  }}>
                    • {product.name} (ID: {product.productId}) - Qty: {product.quantity}
                  </div>
                ))}
                {warehouseProducts.length > 3 && (
                  <div style={{ fontSize: '11px', color: '#6c757d', fontStyle: 'italic' }}>
                    ... and {warehouseProducts.length - 3} more
                  </div>
                )}
              </div>

              <div style={{
                padding: '12px',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}>
                  <span style={{ fontSize: '13px', color: '#495057' }}>Capacity Utilization</span>
                  <span style={{ fontSize: '13px', fontWeight: '500', color: '#495057' }}>
                    {utilization}%
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  height: '6px',
                  backgroundColor: '#e9ecef',
                  borderRadius: '3px',
                  overflow: 'hidden',
                  marginBottom: '8px'
                }}>
                  <div style={{
                    width: `${utilization}%`,
                    height: '100%',
                    backgroundColor: utilization > 90 ? '#dc3545' : utilization > 70 ? '#ffc107' : '#28a745',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  color: '#6c757d'
                }}>
                  <span>Current: {warehouse.currentStock.toLocaleString()}</span>
                  <span>Capacity: {warehouse.capacity.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => resetForm()}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: '600' }}>
              {editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Warehouse Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Location *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Capacity *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Current Stock *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Manager *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.manager}
                    onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Type *</label>
                  <select
                    className="form-select"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    required
                  >
                    <option value="storage">Storage</option>
                    <option value="distribution">Distribution</option>
                    <option value="manufacturing">Manufacturing</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status *</label>
                  <select
                    className="form-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    required
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Defective Items</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.defectiveItems}
                    onChange={(e) => setFormData({ ...formData, defectiveItems: e.target.value })}
                    min="0"
                  />
                </div>
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
                  {editingWarehouse ? 'Update' : 'Add'} Warehouse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default SaleManagement