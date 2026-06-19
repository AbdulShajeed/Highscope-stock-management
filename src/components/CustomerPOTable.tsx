'use client'

import { useState, useEffect } from 'react'

interface CustomerPO {
  id: string
  categoryId: string
  projectNo: string | null
  date: string | null
  totalValue: number
  createdAt: string
}

interface CustomerPOTableProps {
  categoryId: string
}

export default function CustomerPOTable({ categoryId }: CustomerPOTableProps) {
  const [pos, setPOs] = useState<CustomerPO[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPO, setEditingPO] = useState<CustomerPO | null>(null)
  const [formData, setFormData] = useState({
    projectNo: '',
    date: '',
    totalValue: '',
  })

  const allMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const currentMonthIndex = new Date().getMonth()
  const currentMonth = allMonths[currentMonthIndex]
  const currentYear = new Date().getFullYear()

  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [selectedYear, setSelectedYear] = useState(currentYear)

  // Get available months (only last 3 months including current)
  const getAvailableMonths = () => {
    const startMonth = Math.max(0, currentMonthIndex - 2)
    return allMonths.slice(startMonth, currentMonthIndex + 1)
  }
  const months = getAvailableMonths()
  const availableYears = [currentYear]

  const fetchPOs = async () => {
    try {
      const response = await fetch(`/api/customer-pos?categoryId=${categoryId}`)
      const data = await response.json()
      // Filter by selected month and year
      const filtered = data.filter((po: CustomerPO) => {
        if (!po.date) return false
        const poDate = new Date(po.date)
        return poDate.getMonth() === allMonths.indexOf(selectedMonth) && poDate.getFullYear() === selectedYear
      })
      setPOs(filtered)
    } catch (error) {
      console.error('Error fetching customer POs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPOs()
  }, [categoryId, selectedMonth, selectedYear])

  const handleAdd = async () => {
    // Auto-set date from selected month/year if not provided
    const dateToUse = formData.date || `${selectedYear}-${String(allMonths.indexOf(selectedMonth) + 1).padStart(2, '0')}-01`

    try {
      const response = await fetch('/api/customer-pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, date: dateToUse, categoryId }),
      })

      if (response.ok) {
        // If a custom date was entered, switch month/year to match it
        if (formData.date) {
          const poDate = new Date(formData.date)
          const poMonth = allMonths[poDate.getMonth()]
          const poYear = poDate.getFullYear()
          if (poMonth !== selectedMonth || poYear !== selectedYear) {
            setSelectedMonth(poMonth)
            setSelectedYear(poYear)
          }
        }
        setFormData({ projectNo: '', date: '', totalValue: '' })
        setShowForm(false)
        fetchPOs()
      }
    } catch (error) {
      console.error('Error adding customer PO:', error)
    }
  }

  const handleEdit = async () => {
    if (!editingPO) return

    try {
      const response = await fetch('/api/customer-pos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingPO.id, ...formData }),
      })

      if (response.ok) {
        setEditingPO(null)
        setFormData({ projectNo: '', date: '', totalValue: '' })
        fetchPOs()
      }
    } catch (error) {
      console.error('Error updating customer PO:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this customer PO?')) return

    try {
      const response = await fetch(`/api/customer-pos?id=${id}`, { method: 'DELETE' })
      if (response.ok) {
        fetchPOs()
      }
    } catch (error) {
      console.error('Error deleting customer PO:', error)
    }
  }

  const startEdit = (po: CustomerPO) => {
    setEditingPO(po)
    setFormData({
      projectNo: po.projectNo || '',
      date: po.date || '',
      totalValue: po.totalValue?.toString() || '',
    })
    setShowForm(true)
  }

  const totalValue = pos.reduce((sum, po) => sum + (po.totalValue || 0), 0)

  if (loading) {
    return <div className="text-center py-4 text-gray-500">Loading...</div>
  }

  return (
    <div>
      {/* Month/Year Selector */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Month</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {months.map((month) => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {pos.length} POs | Total Value: <span className="font-medium">AED {totalValue.toLocaleString()}</span>
        </div>
        <button
          onClick={() => { setEditingPO(null); setFormData({ projectNo: '', date: '', totalValue: '' }); setShowForm(true) }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          + Add Customer PO
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SL#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project No.</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value (AED)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No customer POs found for {selectedMonth} {selectedYear}. Click &quot;+ Add Customer PO&quot; to create one.
                  </td>
                </tr>
              ) : (
                pos.map((po, index) => (
                  <tr key={po.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{po.projectNo || '-'}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{po.date || '-'}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">AED {(po.totalValue || 0).toLocaleString()}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <button onClick={() => startEdit(po)} className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                      <button onClick={() => handleDelete(po.id)} className="text-red-600 hover:text-red-900">Delete</button>
                    </td>
                  </tr>
                ))
              )}
              {pos.length > 0 && (
                <tr className="bg-gray-50 font-bold">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900"></td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">TOTAL</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900"></td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">AED {totalValue.toLocaleString()}</td>
                  <td className="px-4 py-4"></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingPO ? 'Edit Customer PO' : 'Add Customer PO'}
                </h2>
                <button onClick={() => { setShowForm(false); setEditingPO(null) }} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Project No.</label>
                  <input
                    type="text"
                    value={formData.projectNo}
                    onChange={(e) => setFormData({ ...formData, projectNo: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter project number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-400">Defaults to {selectedMonth} 1st if not selected</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Value (AED)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.totalValue}
                    onChange={(e) => setFormData({ ...formData, totalValue: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter total value"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => { setShowForm(false); setEditingPO(null) }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={editingPO ? handleEdit : handleAdd}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  {editingPO ? 'Save Changes' : 'Add PO'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
