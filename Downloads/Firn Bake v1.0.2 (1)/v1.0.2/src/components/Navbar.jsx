import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Factory, Package, DollarSign, Users, CheckCircle, Warehouse, Wrench, Settings } from 'lucide-react'

const Navbar = () => {
  const location = useLocation()

  const navItems = [
    { path: '/', icon: Factory, label: 'Main' },
    { path: '/inventory', icon: Package, label: 'Inventory' },
    { path: '/financial', icon: DollarSign, label: 'Finance' },
    { path: '/hr', icon: Users, label: 'HR' },
    { path: '/quality', icon: CheckCircle, label: 'Quality' },
    { path: '/warehouse', icon: Warehouse, label: 'Sale' },
    { path: '/maintenance', icon: Wrench, label: 'Maintenance' },
    { path: '/maintenance-mode', icon: Settings, label: 'Maintenance Mode' }
  ]

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: '#212529',
      zIndex: 1000,
      borderBottom: '1px solid #495057'
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '70px'
      }}>
        <Link to="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: 'white',
          textDecoration: 'none',
          fontSize: '20px',
          fontWeight: '600'
        }}>
          <Factory size={28} />
          FIRN Bakers
        </Link>
        
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}>
          {navItems.map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              to={path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '6px',
                color: location.pathname === path ? '#212529' : '#adb5bd',
                backgroundColor: location.pathname === path ? 'white' : 'transparent',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
            >
              <Icon size={18} />
              <span style={{ display: window.innerWidth > 768 ? 'block' : 'none' }}>
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}

export default Navbar