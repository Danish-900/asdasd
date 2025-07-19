import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import InventoryManagement from './components/InventoryManagement'
import FinancialManagement from './components/FinancialManagement'
import HumanResources from './components/HumanResources'
import QualityManagement from './components/QualityManagement'
import WarehouseManagement from './components/WarehouseManagement'
import MaintenanceManagement from './components/MaintenanceManagement'
import MaintenanceModeManager from './components/MaintenanceModeManager'
import Navbar from './components/Navbar'

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <main style={{ paddingTop: '80px', minHeight: '100vh' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/inventory" element={<InventoryManagement />} />
            <Route path="/financial" element={<FinancialManagement />} />
            <Route path="/hr" element={<HumanResources />} />
            <Route path="/quality" element={<QualityManagement />} />
            <Route path="/warehouse" element={<WarehouseManagement />} />
            <Route path="/maintenance" element={<MaintenanceManagement />} />
            <Route path="/maintenance-mode" element={<MaintenanceModeManager />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App