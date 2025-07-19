import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// FMS System API endpoints
api.fms = {
  // Inventory
  updateInventory: (productId, quantity) => api.post('/inventory/update', { productId, quantity }),
  
  // Financial
  createPendingOrder: (productId) => api.post('/financial/pending-orders', { productId }),
  completeOrder: (orderData) => api.post('/financial/orders', orderData),
  
  // Warehouse
  assignToWarehouse: (productId, warehouseId) => api.post('/warehouse/assign', { productId, warehouseId }),
  getWarehouses: () => api.get('/warehouse/list'),
  
  // Quality
  markDefective: (productId, quantity) => api.post('/quality/defective', { productId, quantity }),
  
  // Sync
  syncAllModules: () => api.post('/sync/all')
}

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api