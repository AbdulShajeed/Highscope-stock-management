'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface PurchaseOrder {
  id: string
  poNumber: string
  poReleasedDate: string | null
  vendor: string | null
  totalValue: number
  leadTime: string | null
  status: string
  createdAt: string
  updatedAt: string
}

interface Summary {
  totalPO: number
  totalPOValue: number
  totalPOReceived: number
}

export default function ReplenishmentPage() {
  const [poList, setPoList] = useState<PurchaseOrder[]>([])
  const [summary, setSummary] = useState<Summary>({ totalPO: 0, totalPOValue: 0, totalPOReceived: 0 })
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    poNumber: '',
    poReleasedDate: '',
    vendor: '',
    totalValue: '',
    leadTime: '',
    status: 'Not Delivered',
  })

  const fetchPOs = async () => {
    try {
      const response = await fetch('/api/purchase-orders')
      const data = await response.json()
      setPoList(data.poList)
      setSummary(data.summary)
    } catch (error) {
      console.error('Error fetching purchase orders:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPOs()
  }, [])

  const handleAddPO = async () => {
    if (!formData.poNumber) {
      alert('PO Number is required')
      return
    }

    try {
      const response = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const newPO = await response.json()
        setPoList([newPO, ...poList])
        setFormData({ poNumber: '', poReleasedDate: '', vendor: '', totalValue: '', leadTime: '', status: 'Not Delivered' })
        setShowForm(false)
        fetchPOs()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to add PO')
      }
    } catch (error) {
      console.error('Error adding PO:', error)
      alert('Failed to add PO')
    }
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const response = await fetch('/api/purchase-orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })

      if (response.ok) {
        setPoList(poList.map(po => po.id === id ? { ...po, status: newStatus } : po))
        fetchPOs()
      }
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this PO?')) return

    try {
      const response = await fetch(`/api/purchase-orders?id=${id}`, { method: 'DELETE' })
      if (response.ok) {
        setPoList(poList.filter(po => po.id !== id))
        fetchPOs()
      }
    } catch (error) {
      console.error('Error deleting PO:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm">
                ← Back to Dashboard
              </Link>
              <h1 className="mt-2 text-3xl font-bold text-gray-900">Replenishment</h1>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Add PO
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-sm font-medium text-gray-500">Total PO</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">{summary.totalPO}</div>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-sm font-medium text-gray-500">Total PO Value</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">AED {summary.totalPOValue.toLocaleString()}</div>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-sm font-medium text-gray-500">Total PO Received</div>
            <div className="mt-2 text-3xl font-bold text-green-600">{summary.totalPOReceived}</div>
          </div>
        </div>

        {/* PO Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SL#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO Number</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO Released Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {poList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      No purchase orders found. Click &quot;+ Add PO&quot; to create one.
                    </td>
                  </tr>
                ) : (
                  poList.map((po, index) => (
                    <tr key={po.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{po.poNumber}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{po.poReleasedDate || '-'}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{po.vendor || '-'}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">AED {(po.totalValue || 0).toLocaleString()}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{po.leadTime || '-'}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <select
                          value={po.status}
                          onChange={(e) => handleStatusChange(po.id, e.target.value)}
                          className={`px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                            po.status === 'Delivered' ? 'bg-green-50 text-green-700 border-green-300' :
                            po.status === 'Partially Delivered' ? 'bg-yellow-50 text-yellow-700 border-yellow-300' :
                            'bg-red-50 text-red-700 border-red-300'
                          }`}
                        >
                          <option value="Not Delivered">Not Delivered</option>
                          <option value="Partially Delivered">Partially Delivered</option>
                          <option value="Delivered">Delivered</option>
                        </select>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleDelete(po.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add PO Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Add New Purchase Order</h2>
                <button
                  onClick={() => {
                    setShowForm(false)
                    setFormData({ poNumber: '', poReleasedDate: '', vendor: '', totalValue: '', leadTime: '', status: 'Not Delivered' })
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">PO Number *</label>
                  <input
                    type="text"
                    value={formData.poNumber}
                    onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter PO number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">PO Released Date</label>
                  <input
                    type="date"
                    value={formData.poReleasedDate}
                    onChange={(e) => setFormData({ ...formData, poReleasedDate: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Vendor</label>
                  <input
                    type="text"
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter vendor name"
                  />
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
                <div>
                  <label className="block text-sm font-medium text-gray-700">Lead Time</label>
                  <input
                    type="text"
                    value={formData.leadTime}
                    onChange={(e) => setFormData({ ...formData, leadTime: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="e.g., 2-3 weeks"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="Not Delivered">Not Delivered</option>
                    <option value="Partially Delivered">Partially Delivered</option>
                    <option value="Delivered">Delivered</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowForm(false)
                    setFormData({ poNumber: '', poReleasedDate: '', vendor: '', totalValue: '', leadTime: '', status: 'Not Delivered' })
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPO}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Add PO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
