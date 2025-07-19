import express from 'express'
import Transaction from '../models/Transaction.js'
import Employee from '../models/Employee.js'
import Product from '../models/Product.js'

const router = express.Router()

// Generate invoice number
const generateInvoiceNumber = () => {
  return 'INV-' + Date.now() + '-' + Math.floor(Math.random() * 1000)
}

// Check if payroll is due (1st of month)
router.get('/payroll-status', async (req, res) => {
  try {
    const today = new Date()
    const isFirstOfMonth = today.getDate() === 1
    
    // Check if payroll already processed this month
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()
    const payrollProcessed = await Transaction.findOne({
      category: 'Payroll',
      date: {
        $gte: new Date(currentYear, currentMonth, 1),
        $lt: new Date(currentYear, currentMonth + 1, 1)
      }
    })
    
    res.json({
      isPending: isFirstOfMonth && !payrollProcessed,
      isProcessed: !!payrollProcessed
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Process payroll
router.post('/process-payroll', async (req, res) => {
  try {
    const employees = await Employee.find({ status: 'active' })
    const totalPayroll = employees.reduce((sum, emp) => sum + emp.salary, 0)
    
    const payrollTransaction = new Transaction({
      type: 'expense',
      category: 'Payroll',
      amount: totalPayroll,
      description: `Monthly payroll for ${employees.length} employees`,
      date: new Date(),
      status: 'completed',
      invoiceNumber: generateInvoiceNumber()
    })
    
    await payrollTransaction.save()
    res.status(201).json(payrollTransaction)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Generate ledger
router.get('/ledger', async (req, res) => {
  try {
    const { type, period, date, entity } = req.query
    const targetDate = new Date(date)
    let startDate, endDate
    
    switch (period) {
      case 'day':
        startDate = new Date(targetDate.setHours(0, 0, 0, 0))
        endDate = new Date(targetDate.setHours(23, 59, 59, 999))
        break
      case 'week':
        startDate = new Date(targetDate.setDate(targetDate.getDate() - targetDate.getDay()))
        endDate = new Date(targetDate.setDate(targetDate.getDate() + 6))
        break
      case 'month':
        startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1)
        endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0)
        break
      case 'year':
        startDate = new Date(targetDate.getFullYear(), 0, 1)
        endDate = new Date(targetDate.getFullYear(), 11, 31)
        break
      default:
        startDate = new Date(targetDate.setHours(0, 0, 0, 0))
        endDate = new Date(targetDate.setHours(23, 59, 59, 999))
    }
    
    let query = {
      date: { $gte: startDate, $lte: endDate }
    }
    
    if (entity) {
      query.$or = [
        { supplier: { $regex: entity, $options: 'i' } },
        { description: { $regex: entity, $options: 'i' } }
      ]
    }
    
    const transactions = await Transaction.find(query).sort({ date: -1 })
    res.json(transactions)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Generate daily report
router.get('/daily-report', async (req, res) => {
  try {
    const { date } = req.query
    const reportDate = date ? new Date(date) : new Date()
    reportDate.setHours(0, 0, 0, 0)
    const nextDay = new Date(reportDate)
    nextDay.setDate(nextDay.getDate() + 1)
    
    const transactions = await Transaction.find({
      date: { $gte: reportDate, $lt: nextDay }
    })
    
    const products = await Product.find()
    const allTransactions = await Transaction.find()
    
    const report = {
      date: reportDate,
      financial: {
        totalIncome: transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
        totalExpenses: transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
        transactions: transactions.length,
        transactionDetails: transactions.map(t => ({
          type: t.type,
          category: t.category,
          amount: t.amount,
          description: t.description,
          productId: t.productId,
          supplier: t.supplier,
          invoiceNumber: t.invoiceNumber,
          date: t.date
        })),
        salesTransactions: transactions.filter(t => t.type === 'income' && t.category !== 'Payment Received'),
        expenseTransactions: transactions.filter(t => t.type === 'expense'),
        payrollTransactions: transactions.filter(t => t.category === 'Payroll')
      },
      inventory: {
        totalProducts: products.length,
        totalValue: products.reduce((sum, p) => sum + ((p.batchPrice || p.price) * (p.batchQuantity || p.quantity)), 0),
        lowStock: products.filter(p => (p.batchQuantity || p.quantity) <= p.minStock).length,
        rawMaterials: products.filter(p => p.isRawMaterial).map(p => ({
          productId: p.productId,
          name: p.name,
          batchId: p.batchId,
          batchQuantity: p.batchQuantity || p.quantity,
          batchPrice: p.batchPrice || p.price,
          batchDiscount: p.batchDiscount || p.discount || 0,
          supplier: p.supplier,
          category: p.category,
          totalValue: (p.batchPrice || p.price) * (p.batchQuantity || p.quantity),
          discountedValue: ((p.batchPrice || p.price) * (p.batchQuantity || p.quantity)) * (1 - (p.batchDiscount || p.discount || 0) / 100)
        })),
        finishedProducts: products.filter(p => !p.isRawMaterial).map(p => ({
          productId: p.productId,
          name: p.name,
          batchId: p.batchId,
          batchQuantity: p.batchQuantity || p.quantity,
          batchPrice: p.batchPrice || p.price,
          batchDiscount: p.batchDiscount || p.discount || 0,
          supplier: p.supplier,
          distributor: p.distributor,
          category: p.category,
          totalValue: (p.batchPrice || p.price) * (p.batchQuantity || p.quantity),
          discountedValue: ((p.batchPrice || p.price) * (p.batchQuantity || p.quantity)) * (1 - (p.batchDiscount || p.discount || 0) / 100),
          isLowStock: (p.batchQuantity || p.quantity) <= p.minStock
        })),
        batchSummary: {
          totalBatches: products.length,
          totalBatchValue: products.reduce((sum, p) => sum + ((p.batchPrice || p.price) * (p.batchQuantity || p.quantity)), 0),
          totalDiscountValue: products.reduce((sum, p) => {
            const discount = (p.batchDiscount || p.discount || 0) / 100
            return sum + ((p.batchPrice || p.price) * (p.batchQuantity || p.quantity) * discount)
          }, 0),
          averageBatchSize: products.length > 0 ? products.reduce((sum, p) => sum + (p.batchQuantity || p.quantity), 0) / products.length : 0
        }
      },
      summary: {
        netProfit: transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) - 
                  transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
        inventoryTurnover: allTransactions.filter(t => t.productId).length,
        topProducts: products
          .filter(p => allTransactions.some(t => t.productId === p.productId))
          .sort((a, b) => {
            const aTransactions = allTransactions.filter(t => t.productId === a.productId).length
            const bTransactions = allTransactions.filter(t => t.productId === b.productId).length
            return bTransactions - aTransactions
          })
          .slice(0, 5)
          .map(p => ({
            productId: p.productId,
            name: p.name,
            transactionCount: allTransactions.filter(t => t.productId === p.productId).length
          }))
      }
    }
    
    res.json(report)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create dispatch order
router.post('/dispatch', async (req, res) => {
  try {
    const { productId, quantity, distributor, unitPrice } = req.body
    
    // Find product batches (FIFO)
    const productBatches = await Product.find({ 
      productId: productId,
      batchQuantity: { $gt: 0 }
    }).sort({ createdAt: 1 })
    
    if (productBatches.length === 0) {
      return res.status(400).json({ error: 'No available batches for this product' })
    }
    
    let remainingQuantity = parseInt(quantity)
    let totalCost = 0
    const batchesUsed = []
    
    for (const batch of productBatches) {
      if (remainingQuantity <= 0) break
      
      const quantityFromBatch = Math.min(remainingQuantity, batch.batchQuantity)
      totalCost += quantityFromBatch * batch.batchPrice
      
      batchesUsed.push({
        batchId: batch.batchId,
        quantity: quantityFromBatch,
        price: batch.batchPrice
      })
      
      // Update batch quantity
      batch.batchQuantity -= quantityFromBatch
      batch.quantity -= quantityFromBatch
      
      if (batch.batchQuantity === 0) {
        await Product.findByIdAndDelete(batch._id)
      } else {
        await batch.save()
      }
      
      remainingQuantity -= quantityFromBatch
    }
    
    if (remainingQuantity > 0) {
      return res.status(400).json({ error: 'Insufficient inventory' })
    }
    
    const invoiceNumber = generateInvoiceNumber()
    
    const dispatchTransaction = new Transaction({
      type: 'income',
      category: 'Dispatch Order',
      amount: totalCost,
      description: `Dispatch order for ${quantity} units of ${productId} to ${distributor}`,
      date: new Date(),
      productId: productId,
      quantity: quantity,
      supplier: distributor,
      status: 'pending',
      dispatchType: 'dispatch',
      invoiceNumber: invoiceNumber,
      batchId: batchesUsed.map(b => b.batchId).join(', ')
    })
    
    await dispatchTransaction.save()
    res.status(201).json({ transaction: dispatchTransaction, batchesUsed })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Process payment for dispatch
router.post('/payment', async (req, res) => {
  try {
    const { dispatchId, paymentAmount } = req.body
    
    const dispatchOrder = await Transaction.findById(dispatchId)
    if (!dispatchOrder) {
      return res.status(404).json({ error: 'Dispatch order not found' })
    }
    
    // Update dispatch order status
    dispatchOrder.status = 'completed'
    await dispatchOrder.save()
    
    const invoiceNumber = generateInvoiceNumber()
    
    // Create payment transaction
    const paymentTransaction = new Transaction({
      type: 'income',
      category: 'Payment Received',
      amount: paymentAmount,
      description: `Payment received for dispatch order ${dispatchOrder.invoiceNumber}`,
      date: new Date(),
      productId: dispatchOrder.productId,
      supplier: dispatchOrder.supplier,
      status: 'completed',
      dispatchType: 'payment',
      invoiceNumber: invoiceNumber
    })
    
    await paymentTransaction.save()
    res.status(201).json({ payment: paymentTransaction, dispatch: dispatchOrder })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Get all transactions
router.get('/', async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ date: -1 })
    res.json(transactions)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create new transaction
router.post('/', async (req, res) => {
  try {
    const transactionData = {
      ...req.body,
      currency: req.body.currency || 'PKR',
      invoiceNumber: generateInvoiceNumber()
    }
    const transaction = new Transaction(transactionData)
    await transaction.save()
    res.status(201).json(transaction)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Update transaction
router.put('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' })
    }
    res.json(transaction)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Delete transaction
router.delete('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findByIdAndDelete(req.params.id)
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' })
    }
    res.json({ message: 'Transaction deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router