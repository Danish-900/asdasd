import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, DollarSign, TrendingUp, TrendingDown, Clock, ShoppingCart, AlertTriangle, FileText, Download } from 'lucide-react'
import { format } from 'date-fns'
import api from '../utils/api'

const FinancialManagement = () => {
  const [payrollPending, setPayrollPending] = useState(false)
  const [payrollProcessed, setPayrollProcessed] = useState(false)
  const [ledgerFilters, setLedgerFilters] = useState({
    entity: '',
    period: 'month',
    date: new Date().toISOString().split('T')[0]
  })
  const [transactions, setTransactions] = useState([])
  const [products, setProducts] = useState([])
  const [showLedgerModal, setShowLedgerModal] = useState(false)
  const [ledgerData, setLedgerData] = useState([])
  const [dailyReport, setDailyReport] = useState(null)
  const [showDailyReportModal, setShowDailyReportModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [selectedPendingOrder, setSelectedPendingOrder] = useState(null)
  const [selectedDispatchOrder, setSelectedDispatchOrder] = useState(null)
  const [formData, setFormData] = useState({
    type: 'income',
    category: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    productId: '',
    quantity: '',
    orderType: 'purchase'
  })
  const [orderData, setOrderData] = useState({
    productId: '',
    quantity: '',
    unitPrice: '',
    purchaseOrder: '',
    orderType: 'purchase',
    supplier: ''
  })
  const [paymentData, setPaymentData] = useState({
    dispatchId: '',
    paymentAmount: ''
  })

  useEffect(() => {
    fetchTransactions()
    fetchProducts()
    checkPayrollStatus()
  }, [])

  const checkPayrollStatus = async () => {
    try {
      const response = await api.get('/financial/payroll-status')
      setPayrollPending(response.data.isPending)
      setPayrollProcessed(response.data.isProcessed)
    } catch (error) {
      console.error('Error checking payroll status:', error)
    }
  }

  const fetchTransactions = async () => {
    try {
      const response = await api.get('/financial')
      setTransactions(response.data)
    } catch (error) {
      console.error('Error fetching transactions:', error)
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

  const processPayroll = async () => {
    try {
      await api.post('/financial/process-payroll')
      setPayrollPending(false)
      setPayrollProcessed(true)
      fetchTransactions()
      alert('Payroll processed successfully!')
    } catch (error) {
      console.error('Error processing payroll:', error)
      alert('Error processing payroll: ' + (error.response?.data?.error || error.message))
    }
  }

  const generateLedger = async () => {
    try {
      const response = await api.get('/financial/ledger', {
        params: ledgerFilters
      })
      setLedgerData(response.data)
      setShowLedgerModal(true)
    } catch (error) {
      console.error('Error generating ledger:', error)
      alert('Error generating ledger: ' + (error.response?.data?.error || error.message))
    }
  }

  const generateDailyReport = async () => {
    try {
      const response = await api.get('/financial/daily-report')
      setDailyReport(response.data)
      setShowDailyReportModal(true)
    } catch (error) {
      console.error('Error generating daily report:', error)
      alert('Error generating daily report: ' + (error.response?.data?.error || error.message))
    }
  }

  const exportToPDF = () => {
    const printContent = document.getElementById('daily-report-content')
    const originalContent = document.body.innerHTML
    document.body.innerHTML = printContent.innerHTML
    window.print()
    document.body.innerHTML = originalContent
    window.location.reload()
  }

  const updateInventoryAndWarehouse = async (productId, quantity, orderType) => {
    try {
      const product = products.find(p => p.productId === productId)
      if (!product) {
        alert('Product not found!')
        return false
      }

      const newQuantity = orderType === 'purchase' 
        ? product.quantity + parseInt(quantity)
        : product.quantity - parseInt(quantity)

      if (newQuantity < 0) {
        alert('Insufficient inventory for this sale')
        return false
      }

      await api.put(`/inventory/${product._id}`, {
        ...product,
        quantity: newQuantity
      })

      if (product.warehouseId) {
        const warehouseResponse = await api.get('/warehouse')
        const warehouse = warehouseResponse.data.find(w => w._id === product.warehouseId)
        if (warehouse) {
          const warehouseStockChange = orderType === 'purchase' ? parseInt(quantity) : -parseInt(quantity)
          await api.put(`/warehouse/${warehouse._id}`, {
            ...warehouse,
            currentStock: Math.max(0, warehouse.currentStock + warehouseStockChange)
          })
        }
      }

      return true
    } catch (error) {
      console.error('Error updating inventory/warehouse:', error)
      return false
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const transactionData = {
        ...formData,
        amount: parseFloat(formData.amount),
        date: new Date().toISOString()
      }
      
      if (editingTransaction) {
        await api.put(`/financial/${editingTransaction._id}`, transactionData)
      } else {
        await api.post('/financial', transactionData)
      }
      
      fetchTransactions()
      fetchProducts()
      resetForm()
    } catch (error) {
      console.error('Error saving transaction:', error)
    }
  }

  const handleOrderSubmit = async (e) => {
    e.preventDefault()
    try {
      if (!orderData.purchaseOrder.trim()) {
        alert('Purchase Order number is required!')
        return
      }

      const totalAmount = parseFloat(orderData.unitPrice) * parseInt(orderData.quantity)
      
      const transactionData = {
        type: orderData.orderType === 'purchase' ? 'expense' : 'income',
        category: orderData.orderType === 'purchase' ? 'Purchase Order' : 'Sales Order',
        amount: totalAmount,
        description: `${orderData.orderType === 'purchase' ? 'Purchase' : 'Sale'} of ${orderData.quantity} units - Product ID: ${orderData.productId} - PO: ${orderData.purchaseOrder}`,
        date: new Date().toISOString(),
        productId: orderData.productId,
        quantity: orderData.quantity,
        purchaseOrder: orderData.purchaseOrder,
        supplier: orderData.supplier,
        status: 'completed'
      }

      const success = await updateInventoryAndWarehouse(orderData.productId, orderData.quantity, orderData.orderType)
      if (!success) return

      await api.post('/financial', transactionData)
      
      if (selectedPendingOrder) {
        await api.delete(`/financial/${selectedPendingOrder._id}`)
      }
      
      fetchTransactions()
      fetchProducts()
      resetOrderForm()
    } catch (error) {
      console.error('Error saving order:', error)
    }
  }

  const handleDispatchSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await api.post('/financial/dispatch', {
        productId: orderData.productId,
        quantity: parseInt(orderData.quantity),
        distributor: orderData.supplier,
        unitPrice: parseFloat(orderData.unitPrice)
      })
      
      fetchTransactions()
      fetchProducts()
      resetOrderForm()
      alert('Dispatch order created successfully! Invoice: ' + response.data.transaction.invoiceNumber)
    } catch (error) {
      console.error('Error creating dispatch:', error)
      alert('Error creating dispatch: ' + (error.response?.data?.error || error.message))
    }
  }

  const handlePaymentSubmit = async (e) => {
    e.preventDefault()
    try {
      const response = await api.post('/financial/payment', paymentData)
      
      fetchTransactions()
      alert('Payment processed successfully! Invoice: ' + response.data.payment.invoiceNumber)
      setPaymentData({ dispatchId: '', paymentAmount: '' })
      setShowPaymentModal(false)
    } catch (error) {
      console.error('Error processing payment:', error)
      alert('Error processing payment: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await api.delete(`/financial/${id}`)
        fetchTransactions()
      } catch (error) {
        console.error('Error deleting transaction:', error)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      type: 'income',
      category: '',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      productId: '',
      quantity: '',
      orderType: 'purchase'
    })
    setEditingTransaction(null)
    setShowModal(false)
  }

  const resetOrderForm = () => {
    setOrderData({
      productId: '',
      quantity: '',
      unitPrice: '',
      purchaseOrder: '',
      orderType: 'purchase',
      supplier: ''
    })
    setSelectedPendingOrder(null)
    setShowOrderModal(false)
  }

  const handleEdit = (transaction) => {
    setFormData({
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount.toString(),
      description: transaction.description,
      date: new Date(transaction.date).toISOString().split('T')[0],
      productId: transaction.productId || '',
      quantity: transaction.quantity || '',
      orderType: transaction.type === 'income' ? 'sale' : 'purchase'
    })
    setEditingTransaction(transaction)
    setShowModal(true)
  }

  const handlePendingOrderClick = (transaction) => {
    const product = products.find(p => p.productId === transaction.productId)
    setOrderData({
      productId: transaction.productId || '',
      quantity: '1',
      unitPrice: product ? product.price.toString() : '',
      purchaseOrder: '',
      orderType: 'purchase',
      supplier: product ? product.supplier : ''
    })
    setSelectedPendingOrder(transaction)
    setShowOrderModal(true)
  }

  const handleDispatchClick = (transaction) => {
    setSelectedDispatchOrder(transaction)
    setPaymentData({
      dispatchId: transaction._id,
      paymentAmount: transaction.amount.toString()
    })
    setShowPaymentModal(true)
  }

  const getProductName = (productId) => {
    const product = products.find(p => p.productId === productId)
    return product ? product.name : 'Unknown Product'
  }

  const totalIncome = transactions
    .filter(t => t.type === 'income' && t.status !== 'pending')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpenses = transactions
    .filter(t => t.type === 'expense' && t.status !== 'pending')
    .reduce((sum, t) => sum + t.amount, 0)

  const netProfit = totalIncome - totalExpenses
  const pendingOrders = transactions.filter(t => t.status === 'pending')
  const dispatchOrders = transactions.filter(t => t.dispatchType === 'dispatch' && t.status === 'pending')

  if (loading) {
    return (
      <div className="container" style={{ padding: '40px 20px' }}>
        <div className="loading">Loading financial data...</div>
      </div>
    )
  }

  return (
    <div className="container" style={{ padding: '40px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#212529', marginBottom: '8px' }}>
            Financial Management
          </h1>
          <p style={{ color: '#6c757d' }}>
            Track income, expenses, and financial performance with automated invoicing
          </p>
        </div>
        {payrollPending && (
          <div style={{ 
            backgroundColor: '#fff3cd', 
            border: '1px solid #ffeaa7',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <AlertTriangle size={20} style={{ color: '#856404' }} />
            <div>
              <strong style={{ color: '#856404' }}>Payroll Due:</strong>
              <span style={{ color: '#856404', marginLeft: '8px' }}>
                Monthly payroll processing is pending
              </span>
            </div>
            <button 
              className="btn btn-primary" 
              onClick={processPayroll}
              style={{ marginLeft: '16px' }}
            >
              Process Payroll
            </button>
          </div>
        )}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowOrderModal(true)}
          >
            <ShoppingCart size={18} />
            Add Order
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
          >
            <Plus size={18} />
            Add Transaction
          </button>
        </div>
      </div>

      {/* Pending Orders Alert */}
      {(pendingOrders.length > 0 || dispatchOrders.length > 0) && (
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
            <strong style={{ color: '#856404' }}>Pending Actions:</strong>
            <span style={{ color: '#856404', marginLeft: '8px' }}>
              {pendingOrders.length} pending order(s), {dispatchOrders.length} dispatch(es) awaiting payment
            </span>
          </div>
        </div>
      )}

      {/* Financial Summary */}
      <div className="grid grid-3" style={{ marginBottom: '32px' }}>
        <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #28a745' }}>
          <TrendingUp size={32} style={{ color: '#28a745', marginBottom: '12px' }} />
          <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px', color: '#28a745' }}>
            PKR {totalIncome.toLocaleString()}
          </h3>
          <p style={{ color: '#6c757d', fontSize: '14px' }}>Total Income</p>
        </div>
        
        <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #dc3545' }}>
          <TrendingDown size={32} style={{ color: '#dc3545', marginBottom: '12px' }} />
          <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px', color: '#dc3545' }}>
            PKR {totalExpenses.toLocaleString()}
          </h3>
          <p style={{ color: '#6c757d', fontSize: '14px' }}>Total Expenses</p>
        </div>
        
        <div className="card" style={{ 
          textAlign: 'center', 
          borderLeft: `4px solid ${netProfit >= 0 ? '#28a745' : '#dc3545'}` 
        }}>
          <DollarSign size={32} style={{ 
            color: netProfit >= 0 ? '#28a745' : '#dc3545', 
            marginBottom: '12px' 
          }} />
          <h3 style={{ 
            fontSize: '24px', 
            fontWeight: '600', 
            marginBottom: '4px',
            color: netProfit >= 0 ? '#28a745' : '#dc3545'
          }}>
            PKR {netProfit.toLocaleString()}
          </h3>
          <p style={{ color: '#6c757d', fontSize: '14px' }}>Net Profit</p>
        </div>
      </div>

      {/* Ledger and Report Controls */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ minWidth: '200px' }}>
          <label className="form-label">Entity (Supplier/Distributor)</label>
          <input
            type="text"
            className="form-input"
            value={ledgerFilters.entity}
            onChange={(e) => setLedgerFilters({...ledgerFilters, entity: e.target.value})}
            placeholder="Enter name"
          />
        </div>
        <div className="form-group" style={{ minWidth: '150px' }}>
          <label className="form-label">Period</label>
          <select 
            className="form-select"
            value={ledgerFilters.period}
            onChange={(e) => setLedgerFilters({...ledgerFilters, period: e.target.value})}
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
          </select>
        </div>
        <div className="form-group" style={{ minWidth: '150px' }}>
          <label className="form-label">Date</label>
          <input 
            type="date" 
            className="form-input"
            value={ledgerFilters.date}
            onChange={(e) => setLedgerFilters({...ledgerFilters, date: e.target.value})}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'end' }}>
          <button 
            className="btn btn-secondary" 
            onClick={generateLedger}
          >
            Generate Ledger
          </button>
          <button 
            className="btn btn-primary" 
            onClick={generateDailyReport}
          >
            <FileText size={18} />
            Daily Report
          </button>
        </div>
      </div>

      {/* Transactions Table */}
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
            minWidth: '1200px',
            margin: 0
          }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Category</th>
                <th>Description</th>
                <th>Product ID</th>
                <th>Amount</th>
                <th>Invoice #</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction._id} style={{
                  backgroundColor: transaction.status === 'pending' ? '#fff3cd' : 'transparent',
                  cursor: transaction.status === 'pending' ? 'pointer' : 'default'
                }}
                onClick={() => {
                  if (transaction.status === 'pending') {
                    if (transaction.dispatchType === 'dispatch') {
                      handleDispatchClick(transaction)
                    } else {
                      handlePendingOrderClick(transaction)
                    }
                  }
                }}>
                  <td>{format(new Date(transaction.date), 'MMM dd, yyyy')}</td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: transaction.type === 'income' ? '#d4edda' : '#f8d7da',
                      color: transaction.type === 'income' ? '#155724' : '#721c24'
                    }}>
                      {transaction.type === 'income' ? 'Income' : 'Expense'}
                    </span>
                  </td>
                  <td>{transaction.category}</td>
                  <td>{transaction.description}</td>
                  <td>
                    {transaction.productId ? (
                      <div>
                        <code style={{ fontSize: '12px', backgroundColor: '#f8f9fa', padding: '2px 6px', borderRadius: '4px' }}>
                          {transaction.productId}
                        </code>
                        <div style={{ fontSize: '11px', color: '#6c757d' }}>
                          {getProductName(transaction.productId)}
                        </div>
                      </div>
                    ) : '-'}
                  </td>
                  <td>
                    <span style={{
                      color: transaction.type === 'income' ? '#28a745' : '#dc3545',
                      fontWeight: '500'
                    }}>
                      {transaction.type === 'income' ? '+' : '-'}PKR {transaction.amount.toLocaleString()}
                    </span>
                  </td>
                  <td>
                    {transaction.invoiceNumber ? (
                      <code style={{ fontSize: '11px' }}>{transaction.invoiceNumber}</code>
                    ) : '-'}
                  </td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: transaction.status === 'pending' ? '#fff3cd' : '#d4edda',
                      color: transaction.status === 'pending' ? '#856404' : '#155724'
                    }}>
                      {transaction.status === 'pending' ? 
                        (transaction.dispatchType === 'dispatch' ? 'Awaiting Payment' : 'Pending Order') : 
                        'Completed'
                      }
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {transaction.status !== 'pending' && (
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px' }}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEdit(transaction)
                          }}
                        >
                          <Edit size={14} />
                        </button>
                      )}
                      <button
                        className="btn btn-danger"
                        style={{ padding: '6px 12px' }}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(transaction._id)
                        }}
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => resetForm()}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: '600' }}>
              {editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Type *</label>
                  <select
                    className="form-select"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    required
                  >
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., Sales, Equipment, Utilities"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Amount *</label>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ marginRight: '8px' }}>PKR</span>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Product ID (Optional)</label>
                  <select
                    className="form-select"
                    value={formData.productId}
                    onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                  >
                    <option value="">Select Product (Optional)</option>
                    {products.map((product) => (
                      <option key={product._id} value={product.productId}>
                        {product.productId} - {product.name}
                      </option>
                    ))}
                  </select>
                </div>
                {formData.productId && (
                  <div className="form-group">
                    <label className="form-label">Quantity</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      placeholder="Enter quantity"
                    />
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Description *</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                <button type="submit" className="btn btn-primary">
                  {editingTransaction ? 'Update' : 'Add'} Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Order Modal */}
      {showOrderModal && (
        <div className="modal-overlay" onClick={() => resetOrderForm()}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: '600' }}>
              {selectedPendingOrder ? 'Complete Pending Order' : 'Add New Order'}
            </h2>
            <form onSubmit={orderData.orderType === 'dispatch' ? handleDispatchSubmit : handleOrderSubmit}>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Order Type *</label>
                  <select
                    className="form-select"
                    value={orderData.orderType}
                    onChange={(e) => setOrderData({ ...orderData, orderType: e.target.value })}
                    required
                    disabled={selectedPendingOrder}
                  >
                    <option value="purchase">Purchase Order</option>
                    <option value="sale">Sales Order</option>
                    <option value="dispatch">Dispatch Order</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Product ID *</label>
                  <select
                    className="form-select"
                    value={orderData.productId}
                    onChange={(e) => {
                      const selectedProduct = products.find(p => p.productId === e.target.value)
                      setOrderData({ 
                        ...orderData, 
                        productId: e.target.value,
                        unitPrice: selectedProduct ? selectedProduct.price.toString() : '',
                        supplier: selectedProduct ? selectedProduct.supplier : ''
                      })
                    }}
                    required
                    disabled={selectedPendingOrder}
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
                  <label className="form-label">Quantity *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={orderData.quantity}
                    onChange={(e) => setOrderData({ ...orderData, quantity: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={orderData.unitPrice}
                    onChange={(e) => setOrderData({ ...orderData, unitPrice: e.target.value })}
                    required
                  />
                </div>
                {orderData.orderType !== 'dispatch' && (
                  <div className="form-group">
                    <label className="form-label">Purchase Order # *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={orderData.purchaseOrder}
                      onChange={(e) => setOrderData({ ...orderData, purchaseOrder: e.target.value })}
                      placeholder="Enter PO number"
                      required
                    />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">
                    {orderData.orderType === 'dispatch' ? 'Distributor' : 'Supplier/Customer'}
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={orderData.supplier}
                    onChange={(e) => setOrderData({ ...orderData, supplier: e.target.value })}
                    placeholder="Enter name"
                  />
                </div>
              </div>
              {orderData.quantity && orderData.unitPrice && (
                <div style={{
                  padding: '12px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '6px',
                  marginBottom: '20px'
                }}>
                  <strong>Total Amount: PKR {(parseFloat(orderData.unitPrice || 0) * parseInt(orderData.quantity || 0)).toLocaleString()}</strong>
                </div>
              )}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={resetOrderForm}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {orderData.orderType === 'dispatch' ? 'Create Dispatch' : 'Complete Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: '600' }}>
              Process Payment
            </h2>
            <form onSubmit={handlePaymentSubmit}>
              <div className="form-group">
                <label className="form-label">Dispatch Order</label>
                <input
                  type="text"
                  className="form-input"
                  value={selectedDispatchOrder?.description || ''}
                  disabled
                  style={{ backgroundColor: '#f8f9fa' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Payment Amount *</label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: '8px' }}>PKR</span>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={paymentData.paymentAmount}
                    onChange={(e) => setPaymentData({ ...paymentData, paymentAmount: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPaymentModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-success">
                  Process Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ledger Modal */}
      {showLedgerModal && (
        <div className="modal-overlay" onClick={() => setShowLedgerModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <h2 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: '600' }}>
              Ledger Report
            </h2>
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
              <strong>Filters:</strong> {ledgerFilters.entity || 'All'} | {ledgerFilters.period} | {new Date(ledgerFilters.date).toLocaleDateString()}
            </div>
            {ledgerData.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#6c757d', padding: '40px' }}>
                No transactions found for the selected criteria.
              </p>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Invoice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerData.map((transaction) => (
                      <tr key={transaction._id}>
                        <td>{format(new Date(transaction.date), 'MMM dd, yyyy')}</td>
                        <td>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '500',
                            backgroundColor: transaction.type === 'income' ? '#d4edda' : '#f8d7da',
                            color: transaction.type === 'income' ? '#155724' : '#721c24'
                          }}>
                            {transaction.type}
                          </span>
                        </td>
                        <td>{transaction.description}</td>
                        <td style={{
                          color: transaction.type === 'income' ? '#28a745' : '#dc3545',
                          fontWeight: '500'
                        }}>
                          {transaction.type === 'income' ? '+' : '-'}PKR {transaction.amount.toLocaleString()}
                        </td>
                        <td>
                          {transaction.invoiceNumber ? (
                            <code style={{ fontSize: '10px' }}>{transaction.invoiceNumber}</code>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="btn btn-secondary" onClick={() => setShowLedgerModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Report Modal */}
      {showDailyReportModal && dailyReport && (
        <div className="modal-overlay" onClick={() => setShowDailyReportModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600' }}>Daily Report</h2>
              <button className="btn btn-primary" onClick={exportToPDF}>
                <Download size={18} />
                Export PDF
              </button>
            </div>
            <div id="daily-report-content">
              <div className="header">
                <h1 style={{ margin: '0 0 10px 0', fontSize: '24px' }}>Factory Management System</h1>
                <h2 style={{ margin: '0', fontSize: '18px', color: '#666' }}>Daily Report - {format(new Date(dailyReport.date), 'MMMM dd, yyyy')}</h2>
              </div>
              
              {/* Executive Summary */}
              <div className="section">
                <div className="summary-box">
                  <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>Executive Summary</h3>
                  <div className="grid">
                    <div>
                      <strong>Net Profit:</strong> 
                      <span className={dailyReport.summary.netProfit >= 0 ? 'text-success' : 'text-danger'}>
                        PKR {dailyReport.summary.netProfit.toLocaleString()}
                      </span>
                    </div>
                    <div><strong>Total Inventory Value:</strong> PKR {dailyReport.inventory.totalValue.toLocaleString()}</div>
                    <div><strong>Total Batches:</strong> {dailyReport.inventory.batchSummary.totalBatches}</div>
                    <div><strong>Transactions:</strong> {dailyReport.financial.transactions}</div>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="section">
                <h3>Financial Summary</h3>
                <div className="grid">
                  <div className="card">
                    <h4 style={{ margin: '0 0 10px 0', color: '#28a745' }}>Income</h4>
                    <p style={{ fontSize: '18px', fontWeight: 'bold', margin: '0' }}>PKR {dailyReport.financial.totalIncome.toLocaleString()}</p>
                    <p style={{ fontSize: '12px', color: '#666', margin: '5px 0 0 0' }}>
                      {dailyReport.financial.salesTransactions.length} sales transactions
                    </p>
                  </div>
                  <div className="card">
                    <h4 style={{ margin: '0 0 10px 0', color: '#dc3545' }}>Expenses</h4>
                    <p style={{ fontSize: '18px', fontWeight: 'bold', margin: '0' }}>PKR {dailyReport.financial.totalExpenses.toLocaleString()}</p>
                    <p style={{ fontSize: '12px', color: '#666', margin: '5px 0 0 0' }}>
                      {dailyReport.financial.expenseTransactions.length} expense transactions
                    </p>
                  </div>
                  <div className="card">
                    <h4 style={{ margin: '0 0 10px 0', color: '#17a2b8' }}>Payroll</h4>
                    <p style={{ fontSize: '18px', fontWeight: 'bold', margin: '0' }}>
                      PKR {dailyReport.financial.payrollTransactions.reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
                    </p>
                    <p style={{ fontSize: '12px', color: '#666', margin: '5px 0 0 0' }}>
                      {dailyReport.financial.payrollTransactions.length} payroll transactions
                    </p>
                  </div>
                </div>
                
                {dailyReport.financial.transactionDetails.length > 0 && (
                  <div style={{ marginTop: '20px' }}>
                    <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>Transaction Details</h4>
                    <div className="card" style={{ 
                      padding: 0,
                      overflow: 'auto',
                      maxHeight: '50vh',
                      border: '1px solid #e9ecef'
                    }}>
                      <div style={{ 
                        overflowX: 'auto',
                        overflowY: 'auto',
                        minWidth: '100%'
                      }}>
                        <table className="table" style={{
                          minWidth: '800px',
                          margin: 0
                        }}>
                          <thead>
                            <tr>
                              <th>Type</th>
                              <th>Category</th>
                              <th>Description</th>
                              <th>Amount</th>
                              <th>Product ID</th>
                              <th>Invoice</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dailyReport.financial.transactionDetails.map((transaction, index) => (
                              <tr key={index}>
                                <td>
                                  <span className={transaction.type === 'income' ? 'text-success' : 'text-danger'}>
                                    {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                                  </span>
                                </td>
                                <td>{transaction.category}</td>
                                <td style={{ maxWidth: '200px', fontSize: '11px' }}>{transaction.description}</td>
                                <td className={transaction.type === 'income' ? 'text-success' : 'text-danger'}>
                                  {transaction.type === 'income' ? '+' : '-'}PKR {transaction.amount.toLocaleString()}
                                </td>
                                <td>{transaction.productId || '-'}</td>
                                <td style={{ fontSize: '10px' }}>{transaction.invoiceNumber || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Batch-wise Inventory Summary */}
              <div className="section">
                <h3>Batch-wise Inventory Summary</h3>
                <div className="summary-box">
                  <div className="grid">
                    <div><strong>Total Batch Value:</strong> PKR {dailyReport.inventory.batchSummary.totalBatchValue.toLocaleString()}</div>
                    <div><strong>Total Discount Value:</strong> PKR {dailyReport.inventory.batchSummary.totalDiscountValue.toLocaleString()}</div>
                    <div><strong>Average Batch Size:</strong> {Math.round(dailyReport.inventory.batchSummary.averageBatchSize)} units</div>
                    <div><strong>Low Stock Items:</strong> <span className="text-warning">{dailyReport.inventory.lowStock}</span></div>
                  </div>
                </div>
              </div>

              {/* Raw Materials */}
              {dailyReport.inventory.rawMaterials.length > 0 && (
                <div className="section">
                  <h3>Raw Materials Inventory</h3>
                  <div className="card" style={{ 
                    padding: 0,
                    overflow: 'auto',
                    maxHeight: '50vh',
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{ 
                      overflowX: 'auto',
                      overflowY: 'auto',
                      minWidth: '100%'
                    }}>
                      <table className="table" style={{
                        minWidth: '1000px',
                        margin: 0
                      }}>
                        <thead>
                          <tr>
                            <th>Product ID</th>
                            <th>Name</th>
                            <th>Batch ID</th>
                            <th>Quantity</th>
                            <th>Unit Price</th>
                            <th>Discount %</th>
                            <th>Total Value</th>
                            <th>Discounted Value</th>
                            <th>Supplier</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dailyReport.inventory.rawMaterials.map((item, index) => (
                            <tr key={index}>
                              <td>{item.productId}</td>
                              <td>{item.name}</td>
                              <td style={{ fontSize: '10px' }}>{item.batchId}</td>
                              <td className="text-center">{item.batchQuantity}</td>
                              <td>PKR {item.batchPrice.toFixed(2)}</td>
                              <td className="text-center">{item.batchDiscount}%</td>
                              <td>PKR {item.totalValue.toLocaleString()}</td>
                              <td className="text-success">PKR {item.discountedValue.toLocaleString()}</td>
                              <td>{item.supplier}</td>
                            </tr>
                          ))}
                          <tr style={{ backgroundColor: '#f8f9fa', fontWeight: 'bold' }}>
                            <td colSpan="6" className="text-right">Total Raw Materials:</td>
                            <td>PKR {dailyReport.inventory.rawMaterials.reduce((sum, item) => sum + item.totalValue, 0).toLocaleString()}</td>
                            <td className="text-success">PKR {dailyReport.inventory.rawMaterials.reduce((sum, item) => sum + item.discountedValue, 0).toLocaleString()}</td>
                            <td></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Finished Products */}
              {dailyReport.inventory.finishedProducts.length > 0 && (
                <div className="section">
                  <h3>Finished Products Inventory</h3>
                  <div className="card" style={{ 
                    padding: 0,
                    overflow: 'auto',
                    maxHeight: '50vh',
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{ 
                      overflowX: 'auto',
                      overflowY: 'auto',
                      minWidth: '100%'
                    }}>
                      <table className="table" style={{
                        minWidth: '1200px',
                        margin: 0
                      }}>
                        <thead>
                          <tr>
                            <th>Product ID</th>
                            <th>Name</th>
                            <th>Batch ID</th>
                            <th>Quantity</th>
                            <th>Unit Price</th>
                            <th>Discount %</th>
                            <th>Total Value</th>
                            <th>Discounted Value</th>
                            <th>Distributor</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dailyReport.inventory.finishedProducts.map((item, index) => (
                            <tr key={index} style={{ backgroundColor: item.isLowStock ? '#fff3cd' : 'transparent' }}>
                              <td>{item.productId}</td>
                              <td>{item.name}</td>
                              <td style={{ fontSize: '10px' }}>{item.batchId}</td>
                              <td className="text-center">{item.batchQuantity}</td>
                              <td>PKR {item.batchPrice.toFixed(2)}</td>
                              <td className="text-center">{item.batchDiscount}%</td>
                              <td>PKR {item.totalValue.toLocaleString()}</td>
                              <td className="text-success">PKR {item.discountedValue.toLocaleString()}</td>
                              <td>{item.distributor || '-'}</td>
                              <td>
                                <span className={item.isLowStock ? 'text-warning' : 'text-success'}>
                                  {item.isLowStock ? 'Low Stock' : 'In Stock'}
                                </span>
                              </td>
                            </tr>
                          ))}
                          <tr style={{ backgroundColor: '#f8f9fa', fontWeight: 'bold' }}>
                            <td colSpan="6" className="text-right">Total Finished Products:</td>
                            <td>PKR {dailyReport.inventory.finishedProducts.reduce((sum, item) => sum + item.totalValue, 0).toLocaleString()}</td>
                            <td className="text-success">PKR {dailyReport.inventory.finishedProducts.reduce((sum, item) => sum + item.discountedValue, 0).toLocaleString()}</td>
                            <td colSpan="2"></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Top Products */}
              {dailyReport.summary.topProducts.length > 0 && (
                <div className="section">
                  <h3>Top Products by Transaction Volume</h3>
                  <div className="card" style={{ 
                    padding: 0,
                    overflow: 'auto',
                    maxHeight: '60vh',
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{ 
                      overflowX: 'auto',
                      overflowY: 'auto',
                      minWidth: '100%'
                    }}>
                      <table className="table" style={{
                        minWidth: '1000px',
                        margin: 0
                      }}>
                        <thead>
                          <tr>
                            <th>Rank</th>
                            <th>Product ID</th>
                            <th>Product Name</th>
                            <th>Transaction Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dailyReport.summary.topProducts.map((product, index) => (
                            <tr key={index}>
                              <td className="text-center">{index + 1}</td>
                              <td>{product.productId}</td>
                              <td>{product.name}</td>
                              <td className="text-center">{product.transactionCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #ddd', textAlign: 'center', fontSize: '12px', color: '#666' }}>
                <p>Generated on {format(new Date(), 'MMMM dd, yyyy HH:mm')} | Factory Management System</p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowDailyReportModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FinancialManagement