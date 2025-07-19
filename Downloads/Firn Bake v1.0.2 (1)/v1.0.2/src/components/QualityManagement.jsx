import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, CheckCircle, XCircle, BarChart3 } from 'lucide-react'
import { format } from 'date-fns'
import api from '../utils/api'

const QualityManagement = () => {
  const [qualityRecords, setQualityRecords] = useState([])
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [formData, setFormData] = useState({
    productId: '',
    productName: '',
    batchNumber: '',
    totalQuantity: '',
    goodQuantity: '',
    defectiveQuantity: '',
    defectType: '',
    inspectionDate: new Date().toISOString().split('T')[0],
    inspector: '',
    notes: ''
  })

  useEffect(() => {
    fetchQualityRecords()
    fetchProducts()
    fetchWarehouses()
  }, [])

  const fetchQualityRecords = async () => {
    try {
      const response = await api.get('/quality')
      setQualityRecords(response.data)
    } catch (error) {
      console.error('Error fetching quality records:', error)
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

  const fetchWarehouses = async () => {
    try {
      const response = await api.get('/warehouse')
      setWarehouses(response.data)
    } catch (error) {
      console.error('Error fetching warehouses:', error)
    }
  }

  const updateInventoryForDefects = async (productId, defectiveQuantity) => {
    try {
      const product = products.find(p => p.productId === productId)
      if (!product) return

      const newQuantity = Math.max(0, product.quantity - parseInt(defectiveQuantity))
      
      await api.put(`/inventory/${product._id}`, {
        ...product,
        quantity: newQuantity
      })

      // Update warehouse stock if product has warehouse assigned
      if (product.warehouseId) {
        const warehouse = warehouses.find(w => w._id === product.warehouseId)
        if (warehouse) {
          await api.put(`/warehouse/${warehouse._id}`, {
            ...warehouse,
            currentStock: Math.max(0, warehouse.currentStock - parseInt(defectiveQuantity)),
            defectiveItems: (warehouse.defectiveItems || 0) + parseInt(defectiveQuantity)
          })
        }
      }
    } catch (error) {
      console.error('Error updating inventory for defects:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const recordData = {
        ...formData,
        totalQuantity: parseInt(formData.totalQuantity),
        goodQuantity: parseInt(formData.goodQuantity),
        defectiveQuantity: parseInt(formData.defectiveQuantity)
      }
      
      if (editingRecord) {
        // Calculate difference in defective quantity for existing records
        const oldDefectiveQty = editingRecord.defectiveQuantity
        const newDefectiveQty = recordData.defectiveQuantity
        const defectiveDifference = newDefectiveQty - oldDefectiveQty
        
        await api.put(`/quality/${editingRecord._id}`, recordData)
        
        // Update inventory only for the difference
        if (defectiveDifference > 0) {
          await updateInventoryForDefects(recordData.productId, defectiveDifference)
        }
      } else {
        await api.post('/quality', recordData)
        // Update inventory for new defective items
        if (recordData.defectiveQuantity > 0) {
          await updateInventoryForDefects(recordData.productId, recordData.defectiveQuantity)
        }
      }
      fetchQualityRecords()
      fetchProducts()
      fetchWarehouses()
      resetForm()
    } catch (error) {
      console.error('Error saving quality record:', error)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this quality record?')) {
      try {
        await api.delete(`/quality/${id}`)
        fetchQualityRecords()
      } catch (error) {
        console.error('Error deleting quality record:', error)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      productId: '',
      productName: '',
      batchNumber: '',
      totalQuantity: '',
      goodQuantity: '',
      defectiveQuantity: '',
      defectType: '',
      inspectionDate: new Date().toISOString().split('T')[0],
      inspector: '',
      notes: ''
    })
    setEditingRecord(null)
    setShowModal(false)
  }

  const handleEdit = (record) => {
    setFormData({
      productId: record.productId || '',
      productName: record.productName,
      batchNumber: record.batchNumber,
      totalQuantity: record.totalQuantity.toString(),
      goodQuantity: record.goodQuantity.toString(),
      defectiveQuantity: record.defectiveQuantity.toString(),
      defectType: record.defectType || '',
      inspectionDate: new Date(record.inspectionDate).toISOString().split('T')[0],
      inspector: record.inspector,
      notes: record.notes || ''
    })
    setEditingRecord(record)
    setShowModal(true)
  }

  const handleProductSelect = (productId) => {
    const product = products.find(p => p.productId === productId)
    if (product) {
      setFormData({
        ...formData,
        productId: productId,
        productName: product.name
      })
    }
  }

  const totalInspected = qualityRecords.reduce((sum, record) => sum + record.totalQuantity, 0)
  const totalGood = qualityRecords.reduce((sum, record) => sum + record.goodQuantity, 0)
  const totalDefective = qualityRecords.reduce((sum, record) => sum + record.defectiveQuantity, 0)
  const qualityRate = totalInspected > 0 ? ((totalGood / totalInspected) * 100).toFixed(1) : 0

  if (loading) {
    return (
      <div className="container" style={{ padding: '40px 20px' }}>
        <div className="loading">Loading quality data...</div>
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
            Quality Management
          </h1>
          <p style={{ color: '#6c757d' }}>
            Track product quality and inspection records - Defective items are automatically removed from inventory and warehouse
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
        >
          <Plus size={18} />
          Add Quality Record
        </button>
      </div>

      {/* Quality Summary */}
      <div className="grid grid-4" style={{ marginBottom: '32px' }}>
        <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #17a2b8' }}>
          <BarChart3 size={32} style={{ color: '#17a2b8', marginBottom: '12px' }} />
          <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>
            {totalInspected.toLocaleString()}
          </h3>
          <p style={{ color: '#6c757d', fontSize: '14px' }}>Total Inspected</p>
        </div>
        
        <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #28a745' }}>
          <CheckCircle size={32} style={{ color: '#28a745', marginBottom: '12px' }} />
          <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>
            {totalGood.toLocaleString()}
          </h3>
          <p style={{ color: '#6c757d', fontSize: '14px' }}>Good Products</p>
        </div>
        
        <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #dc3545' }}>
          <XCircle size={32} style={{ color: '#dc3545', marginBottom: '12px' }} />
          <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>
            {totalDefective.toLocaleString()}
          </h3>
          <p style={{ color: '#6c757d', fontSize: '14px' }}>Defective Products</p>
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
            {qualityRate}%
          </h3>
          <p style={{ color: '#6c757d', fontSize: '14px' }}>Quality Rate</p>
        </div>
      </div>

      {/* Quality Records Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Product ID</th>
              <th>Product Name</th>
              <th>Batch #</th>
              <th>Inspection Date</th>
              <th>Total Qty</th>
              <th>Good</th>
              <th>Defective</th>
              <th>Quality Rate</th>
              <th>Inspector</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {qualityRecords.map((record) => {
              const rate = ((record.goodQuantity / record.totalQuantity) * 100).toFixed(1)
              return (
                <tr key={record._id}>
                  <td>
                    <code style={{ fontSize: '11px', backgroundColor: '#f8f9fa', padding: '1px 4px', borderRadius: '3px' }}>
                      {record.productId || 'N/A'}
                    </code>
                  </td>
                  <td>
                    <div style={{ fontWeight: '500' }}>{record.productName}</div>
                  </td>
                  <td>{record.batchNumber}</td>
                  <td>{format(new Date(record.inspectionDate), 'MMM dd, yyyy')}</td>
                  <td>{record.totalQuantity}</td>
                  <td>
                    <span style={{ color: '#28a745', fontWeight: '500' }}>
                      {record.goodQuantity}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: '#dc3545', fontWeight: '500' }}>
                      {record.defectiveQuantity}
                      {record.defectiveQuantity > 0 && (
                        <span style={{ fontSize: '11px', display: 'block', color: '#6c757d' }}>
                          (Removed from inventory & warehouse)
                        </span>
                      )}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: rate >= 95 ? '#d4edda' : rate >= 85 ? '#fff3cd' : '#f8d7da',
                      color: rate >= 95 ? '#155724' : rate >= 85 ? '#856404' : '#721c24'
                    }}>
                      {rate}%
                    </span>
                  </td>
                  <td>{record.inspector}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px' }}
                        onClick={() => handleEdit(record)}
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '6px 12px' }}
                        onClick={() => handleDelete(record._id)}
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
              {editingRecord ? 'Edit Quality Record' : 'Add New Quality Record'}
            </h2>
            {!editingRecord && (
              <div style={{
                padding: '12px',
                backgroundColor: '#fff3cd',
                borderRadius: '6px',
                marginBottom: '20px',
                fontSize: '14px',
                color: '#856404'
              }}>
                <strong>Note:</strong> Defective items will be automatically removed from inventory and warehouse stock.
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Product ID *</label>
                  <select
                    className="form-select"
                    value={formData.productId}
                    onChange={(e) => handleProductSelect(e.target.value)}
                    required
                  >
                    <option value="">Select Product</option>
                    {products.map((product) => (
                      <option key={product._id} value={product.productId}>
                        {product.productId} - {product.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.productName}
                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                    required
                    disabled={formData.productId}
                    style={{ backgroundColor: formData.productId ? '#f8f9fa' : 'white' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Batch Number *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.batchNumber}
                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Total Quantity *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.totalQuantity}
                    onChange={(e) => setFormData({ ...formData, totalQuantity: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Good Quantity *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.goodQuantity}
                    onChange={(e) => setFormData({ ...formData, goodQuantity: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Defective Quantity * (Will be removed from inventory & warehouse)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.defectiveQuantity}
                    onChange={(e) => setFormData({ ...formData, defectiveQuantity: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Defect Type</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.defectType}
                    onChange={(e) => setFormData({ ...formData, defectType: e.target.value })}
                    placeholder="e.g., Scratches, Cracks, etc."
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Inspection Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.inspectionDate}
                    onChange={(e) => setFormData({ ...formData, inspectionDate: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Inspector *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.inspector}
                    onChange={(e) => setFormData({ ...formData, inspector: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes about the inspection..."
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
                  {editingRecord ? 'Update' : 'Add'} Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default QualityManagement