'use client'

import { useEffect, useState, Fragment } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface PurchaseOrder {
  id: string
  poNumber: string
  poReleasedDate: string | null
  vendor: string | null
  totalValue: number
  leadTime: string | null
  status: string
  categoryId: string | null
  createdAt: string
  updatedAt: string
}

interface POLineItem {
  id: string
  poId: string
  stockItemId: string
  quantity: number
  rate: number
  totalValue: number
  deliveredQuantity: number
  itemCode: string
  description: string
}

interface StockItem {
  id: string
  itemCode: string
  description: string
  ratePerPcs: number | null
}

interface Category {
  id: string
  name: string
  description: string | null
}

interface Summary {
  totalPO: number
  totalPOValue: number
  totalPOReceived: number
}

export default function CategoryReplenishmentPage() {
  const params = useParams()
  const categoryId = params.categoryId as string

  const [category, setCategory] = useState<Category | null>(null)
  const [poList, setPoList] = useState<PurchaseOrder[]>([])
  const [summary, setSummary] = useState<Summary>({ totalPO: 0, totalPOValue: 0, totalPOReceived: 0 })
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expandedPO, setExpandedPO] = useState<string | null>(null)
  const [lineItems, setLineItems] = useState<{ [poId: string]: POLineItem[] }>({})
  const [deliveryHistory, setDeliveryHistory] = useState<{ [lineItemId: string]: any[] }>({})
  const [showLineItemForm, setShowLineItemForm] = useState<string | null>(null)
  const [lineItemForm, setLineItemForm] = useState({
    stockItemId: '',
    quantity: '',
    rate: '',
  })
  const [showPartialModal, setShowPartialModal] = useState('')
  const [partialDeliveries, setPartialDeliveries] = useState<{ [lineItemId: string]: string }>({})
  const [showDeliveredModal, setShowDeliveredModal] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [partialDeliveryDate, setPartialDeliveryDate] = useState('')
  const [editingLineItem, setEditingLineItem] = useState('')
  const [editQty, setEditQty] = useState('')
  const [editRate, setEditRate] = useState('')

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
      const response = await fetch(`/api/purchase-orders?categoryId=${categoryId}`)
      const data = await response.json()
      setPoList(data.poList)
      setSummary(data.summary)
    } catch (error) {
      console.error('Error fetching purchase orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLineItems = async (poId: string) => {
    try {
      const response = await fetch(`/api/po-line-items?poId=${poId}`)
      const data = await response.json()
      setLineItems(prev => ({ ...prev, [poId]: data }))

      // Fetch delivery history for each line item
      for (const li of data) {
        try {
          const histRes = await fetch(`/api/po-delivery-history?poLineItemId=${li.id}`)
          const histData = await histRes.json()
          setDeliveryHistory(prev => ({ ...prev, [li.id]: histData }))
        } catch (error) {
          console.error('Error fetching delivery history:', error)
        }
      }
    } catch (error) {
      console.error('Error fetching line items:', error)
    }
  }

  // Cache for replenishment pages
  const repCache = { data: null as any, timestamp: 0 }
  const REP_CACHE_TTL = 60_000

  useEffect(() => {
    const fetchData = async () => {
      const cacheKey = `rep_${categoryId}`
      if (repCache.data && repCache.data.key === cacheKey && Date.now() - repCache.timestamp < REP_CACHE_TTL) {
        setCategory(repCache.data.category)
        setStockItems(repCache.data.stockItems)
        setPoList(repCache.data.poList)
        setSummary(repCache.data.summary)
        setLoading(false)
        return
      }
      try {
        const res = await fetch(`/api/replenishment-data?id=${categoryId}`)
        const data = await res.json()

        setCategory(data.category)
        setStockItems(data.stockItems)
        setPoList(data.poList)
        setSummary(data.summary)
        repCache.data = { key: cacheKey, category: data.category, stockItems: data.stockItems, poList: data.poList, summary: data.summary }
        repCache.timestamp = Date.now()
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [categoryId])

  const handleAddPO = async () => {
    if (!formData.poNumber) {
      alert('PO Number is required')
      return
    }

    try {
      const response = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, categoryId }),
      })

      if (response.ok) {
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
    if (newStatus === 'Partially Delivered') {
      if (!lineItems[id]) {
        await fetchLineItems(id)
      }
      setPartialDeliveryDate('')
      setPartialDeliveries({})
      setShowPartialModal(id)
      return
    }

    if (newStatus === 'Delivered') {
      setDeliveryDate('')
      setShowDeliveredModal(id)
      return
    }

    try {
      const response = await fetch('/api/purchase-orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })

      if (response.ok) {
        fetchPOs()
      }
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const handleDeletePO = async (id: string) => {
    if (!confirm('Are you sure you want to delete this PO?')) return

    try {
      const response = await fetch(`/api/purchase-orders?id=${id}`, { method: 'DELETE' })
      if (response.ok) {
        fetchPOs()
      }
    } catch (error) {
      console.error('Error deleting PO:', error)
    }
  }

  const toggleExpand = (poId: string) => {
    if (expandedPO === poId) {
      setExpandedPO(null)
    } else {
      setExpandedPO(poId)
      if (!lineItems[poId]) {
        fetchLineItems(poId)
      }
    }
  }

  const submitPartialDeliveries = async () => {
    if (!showPartialModal) return

    if (!partialDeliveryDate) {
      alert('Please select a delivery date')
      return
    }

    const updates = Object.entries(partialDeliveries).map(async ([lineItemId, qty]) => {
      if (qty === '') return
      const newQty = parseInt(qty) || 0
      if (newQty === 0) return

      // Get current delivered quantity to add to it
      const li = lineItems[showPartialModal]?.find(l => l.id === lineItemId)
      const currentDelivered = li?.deliveredQuantity || 0

      try {
        // Save delivery history record
        await fetch('/api/po-delivery-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            poLineItemId: lineItemId,
            quantity: newQty,
            deliveryDate: partialDeliveryDate,
          }),
        })

        // Update total delivered quantity on line item
        await fetch('/api/po-line-items', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: lineItemId,
            deliveredQuantity: currentDelivered + newQty,
            deliveredDate: partialDeliveryDate,
          }),
        })
      } catch (error) {
        console.error('Error updating delivered quantity:', error)
      }
    })

    await Promise.all(updates)

    try {
      await fetch('/api/purchase-orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: showPartialModal, status: 'Partially Delivered' }),
      })
    } catch (error) {
      console.error('Error updating PO status:', error)
    }

    setShowPartialModal('')
    setPartialDeliveries({})
    setPartialDeliveryDate('')
    fetchPOs()
    if (expandedPO) {
      fetchLineItems(expandedPO)
    }
  }

  const confirmDelivered = async () => {
    if (!showDeliveredModal) return

    if (!deliveryDate) {
      alert('Please select a delivery date')
      return
    }

    try {
      await fetch('/api/purchase-orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: showDeliveredModal,
          status: 'Delivered',
          deliveryDate: deliveryDate || null,
        }),
      })

      // Also mark all line items as fully delivered
      if (lineItems[showDeliveredModal]) {
        const updates = lineItems[showDeliveredModal].map(async (li) => {
          try {
            // Save delivery history record
            await fetch('/api/po-delivery-history', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                poLineItemId: li.id,
                quantity: li.quantity - (li.deliveredQuantity || 0),
                deliveryDate: deliveryDate,
              }),
            })

            // Update total delivered quantity on line item
            await fetch('/api/po-line-items', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: li.id,
                deliveredQuantity: li.quantity,
                deliveredDate: deliveryDate,
              }),
            })
          } catch (error) {
            console.error('Error updating line item:', error)
          }
        })
        await Promise.all(updates)
      }

      setShowDeliveredModal('')
      setDeliveryDate('')
      fetchPOs()
      if (expandedPO) {
        fetchLineItems(expandedPO)
      }
    } catch (error) {
      console.error('Error confirming delivery:', error)
    }
  }

  const handleAddLineItem = async (poId: string) => {
    if (!lineItemForm.stockItemId) {
      alert('Please select an item')
      return
    }

    try {
      const response = await fetch('/api/po-line-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poId,
          stockItemId: lineItemForm.stockItemId,
          quantity: lineItemForm.quantity ? parseInt(lineItemForm.quantity) : 0,
          rate: lineItemForm.rate ? parseFloat(lineItemForm.rate) : 0,
        }),
      })

      if (response.ok) {
        setLineItemForm({ stockItemId: '', quantity: '', rate: '' })
        setShowLineItemForm(null)
        fetchLineItems(poId)
        fetchPOs()
      }
    } catch (error) {
      console.error('Error adding line item:', error)
    }
  }

  const handleDeleteLineItem = async (lineItemId: string, poId: string) => {
    if (!confirm('Delete this line item?')) return

    try {
      const response = await fetch(`/api/po-line-items?id=${lineItemId}`, { method: 'DELETE' })
      if (response.ok) {
        fetchLineItems(poId)
        fetchPOs()
      }
    } catch (error) {
      console.error('Error deleting line item:', error)
    }
  }

  const startEditLineItem = (li: POLineItem) => {
    setEditingLineItem(li.id)
    setEditQty(li.quantity.toString())
    setEditRate(li.rate.toString())
  }

  const saveEditLineItem = async (lineItemId: string, poId: string) => {
    try {
      await fetch('/api/po-line-items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: lineItemId,
          quantity: parseInt(editQty) || 0,
          rate: parseFloat(editRate) || 0,
        }),
      })
      setEditingLineItem('')
      fetchLineItems(poId)
      fetchPOs()
    } catch (error) {
      console.error('Error updating line item:', error)
    }
  }

  const handleItemSelect = (itemId: string) => {
    const item = stockItems.find(s => s.id === itemId)
    setLineItemForm({
      ...lineItemForm,
      stockItemId: itemId,
      rate: item?.ratePerPcs?.toString() || '',
    })
  }

  // Show page structure immediately, data fills in background
  const categoryName = category?.name || 'Loading...'

  if (!loading && !category) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Category not found</div>
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
              <h1 className="mt-2 text-3xl font-bold text-gray-900">{categoryName} — Replenishment</h1>
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
        {loading ? (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
        ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8"></th>
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
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      No purchase orders found. Click &quot;+ Add PO&quot; to create one.
                    </td>
                  </tr>
                ) : (
                  poList.map((po, index) => (
                    <Fragment key={po.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <button
                            onClick={() => toggleExpand(po.id)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <svg
                              className={`w-5 h-5 transition-transform ${expandedPO === po.id ? 'rotate-90' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{po.poNumber}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{po.poReleasedDate || '-'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{po.vendor || '-'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">AED {(po.totalValue || 0).toLocaleString()}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{po.leadTime ? `${po.leadTime} weeks` : '-'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
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
                            {po.status === 'Partially Delivered' && (
                              <button
                                onClick={async () => {
                                  if (!lineItems[po.id]) {
                                    await fetchLineItems(po.id)
                                  }
                                  setShowPartialModal(po.id)
                                }}
                                className="text-blue-600 hover:text-blue-800 text-xs underline"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleDeletePO(po.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                      {expandedPO === po.id && (
                        <tr key={`${po.id}-expanded`}>
                          <td colSpan={9} className="px-4 py-4 bg-gray-50">
                            <div className="ml-8">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold text-gray-700">Line Items</h4>
                                <button
                                  onClick={() => {
                                    setShowLineItemForm(po.id)
                                    setLineItemForm({ stockItemId: '', quantity: '', rate: '' })
                                  }}
                                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                >
                                  + Add Line Item
                                </button>
                              </div>

                              {/* Line Item Form */}
                              {showLineItemForm === po.id && (
                                <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">Item *</label>
                                      <select
                                        value={lineItemForm.stockItemId}
                                        onChange={(e) => handleItemSelect(e.target.value)}
                                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                                      >
                                        <option value="">Select item...</option>
                                        {stockItems.map(item => (
                                          <option key={item.id} value={item.id}>
                                            {item.itemCode} - {item.description.substring(0, 40)}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                                      <input
                                        type="number"
                                        value={lineItemForm.quantity}
                                        onChange={(e) => setLineItemForm({ ...lineItemForm, quantity: e.target.value })}
                                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                                        placeholder="Qty"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">Rate (AED)</label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={lineItemForm.rate}
                                        onChange={(e) => setLineItemForm({ ...lineItemForm, rate: e.target.value })}
                                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                                        placeholder="Rate"
                                      />
                                    </div>
                                    <div className="flex items-end gap-2">
                                      <button
                                        onClick={() => handleAddLineItem(po.id)}
                                        className="px-4 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                                      >
                                        Add
                                      </button>
                                      <button
                                        onClick={() => setShowLineItemForm(null)}
                                        className="px-4 py-1.5 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Line Items Table */}
                              {lineItems[po.id] && lineItems[po.id].length > 0 ? (
                                <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg">
                                  <thead className="bg-gray-100">
                                    <tr>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">SL#</th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Item Code</th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Description</th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Ordered</th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Received</th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Remaining</th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Date Received</th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Rate (AED)</th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Total (AED)</th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {lineItems[po.id].map((li, liIndex) => {
                                      const received = li.deliveredQuantity || 0
                                      const remaining = li.quantity - received
                                      const history = deliveryHistory[li.id] || []
                                      return (
                                      <Fragment key={li.id}>
                                      <tr className="hover:bg-gray-50">
                                        <td className="px-3 py-2 text-sm text-gray-500">{liIndex + 1}</td>
                                        <td className="px-3 py-2 text-sm font-medium text-gray-900">{li.itemCode}</td>
                                        <td className="px-3 py-2 text-sm text-gray-500">{li.description}</td>
                                        <td className="px-3 py-2 text-sm text-gray-500">
                                          {editingLineItem === li.id ? (
                                            <input type="number" value={editQty} onChange={(e) => setEditQty(e.target.value)} className="w-20 px-2 py-1 border border-gray-300 rounded text-sm" />
                                          ) : li.quantity}
                                        </td>
                                        <td className="px-3 py-2 text-sm text-green-600 font-medium">{received}</td>
                                        <td className={`px-3 py-2 text-sm font-medium ${remaining === 0 ? 'text-green-600' : remaining < 0 ? 'text-red-600' : 'text-orange-600'}`}>{remaining}</td>
                                        <td className="px-3 py-2 text-sm text-gray-500">{li.deliveredDate || '-'}</td>
                                        <td className="px-3 py-2 text-sm text-gray-500">
                                          {editingLineItem === li.id ? (
                                            <input type="number" step="0.01" value={editRate} onChange={(e) => setEditRate(e.target.value)} className="w-24 px-2 py-1 border border-gray-300 rounded text-sm" />
                                          ) : li.rate.toFixed(2)}
                                        </td>
                                        <td className="px-3 py-2 text-sm text-gray-500">
                                          {editingLineItem === li.id
                                            ? ((parseInt(editQty) || 0) * (parseFloat(editRate) || 0)).toFixed(2)
                                            : li.totalValue.toFixed(2)}
                                        </td>
                                        <td className="px-3 py-2 text-sm">
                                          {editingLineItem === li.id ? (
                                            <div className="flex gap-2">
                                              <button onClick={() => saveEditLineItem(li.id, po.id)} className="text-green-600 hover:text-green-900 text-xs font-medium">Save</button>
                                              <button onClick={() => setEditingLineItem('')} className="text-gray-500 hover:text-gray-700 text-xs">Cancel</button>
                                            </div>
                                          ) : (
                                            <div className="flex gap-2">
                                              <button onClick={() => startEditLineItem(li)} className="text-blue-600 hover:text-blue-900 text-xs">Edit</button>
                                              <button onClick={() => handleDeleteLineItem(li.id, po.id)} className="text-red-600 hover:text-red-900 text-xs">Delete</button>
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                      {history.length > 0 && (
                                        <tr>
                                          <td colSpan={10} className="px-3 py-1 bg-blue-50">
                                            <div className="flex flex-wrap gap-2 ml-4">
                                              {history.map((h: any) => (
                                                <span key={h.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-white border border-blue-200 text-blue-700">
                                                  {h.deliveryDate}: <span className="font-medium ml-1">{h.quantity} pcs</span>
                                                </span>
                                              ))}
                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                      </Fragment>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              ) : (
                                <p className="text-sm text-gray-500 italic">No line items yet.</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}
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
                  <label className="block text-sm font-medium text-gray-700">Lead Time (weeks)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.leadTime}
                    onChange={(e) => setFormData({ ...formData, leadTime: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="e.g., 7"
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

      {/* Partial Delivery Modal */}
      {showPartialModal !== '' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Partial Delivery</h2>
                <button
                  onClick={() => {
                    setShowPartialModal('')
                    setPartialDeliveries({})
                    fetchPOs()
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">Enter the delivered quantity for each line item:</p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Delivery Date *</label>
                <input
                  type="date"
                  value={partialDeliveryDate}
                  onChange={(e) => setPartialDeliveryDate(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              {lineItems[showPartialModal] && lineItems[showPartialModal].length > 0 ? (
                <div className="space-y-3">
                  {lineItems[showPartialModal].map((li, index) => {
                    const alreadyDelivered = li.deliveredQuantity || 0
                    const currentInput = parseInt(partialDeliveries[li.id]) || 0
                    const remaining = li.quantity - alreadyDelivered
                    const newRemaining = remaining - currentInput
                    return (
                    <div key={li.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{li.itemCode}</div>
                          <div className="text-xs text-gray-500">{li.description}</div>
                        </div>
                        <div className="w-32">
                          <label className="block text-xs text-gray-500 mb-1">Deliver Qty</label>
                          <input
                            type="number"
                            min="0"
                            max={remaining}
                            value={partialDeliveries[li.id] || ''}
                            onChange={(e) => setPartialDeliveries({ ...partialDeliveries, [li.id]: e.target.value })}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                          placeholder="0"
                        />
                      </div>
                    </div>
                      <div className="flex gap-4 mt-2 text-xs">
                        <span className="text-gray-500">Ordered: <span className="font-medium text-gray-700">{li.quantity}</span></span>
                        <span className="text-green-600">Already Received: <span className="font-medium">{alreadyDelivered}</span></span>
                        <span className="text-blue-600">Remaining: <span className="font-medium">{remaining}</span></span>
                        {currentInput > 0 && (
                          <>
                            <span className="text-orange-600">Receiving Now: <span className="font-medium">{currentInput}</span></span>
                            <span className={newRemaining === 0 ? 'text-green-700 font-bold' : 'text-gray-700'}>Balance After: <span className="font-medium">{newRemaining}</span></span>
                          </>
                        )}
                      </div>
                    </div>
                  )
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No line items found for this PO.</p>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowPartialModal('')
                    setPartialDeliveries({})
                    fetchPOs()
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={submitPartialDeliveries}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Confirm Partial Delivery
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delivered Modal */}
      {showDeliveredModal !== '' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Confirm Delivery</h2>
                <button
                  onClick={() => {
                    setShowDeliveredModal('')
                    setDeliveryDate('')
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-xl">×</span>
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">When was the material delivered?</p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Delivery Date *</label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowDeliveredModal('')
                    setDeliveryDate('')
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelivered}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                >
                  Confirm Delivered
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
