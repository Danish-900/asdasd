import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Package, DollarSign, Users, CheckCircle, Warehouse, Wrench, TrendingUp, AlertTriangle } from 'lucide-react'
import api from '../utils/api'

const Main = () => {
  const [stats, setStats] = useState({
    inventory: { total: 0, lowStock: 0 },
    employees: { total: 0, present: 0 },
    quality: { goodProducts: 0, badProducts: 0 },
    maintenance: { pending: 0, overdue: 0 }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
    // Set up real-time updates every 30 seconds
    const interval = setInterval(fetchDashboardStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const response = await api.get('/dashboard/stats')
      setStats(response.data)
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const modules = [
    {
      title: 'Inventory Management',
      description: 'Manage all factory inventory with auto-generated Product IDs and warehouse assignment',
      icon: Package,
      path: '/inventory',
      color: '#28a745',
      stats: `${stats.inventory.total} items, ${stats.inventory.lowStock} low stock`
    },
    {
      title: 'Financial Management',
      description: 'Track expenses, revenue, and complete pending orders with purchase order requirements',
      icon: DollarSign,
      path: '/financial',
      color: '#17a2b8',
      stats: 'View financial reports and pending orders'
    },
    {
      title: 'Human Resources',
      description: 'Employee management, attendance, and payroll',
      icon: Users,
      path: '/hr',
      color: '#6f42c1',
      stats: `${stats.employees.total} employees, ${stats.employees.present} present today`
    },
    {
      title: 'Quality Management',
      description: 'Product quality control with automatic defective item removal from inventory',
      icon: CheckCircle,
      path: '/quality',
      color: '#fd7e14',
      stats: `${stats.quality.goodProducts} good, ${stats.quality.badProducts} rejected`
    },
    {
      title: 'Sale Management',
      description: 'Manage warehouses with real-time product tracking and defective item monitoring',
      icon: Warehouse,
      path: '/warehouse',
      color: '#20c997',
      stats: 'Manage warehouse operations and defective items'
    },
    {
      title: 'Maintenance Management',
      description: 'Equipment maintenance schedules and reminders',
      icon: Wrench,
      path: '/maintenance',
      color: '#dc3545',
      stats: `${stats.maintenance.pending} pending, ${stats.maintenance.overdue} overdue`
    }
  ]

  if (loading) {
    return (
      <div className="container" style={{ padding: '40px 20px' }}>
        <div className="loading">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="container" style={{ padding: '40px 20px' }}>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: '700', 
          color: '#212529',
          marginBottom: '8px'
        }}>
          Main
        </h1>
        <p style={{ 
          fontSize: '16px', 
          color: '#6c757d',
          marginBottom: '32px'
        }}>
          Comprehensive management solution with full module synchronization and real-time updates
        </p>

        {/* Quick Stats */}
        <div className="grid grid-4" style={{ marginBottom: '40px' }}>
          <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #28a745' }}>
            <TrendingUp size={32} style={{ color: '#28a745', marginBottom: '12px' }} />
            <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>
              {stats.inventory.total}
            </h3>
            <p style={{ color: '#6c757d', fontSize: '14px' }}>Total Inventory Items</p>
          </div>
          
          <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #6f42c1' }}>
            <Users size={32} style={{ color: '#6f42c1', marginBottom: '12px' }} />
            <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>
              {stats.employees.total}
            </h3>
            <p style={{ color: '#6c757d', fontSize: '14px' }}>Total Employees</p>
          </div>
          
          <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #fd7e14' }}>
            <CheckCircle size={32} style={{ color: '#fd7e14', marginBottom: '12px' }} />
            <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>
              {((stats.quality.goodProducts / (stats.quality.goodProducts + stats.quality.badProducts)) * 100 || 0).toFixed(1)}%
            </h3>
            <p style={{ color: '#6c757d', fontSize: '14px' }}>Quality Rate</p>
          </div>
          
          <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #dc3545' }}>
            <AlertTriangle size={32} style={{ color: '#dc3545', marginBottom: '12px' }} />
            <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>
              {stats.maintenance.overdue}
            </h3>
            <p style={{ color: '#6c757d', fontSize: '14px' }}>Overdue Maintenance</p>
          </div>
        </div>
      </div>

      {/* Management Modules */}
      <div className="grid grid-2">
        {modules.map((module) => (
          <Link
            key={module.path}
            to={module.path}
            style={{ textDecoration: 'none' }}
          >
            <div className="card" style={{
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              height: '100%'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px',
                marginBottom: '16px'
              }}>
                <div style={{
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: `${module.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <module.icon size={24} style={{ color: module.color }} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#212529',
                    marginBottom: '8px'
                  }}>
                    {module.title}
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    color: '#6c757d',
                    lineHeight: '1.5'
                  }}>
                    {module.description}
                  </p>
                </div>
              </div>
              <div style={{
                padding: '12px',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#495057',
                fontWeight: '500'
              }}>
                {module.stats}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default Main