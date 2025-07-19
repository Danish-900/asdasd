import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Search, Package, AlertTriangle, Hash, Factory, Truck, Users } from 'lucide-react'
import api from '../utils/api'

const InventoryManagement = () => {
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [distributors, setDistributors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showProductionModal, setShowProductionModal] = useState(false)
  const [showDistributeModal, setShowDistributeModal] = useState(false)
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('raw') // 'raw', 'production', 'storage', 'distribute'
  const [formData, setFormData] = useState({
    productId: '',
    batchId: '',
    batchQuantity: '',
    batchPrice: '',
    batchDiscount: 0,
    name: '',
    brand: '',
    category: '',
    quantity: '',
    minStock: '',
    price: '',
    supplier: '',
    distributor: '',
    warehouseId: '',
    description: '',
    discount: 0,
    isRawMaterial: false,
    rawMaterialsUsed: []
  })
  const [productionData, setProductionData] = useState({
    productName: '',
    batchId: '',
    batchQuantity: '',
    batchPrice: '',
    rawMaterialsUsed: []
  })
  const [distributeData, setDistributeData] = useState({
    productId: '',
    quantity: '',
    distributor: ''
  })
  const [discountData, setDiscountData] = useState({
    discountType: 'percentage', // 'percentage' or 'fixed'
    discountValue: '',
    reason: ''
  })

  useEffect(() => {
    fetchProducts()
    fetchWarehouses()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await api.get('/inventory')
      setProducts(response.data)
      extractSuppliersAndDistributors(response.data)
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
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

  const extractSuppliersAndDistributors = (products) => {
    const uniqueSuppliers = [...new Set(products.map(p => p.supplier).filter(Boolean))]
    const uniqueDistributors = [...new Set(products.map(p => p.distributor).filter(Boolean))]
    
    setSuppliers(uniqueSuppliers.map(name => ({ name })))
    setDistributors(uniqueDistributors.map(name => ({ name })))
  }

  const generateProductId = () => {
    const prefix = activeTab === 'raw' ? 'RM-' : 'FP-'
    return prefix + Math.random().toString(36).substr(2, 9).toUpperCase()
  }

  const generateBatchId = () => {
    return 'BATCH-' + Date.now() + '-' + Math.floor(Math.random() * 1000)
  }

  const createPendingOrder = async (productData) => {
    try {
      await api.post('/financial', {
        type: 'expense',
        category: 'Pending Order',
        amount: productData.batchPrice * productData.batchQuantity,
        description: `Pending order for ${productData.name} (ID: ${productData.productId})`,
        date: new Date().toISOString(),
        productId: productData.productId,
        batchId: productData.batchId,
        status: 'pending'
      })
    } catch (error) {
      console.error('Error creating pending order:', error)
    }
  }

  const updateWarehouseStock = async (warehouseId, quantity) => {
    try {
      const warehouseResponse = await api.get('/warehouse')
      const warehouse = warehouseResponse.data.find(w => w._id === warehouseId)
      if (warehouse) {
        await api.put(`/warehouse/${warehouse._id}`, {
          ...warehouse,
          currentStock: warehouse.currentStock + parseInt(quantity)
        })
      }
    } catch (error) {
      console.error('Error updating warehouse stock:', error)
    }
  }

  const handleProductionSubmit = async (e) => {
    e.preventDefault()
    try {
      // Subtract raw materials
      for (const material of productionData.rawMaterialsUsed) {
        const rawMaterial = products.find(p => p.productId === material.productId)
        if (rawMaterial && rawMaterial.batchQuantity >= material.quantity) {
          await api.put(`/inventory/${rawMaterial._id}`, {
            ...rawMaterial,
            batchQuantity: rawMaterial.batchQuantity - material.quantity,
            quantity: rawMaterial.quantity - material.quantity
          })
        }
      }
      
      // Create finished product
      const finishedProduct = {
        productId: generateProductId(),
        batchId: productionData.batchId || generateBatchId(),
        batchQuantity: parseInt(productionData.batchQuantity),
        batchPrice: parseFloat(productionData.batchPrice),
        name: productionData.productName,
        category: 'Finished Product',
        quantity: parseInt(productionData.batchQuantity),
        minStock: 10,
        price: parseFloat(productionData.batchPrice),
        supplier: 'Internal Production',
        warehouseId: warehouses.length > 0 ? warehouses[0]._id : null,
        isRawMaterial: false
      }
      
      await api.post('/inventory', finishedProduct)
      fetchProducts()
      resetProductionForm()
    } catch (error) {
      console.error('Error processing production:', error)
    }
  }

  const handleDistributeSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/financial/dispatch', {
        productId: distributeData.productId,
        quantity: parseInt(distributeData.quantity),
        distributor: distributeData.distributor,
        unitPrice: 0 // Will be calculated from batch prices
      })
      fetchProducts()
      resetDistributeForm()
      alert('Dispatch order created successfully!')
    } catch (error) {
      console.error('Error creating dispatch:', error)
      alert('Error creating dispatch: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const productData = {
        ...formData,
        productId: editingProduct ? formData.productId : generateProductId(),
        batchId: editingProduct ? formData.batchId : (formData.batchId || generateBatchId()),
        batchQuantity: parseInt(formData.batchQuantity),
        batchPrice: parseFloat(formData.batchPrice),
        batchDiscount: parseFloat(formData.batchDiscount || 0),
        quantity: parseInt(formData.batchQuantity), // Keep for compatibility
        minStock: parseInt(formData.minStock),
        price: parseFloat(formData.batchPrice), // Keep for compatibility
        isRawMaterial: activeTab === 'raw'
      }
      
      if (editingProduct) {
        await api.put(`/inventory/${editingProduct._id}`, productData)
      } else {
        // Add product to inventory
        await api.post('/inventory', productData)
        
        // Update warehouse stock
        await updateWarehouseStock(productData.warehouseId, productData.batchQuantity)
        
        // Create pending order for new products
        await createPendingOrder(productData)
      }
      
      fetchProducts()
      fetchWarehouses()
      resetForm()
    } catch (error) {
      console.error('Error saving product:', error)
    }
  }

  const resetProductionForm = () => {
    setProductionData({
      productName: '',
      batchId: '',
      batchQuantity: '',
      batchPrice: '',
      rawMaterialsUsed: []
    })
    setShowProductionModal(false)
  }

  const resetDistributeForm = () => {
    setDistributeData({
      productId: '',
      quantity: '',
      distributor: ''
    })
    setShowDistributeModal(false)
  }

  const resetDiscountForm = () => {
    setDiscountData({
      discountType: 'percentage',
      discountValue: '',
      reason: ''
    })
    setSelectedBatch(null)
    setShowDiscountModal(false)
  }

  const handleDiscountSubmit = async (e) => {
    e.preventDefault()
    try {
      const discountValue = parseFloat(discountData.discountValue)
      const originalPrice = selectedBatch.batchPrice || selectedBatch.price
      let finalDiscount = 0
      let newBatchPrice = originalPrice
      
      if (discountData.discountType === 'percentage') {
        finalDiscount = discountValue
        newBatchPrice = originalPrice * (1 - discountValue / 100)
      } else {
        // Fixed amount discount
        const discountPercentage = (discountValue / originalPrice) * 100
        finalDiscount = Math.min(discountPercentage, 100) // Cap at 100%
        newBatchPrice = Math.max(0, originalPrice - discountValue)
      }
      
      const updatedProduct = {
        ...selectedBatch,
        batchDiscount: finalDiscount,
        batchPrice: newBatchPrice,
        price: newBatchPrice, // Update legacy price field too
        discountReason: discountData.reason
      }
      
      await api.put(`/inventory/${selectedBatch._id}`, updatedProduct)
      fetchProducts()
      resetDiscountForm()
      alert('Batch discount applied successfully!')
    } catch (error) {
      console.error('Error applying discount:', error)
      alert('Error applying discount: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleApplyDiscount = (product) => {
    setSelectedBatch(product)
    setDiscountData({
      discountType: 'percentage',
      discountValue: '',
      reason: ''
    })
    setShowDiscountModal(true)
  }

  const calculateOriginalPrice = (currentPrice, discount) => {
    if (!discount || discount === 0) return currentPrice
    return currentPrice / (1 - discount / 100)
  }

  const addRawMaterial = () => {
    setProductionData({
      ...productionData,
      rawMaterialsUsed: [...productionData.rawMaterialsUsed, { productId: '', quantity: '' }]
    })
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await api.delete(`/inventory/${id}`)
        fetchProducts()
      } catch (error) {
        console.error('Error deleting product:', error)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      productId: '',
      batchId: '',
      batchQuantity: '',
      batchPrice: '',
      batchDiscount: 0,
      name: '',
      brand: '',
      category: '',
      quantity: '',
      minStock: '',
      price: '',
      supplier: '',
      distributor: '',
      warehouseId: '',
      description: '',
      discount: 0,
      isRawMaterial: false,
    })
    setEditingProduct(null)
    setShowModal(false)
  }

  const handleEdit = (product) => {
    setFormData({
      productId: product.productId || '',
      batchId: product.batchId || '',
      batchQuantity: product.batchQuantity?.toString() || product.quantity?.toString() || '',
      batchPrice: product.batchPrice?.toString() || product.price?.toString() || '',
      batchDiscount: product.batchDiscount || 0,
      name: product.name,
      brand: product.brand || '',
      category: product.category,
      quantity: product.batchQuantity?.toString() || product.quantity?.toString() || '',
      minStock: product.minStock.toString(),
      price: product.batchPrice?.toString() || product.price?.toString() || '',
      supplier: product.supplier,
      distributor: product.distributor || '',
      warehouseId: product.warehouseId || '',
      description: product.description || '',
      discount: product.batchDiscount || product.discount || 0,
      isRawMaterial: product.isRawMaterial || false
    })
    setEditingProduct(product)
    setShowModal(true)
  }

  const getWarehouseName = (warehouseId) => {
    const warehouse = warehouses.find(w => w._id === warehouseId)
    return warehouse ? warehouse.name : 'Unknown'
  }

  const filteredProducts = products.filter(product => {
    // Apply search filter
    const matchesSearch = 
      (product.name && product.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.productId && product.productId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Apply tab filter
    switch(activeTab) {
      case 'raw': return matchesSearch && product.isRawMaterial;
      case 'production': return matchesSearch && product.isRawMaterial; // Show raw materials for production
      case 'storage': return matchesSearch && !product.isRawMaterial;
      case 'distribute': return matchesSearch && product.distributor;
      default: return matchesSearch;
    }
  })

  const lowStockProducts = products.filter(product => (product.batchQuantity || product.quantity) <= product.minStock)
  const rawMaterials = products.filter(product => product.isRawMaterial)
  const finishedProducts = products.filter(product => !product.isRawMaterial)

  if (loading) {
    return (
      <div className="container" style={{ padding: '40px 20px' }}>
        <div className="loading">Loading inventory...</div>
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
            {activeTab === 'raw' && 'Raw Materials'}
            {activeTab === 'production' && 'Production'}
            {activeTab === 'storage' && 'Storage'}
            {activeTab === 'distribute' && 'Distribute'}
          </h1>
          <p style={{ color: '#6c757d' }}>
            {activeTab === 'raw' && 'Manage raw materials inventory with batch tracking'}
            {activeTab === 'production' && 'Convert raw materials into finished products'}
            {activeTab === 'storage' && 'View finished products ready for distribution'}
            {activeTab === 'distribute' && 'Manage suppliers and distributors'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {activeTab === 'production' && (
            <button
              className="btn btn-success"
              onClick={() => setShowProductionModal(true)}
            >
              <Factory size={18} />
              Start Production
            </button>
          )}
          {activeTab === 'distribute' && (
            <button
              className="btn btn-secondary"
              onClick={() => setShowDistributeModal(true)}
            >
              <Truck size={18} />
              Create Dispatch
            </button>
          )}
          {(activeTab === 'raw' || activeTab === 'storage') && (
            <button
              className="btn btn-primary"
              onClick={() => setShowModal(true)}
            >
              <Plus size={18} />
              Add {activeTab === 'raw' ? 'Raw Material' : 'Product'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e9ecef'
        }}>
          {['raw', 'production', 'storage', 'distribute'].map((tab) => (
            <button
              key={tab}
              style={{
                padding: '12px 24px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                color: activeTab === tab ? '#212529' : '#6c757d',
                borderBottom: activeTab === tab ? '2px solid #212529' : '2px solid transparent',
                textTransform: 'capitalize'
              }}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'raw' && 'Raw Materials'}
              {tab === 'production' && 'Production'}
              {tab === 'storage' && 'Storage'}
              {tab === 'distribute' && 'Distribute'}
            </button>
          ))}
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
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
          <AlertTriangle size={20} style={{ color: '#856404' }} />
          <div>
            <strong style={{ color: '#856404' }}>Low Stock Alert:</strong>
            <span style={{ color: '#856404', marginLeft: '8px' }}>
              {lowStockProducts.length} product(s) are running low on stock
            </span>
          </div>
        </div>
      )}

      {/* Search - not for distribute tab */}
      {activeTab !== 'distribute' && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ position: 'relative', maxWidth: '400px' }}>
            <Search size={18} style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#6c757d'
            }} />
            <input
              type="text"
              placeholder="Search products by name, ID, or category..."
              className="form-input"
              style={{ paddingLeft: '40px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Distribute Tab Content */}
      {activeTab === 'distribute' && (
        <div className="grid grid-2">
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Factory size={20} />
              Suppliers ({suppliers.length})
            </h3>
            {suppliers.length === 0 ? (
              <p style={{ color: '#6c757d', textAlign: 'center', padding: '20px' }}>
                No suppliers found. Add products with suppliers to see them here.
              </p>
            ) : (
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {suppliers.map((supplier, index) => (
                  <div key={index} style={{
                    padding: '12px',
                    borderBottom: '1px solid #e9ecef',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <Users size={16} style={{ color: '#6c757d' }} />
                    <span>{supplier.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Truck size={20} />
              Distributors ({distributors.length})
            </h3>
            {distributors.length === 0 ? (
              <p style={{ color: '#6c757d', textAlign: 'center', padding: '20px' }}>
                No distributors found. Add products with distributors to see them here.
              </p>
            ) : (
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {distributors.map((distributor, index) => (
                  <div key={index} style={{
                    padding: '12px',
                    borderBottom: '1px solid #e9ecef',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <Users size={16} style={{ color: '#6c757d' }} />
                    <span>{distributor.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Products Table - for raw, production, storage tabs */}
      {activeTab !== 'distribute' && (
        <div className="card" style={{ 
          padding: 0, 
          overflow: 'auto',
          maxHeight: '70vh',
          border: '1px solid #e9ecef'
        }}>
          <div style={{ 
            overflowX: 'auto',
            overflowY: 'auto',
            minWidth: '100%'
          }}>
            <table className="table" style={{
              minWidth: activeTab === 'storage' ? '1400px' : '1200px',
              margin: 0
            }}>
            <thead>
              <tr>
                <th>Batch ID</th>
                <th>Product ID</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Batch Quantity</th>
                <th>Batch Price</th>
                {activeTab === 'storage' && <th>Batch Discount</th>}
               {activeTab === 'storage' && <th>Final Price</th>}
                {activeTab !== 'production' && <th>Type</th>}
                <th>Supplier</th>
                {activeTab === 'storage' && <th>Distributor</th>}
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product._id} data-product-id={product._id}>
                  <td>
                    <code style={{ fontSize: '12px', backgroundColor: '#e9ecef', padding: '2px 6px', borderRadius: '4px' }}>
                      {product.batchId || 'LEGACY'}
                    </code>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Hash size={14} style={{ color: '#6c757d' }} />
                      <code style={{ fontSize: '12px', backgroundColor: '#f8f9fa', padding: '2px 6px', borderRadius: '4px' }}>
                        {product.productId || 'N/A'}
                      </code>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Package size={16} style={{ color: '#6c757d' }} />
                      {product.name || 'N/A'}
                    </div>
                  </td>
                  <td>{product.category || 'N/A'}</td>
                  <td>
                    <span style={{
                      color: (product.batchQuantity || product.quantity) <= product.minStock ? '#dc3545' : '#28a745',
                      fontWeight: '500'
                    }}>
                      {product.batchQuantity || product.quantity}
                    </span>
                  </td>
                  <td>₨{(product.batchPrice || product.price).toFixed(2)}</td>
                  {activeTab === 'storage' && <td>{product.batchDiscount || product.discount || 0}%</td>}
                  {activeTab === 'storage' && (
                    <td>
                      <div>
                        <span style={{ fontWeight: '500' }}>
                          ₨{(product.batchPrice || product.price).toFixed(2)}
                        </span>
                        {(product.batchDiscount || product.discount) > 0 && (
                          <div style={{ fontSize: '11px', color: '#6c757d' }}>
                            Original: ₨{calculateOriginalPrice(product.batchPrice || product.price, product.batchDiscount || product.discount).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </td>
                  )}
                  {activeTab !== 'production' && <td>{product.isRawMaterial ? 'Raw' : 'Finished'}</td>}
                  <td>{product.supplier}</td>
                  {activeTab === 'storage' && <td>{product.distributor || '-'}</td>}
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: (product.batchQuantity || product.quantity) <= product.minStock ? '#f8d7da' : '#d4edda',
                      color: (product.batchQuantity || product.quantity) <= product.minStock ? '#721c24' : '#155724'
                    }}>
                      {(product.batchQuantity || product.quantity) <= product.minStock ? 'Low Stock' : 'In Stock'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {activeTab !== 'production' && (
                        <>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px' }}
                            onClick={() => handleEdit(product)}
                          >
                            <Edit size={14} />
                          </button>
                          {activeTab === 'storage' && (
                            <button
                              className="btn"
                              style={{ 
                                padding: '6px 12px',
                                backgroundColor: '#fd7e14',
                                color: 'white',
                                border: 'none'
                              }}
                              onClick={() => handleApplyDiscount(product)}
                              title="Apply Batch Discount"
                            >
                              %
                            </button>
                          )}
                        </>
                      )}
                      <button
                        className="btn btn-danger"
                        style={{ padding: '6px 12px' }}
                        onClick={() => handleDelete(product._id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => resetForm()}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: '600' }}>
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h2>
            {!editingProduct && (
              <div style={{
                padding: '12px',
                backgroundColor: '#d4edda',
                borderRadius: '6px',
                marginBottom: '20px',
                fontSize: '14px',
                color: '#155724'
              }}>
                <strong>Note:</strong> A unique Product ID and Batch ID will be auto-generated and a pending order will be created in Finance.
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="grid grid-2">
                {editingProduct && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Product ID</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.productId}
                        disabled
                        style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Batch ID</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.batchId}
                        disabled
                        style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }}
                      />
                    </div>
                  </>
                )}
                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                {activeTab !== 'production' && (
                  <div className="form-group">
                    <label className="form-label">Brand</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Batch Quantity *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.batchQuantity}
                    onChange={(e) => setFormData({ ...formData, batchQuantity: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Minimum Stock *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Batch Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={formData.batchPrice}
                    onChange={(e) => setFormData({ ...formData, batchPrice: e.target.value })}
                    required
                  />
                </div>
                {activeTab === 'storage' && (
                  <div className="form-group">
                    <label className="form-label">Batch Discount (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="form-input"
                      value={formData.batchDiscount}
                      onChange={(e) => setFormData({ ...formData, batchDiscount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Warehouse *</label>
                  <select
                    className="form-select"
                    value={formData.warehouseId}
                    onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                    required
                  >
                    <option value="">Select Warehouse</option>
                    {warehouses.filter(w => w.status === 'active').map((warehouse) => (
                      <option key={warehouse._id} value={warehouse._id}>
                        {warehouse.name} - {warehouse.location}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Supplier *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    required
                  />
                </div>
                {activeTab === 'storage' && (
                  <div className="form-group">
                    <label className="form-label">Distributor</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.distributor}
                      onChange={(e) => setFormData({ ...formData, distributor: e.target.value })}
                    />
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                  {editingProduct ? 'Update' : 'Add'} {activeTab === 'raw' ? 'Raw Material' : 'Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Production Modal */}
      {showProductionModal && (
        <div className="modal-overlay" onClick={() => resetProductionForm()}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: '600' }}>
              Start Production
            </h2>
            <form onSubmit={handleProductionSubmit}>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={productionData.productName}
                    onChange={(e) => setProductionData({ ...productionData, productName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Batch ID</label>
                  <input
                    type="text"
                    className="form-input"
                    value={productionData.batchId}
                    onChange={(e) => setProductionData({ ...productionData, batchId: e.target.value })}
                    placeholder="Auto-generated if empty"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Batch Quantity *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={productionData.batchQuantity}
                    onChange={(e) => setProductionData({ ...productionData, batchQuantity: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Batch Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={productionData.batchPrice}
                    onChange={(e) => setProductionData({ ...productionData, batchPrice: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">Raw Materials Used</label>
                {productionData.rawMaterialsUsed.map((material, index) => (
                  <div key={index} style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
                    <select
                      className="form-select"
                      value={material.productId}
                      onChange={(e) => {
                        const updated = [...productionData.rawMaterialsUsed]
                        updated[index].productId = e.target.value
                        setProductionData({ ...productionData, rawMaterialsUsed: updated })
                      }}
                      style={{ flex: 2 }}
                    >
                      <option value="">Select Raw Material</option>
                      {rawMaterials.map((rm) => (
                        <option key={rm._id} value={rm.productId}>
                          {rm.name} (Available: {rm.batchQuantity || rm.quantity})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Quantity"
                      value={material.quantity}
                      onChange={(e) => {
                        const updated = [...productionData.rawMaterialsUsed]
                        updated[index].quantity = e.target.value
                        setProductionData({ ...productionData, rawMaterialsUsed: updated })
                      }}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => {
                        const updated = productionData.rawMaterialsUsed.filter((_, i) => i !== index)
                        setProductionData({ ...productionData, rawMaterialsUsed: updated })
                      }}
                      style={{ padding: '6px 12px' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={addRawMaterial}
                  style={{ marginTop: '8px' }}
                >
                  <Plus size={16} />
                  Add Raw Material
                </button>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={resetProductionForm}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-success">
                  Start Production
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Distribute Modal */}
      {showDistributeModal && (
        <div className="modal-overlay" onClick={() => resetDistributeForm()}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: '600' }}>
              Create Dispatch Order
            </h2>
            <form onSubmit={handleDistributeSubmit}>
              <div className="form-group">
                <label className="form-label">Product *</label>
                <select
                  className="form-select"
                  value={distributeData.productId}
                  onChange={(e) => setDistributeData({ ...distributeData, productId: e.target.value })}
                  required
                >
                  <option value="">Select Product</option>
                  {finishedProducts.map((product) => (
                    <option key={product._id} value={product.productId}>
                      {product.name} - Batch: {product.batchId} (Available: {product.batchQuantity || product.quantity})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Quantity *</label>
                <input
                  type="number"
                  className="form-input"
                  value={distributeData.quantity}
                  onChange={(e) => setDistributeData({ ...distributeData, quantity: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Distributor *</label>
                <input
                  type="text"
                  className="form-input"
                  value={distributeData.distributor}
                  onChange={(e) => setDistributeData({ ...distributeData, distributor: e.target.value })}
                  placeholder="Enter distributor name"
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={resetDistributeForm}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Discount Modal */}
      {showDiscountModal && selectedBatch && (
        <div className="modal-overlay" onClick={() => resetDiscountForm()}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: '600' }}>
              Apply Batch Discount
            </h2>
            <div style={{
              padding: '16px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                Batch Details
              </h4>
              <div style={{ fontSize: '14px', color: '#495057' }}>
                <p><strong>Product:</strong> {selectedBatch.name}</p>
                <p><strong>Batch ID:</strong> {selectedBatch.batchId}</p>
                <p><strong>Quantity:</strong> {selectedBatch.batchQuantity || selectedBatch.quantity}</p>
                <p><strong>Current Price per Unit:</strong> ₨{(selectedBatch.batchPrice || selectedBatch.price).toFixed(2)}</p>
                <p><strong>Total Batch Value:</strong> ₨{((selectedBatch.batchPrice || selectedBatch.price) * (selectedBatch.batchQuantity || selectedBatch.quantity)).toLocaleString()}</p>
              </div>
            </div>
            <form onSubmit={handleDiscountSubmit}>
              <div className="form-group">
                <label className="form-label">Discount Type *</label>
                <select
                  className="form-select"
                  value={discountData.discountType}
                  onChange={(e) => setDiscountData({ ...discountData, discountType: e.target.value })}
                  required
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (PKR)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">
                  Discount Value * 
                  {discountData.discountType === 'percentage' ? ' (%)' : ' (PKR per unit)'}
                </label>
                <input
                  type="number"
                  step={discountData.discountType === 'percentage' ? '0.1' : '0.01'}
                  min="0"
                  max={discountData.discountType === 'percentage' ? '100' : undefined}
                  className="form-input"
                  value={discountData.discountValue}
                  onChange={(e) => setDiscountData({ ...discountData, discountValue: e.target.value })}
                  placeholder={discountData.discountType === 'percentage' ? 'e.g., 10' : 'e.g., 500'}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Reason for Discount</label>
                <input
                  type="text"
                  className="form-input"
                  value={discountData.reason}
                  onChange={(e) => setDiscountData({ ...discountData, reason: e.target.value })}
                  placeholder="e.g., Bulk order, Seasonal sale, Clearance"
                />
              </div>
              
              {/* Discount Preview */}
              {discountData.discountValue && (
                <div style={{
                  padding: '16px',
                  backgroundColor: '#e3f2fd',
                  borderRadius: '8px',
                  marginBottom: '20px'
                }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: '#1565c0' }}>
                    Discount Preview
                  </h4>
                  {(() => {
                    const discountValue = parseFloat(discountData.discountValue)
                    const originalPrice = selectedBatch.batchPrice || selectedBatch.price
                    const quantity = selectedBatch.batchQuantity || selectedBatch.quantity
                    
                    let newPrice, totalDiscount, discountPercentage
                    
                    if (discountData.discountType === 'percentage') {
                      newPrice = originalPrice * (1 - discountValue / 100)
                      totalDiscount = (originalPrice - newPrice) * quantity
                      discountPercentage = discountValue
                    } else {
                      newPrice = Math.max(0, originalPrice - discountValue)
                      totalDiscount = discountValue * quantity
                      discountPercentage = ((discountValue / originalPrice) * 100).toFixed(1)
                    }
                    
                    return (
                      <div style={{ fontSize: '14px', color: '#1565c0' }}>
                        <p><strong>New Price per Unit:</strong> ₨{newPrice.toFixed(2)} (was ₨{originalPrice.toFixed(2)})</p>
                        <p><strong>Discount per Unit:</strong> ₨{(originalPrice - newPrice).toFixed(2)} ({discountPercentage}%)</p>
                        <p><strong>Total Batch Discount:</strong> ₨{totalDiscount.toLocaleString()}</p>
                        <p><strong>New Batch Value:</strong> ₨{(newPrice * quantity).toLocaleString()}</p>
                      </div>
                    )
                  })()}
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={resetDiscountForm}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Apply Discount
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default InventoryManagement