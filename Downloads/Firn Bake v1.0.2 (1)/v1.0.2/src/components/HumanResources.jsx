import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Users, Clock, DollarSign, UserCheck } from 'lucide-react'
import { format } from 'date-fns'
import api from '../utils/api'

const HumanResources = () => {
  const [employees, setEmployees] = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [activeTab, setActiveTab] = useState('employees')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    position: '',
    department: '',
    salary: '',
    hireDate: new Date().toISOString().split('T')[0],
    phone: ''
  })
  const [attendanceData, setAttendanceData] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    status: 'present',
    hoursWorked: '8'
  })

  useEffect(() => {
    fetchEmployees()
    fetchAttendance()
  }, [])

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/hr/employees')
      setEmployees(response.data)
    } catch (error) {
      console.error('Error fetching employees:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAttendance = async () => {
    try {
      const response = await api.get('/hr/attendance')
      setAttendance(response.data)
    } catch (error) {
      console.error('Error fetching attendance:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingEmployee) {
        await api.put(`/hr/employees/${editingEmployee._id}`, formData)
      } else {
        await api.post('/hr/employees', formData)
      }
      fetchEmployees()
      resetForm()
    } catch (error) {
      console.error('Error saving employee:', error)
    }
  }

  const handleAttendanceSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/hr/attendance', attendanceData)
      fetchAttendance()
      setAttendanceData({
        employeeId: '',
        date: new Date().toISOString().split('T')[0],
        status: 'present',
        hoursWorked: '8'
      })
      setShowAttendanceModal(false)
    } catch (error) {
      console.error('Error saving attendance:', error)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        await api.delete(`/hr/employees/${id}`)
        fetchEmployees()
      } catch (error) {
        console.error('Error deleting employee:', error)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      position: '',
      department: '',
      salary: '',
      hireDate: new Date().toISOString().split('T')[0],
      phone: ''
    })
    setEditingEmployee(null)
    setShowModal(false)
  }

  const handleEdit = (employee) => {
    setFormData({
      name: employee.name,
      email: employee.email,
      position: employee.position,
      department: employee.department,
      salary: employee.salary.toString(),
      hireDate: new Date(employee.hireDate).toISOString().split('T')[0],
      phone: employee.phone || ''
    })
    setEditingEmployee(employee)
    setShowModal(true)
  }

  const todayAttendance = attendance.filter(a => 
    new Date(a.date).toDateString() === new Date().toDateString()
  )

  const presentToday = todayAttendance.filter(a => a.status === 'present').length
  const totalSalary = employees.reduce((sum, emp) => sum + emp.salary, 0)

  if (loading) {
    return (
      <div className="container" style={{ padding: '40px 20px' }}>
        <div className="loading">Loading HR data...</div>
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
            Human Resources
          </h1>
          <p style={{ color: '#6c757d' }}>
            Manage employees, attendance, and payroll
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowAttendanceModal(true)}
          >
            <Clock size={18} />
            Mark Attendance
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
          >
            <Plus size={18} />
            Add Employee
          </button>
        </div>
      </div>

      {/* HR Summary */}
      <div className="grid grid-3" style={{ marginBottom: '32px' }}>
        <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #6f42c1' }}>
          <Users size={32} style={{ color: '#6f42c1', marginBottom: '12px' }} />
          <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>
            {employees.length}
          </h3>
          <p style={{ color: '#6c757d', fontSize: '14px' }}>Total Employees</p>
        </div>
        
        <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #28a745' }}>
          <UserCheck size={32} style={{ color: '#28a745', marginBottom: '12px' }} />
          <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>
            {presentToday}
          </h3>
          <p style={{ color: '#6c757d', fontSize: '14px' }}>Present Today</p>
        </div>
        
        <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #17a2b8' }}>
          <DollarSign size={32} style={{ color: '#17a2b8', marginBottom: '12px' }} />
          <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>
            ₨{totalSalary.toLocaleString()}
          </h3>
          <p style={{ color: '#6c757d', fontSize: '14px' }}>Total Monthly Salary</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e9ecef'
        }}>
          {['employees', 'attendance'].map((tab) => (
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
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Employees Tab */}
      {activeTab === 'employees' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Position</th>
                <th>Department</th>
                <th>Email</th>
                <th>Salary</th>
                <th>Hire Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee._id}>
                  <td>{employee.name}</td>
                  <td>{employee.position}</td>
                  <td>{employee.department}</td>
                  <td>{employee.email}</td>
                  <td>₨{employee.salary.toLocaleString()}</td>
                  <td>{format(new Date(employee.hireDate), 'MMM dd, yyyy')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px' }}
                        onClick={() => handleEdit(employee)}
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '6px 12px' }}
                        onClick={() => handleDelete(employee._id)}
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
      )}

      {/* Attendance Tab */}
      {activeTab === 'attendance' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Date</th>
                <th>Status</th>
                <th>Hours Worked</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((record) => (
                <tr key={record._id}>
                  <td>{record.employee?.name || 'Unknown'}</td>
                  <td>{format(new Date(record.date), 'MMM dd, yyyy')}</td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: record.status === 'present' ? '#d4edda' : 
                                     record.status === 'absent' ? '#f8d7da' : '#fff3cd',
                      color: record.status === 'present' ? '#155724' : 
                             record.status === 'absent' ? '#721c24' : '#856404'
                    }}>
                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                    </span>
                  </td>
                  <td>{record.hoursWorked || 0} hours</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Employee Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => resetForm()}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: '600' }}>
              {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Position</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Monthly Salary</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Hire Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.hireDate}
                    onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  className="form-input"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                  {editingEmployee ? 'Update' : 'Add'} Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {showAttendanceModal && (
        <div className="modal-overlay" onClick={() => setShowAttendanceModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: '600' }}>
              Mark Attendance
            </h2>
            <form onSubmit={handleAttendanceSubmit}>
              <div className="form-group">
                <label className="form-label">Employee</label>
                <select
                  className="form-select"
                  value={attendanceData.employeeId}
                  onChange={(e) => setAttendanceData({ ...attendanceData, employeeId: e.target.value })}
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map((employee) => (
                    <option key={employee._id} value={employee._id}>
                      {employee.name} - {employee.position}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={attendanceData.date}
                    onChange={(e) => setAttendanceData({ ...attendanceData, date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={attendanceData.status}
                    onChange={(e) => setAttendanceData({ ...attendanceData, status: e.target.value })}
                    required
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Hours Worked</label>
                <input
                  type="number"
                  step="0.5"
                  className="form-input"
                  value={attendanceData.hoursWorked}
                  onChange={(e) => setAttendanceData({ ...attendanceData, hoursWorked: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAttendanceModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Mark Attendance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default HumanResources