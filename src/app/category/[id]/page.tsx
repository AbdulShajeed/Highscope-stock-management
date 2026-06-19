'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import StockForm from '@/components/StockForm'
import StockTable from '@/components/StockTable'
import BookingTable from '@/components/BookingTable'
import CustomerPOTable from '@/components/CustomerPOTable'

interface Category {
  id: string
  name: string
  description: string | null
}

interface StockItem {
  id: string
  itemCode: string
  description: string
  detailedDescription: string | null
  make: string | null
  ratePerPcs: number | null
  location: string | null
  incomingQty: number
  soldQty: number
  finalQty: number
  totalValue: number | null
  reorderLevel: number | null
  notes: string | null
  createdAt: string
}

interface Booking {
  id: string
  stockItemId: string
  categoryId: string
  month: string
  year: number
  quantityBooked: number
  projectNumber: string | null
  engineerName: string | null
  bookingDate: string | null
  notes: string | null
  status: string
  isDeleted: number
  deletedAt: string | null
  deletedBy: string | null
  deleteReason: string | null
  itemCode: string
  item_description: string
  make: string | null
}

export default function CategoryPage() {
  const params = useParams()
  const categoryId = params.id as string

  const [category, setCategory] = useState<Category | null>(null)
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<StockItem | null>(null)
  const [editingItemWithBookings, setEditingItemWithBookings] = useState<(StockItem & { monthlyBooked: number; totalSold: number; inStoreQty: number }) | null>(null)
  const [showSplitModal, setShowSplitModal] = useState(false)
  const [splitItem, setSplitItem] = useState<StockItem | null>(null)
  const [splitData, setSplitData] = useState({
    oldPrice: '',
    oldQuantity: '',
    newPrice: '',
    newQuantity: '',
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'master' | 'booking' | 'customer-po'>('master')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [refreshKey, setRefreshKey] = useState(0)

  const allMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const currentMonth = allMonths[new Date().getMonth()]
  const currentMonthIndex = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  // Get available months (only last 3 months including current)
  const getAvailableMonths = () => {
    const startMonth = Math.max(0, currentMonthIndex - 2) // Start 2 months before current
    return allMonths.slice(startMonth, currentMonthIndex + 1)
  }
  const months = getAvailableMonths()

  // Get available years (only current year)
  const availableYears = [currentYear]

  useEffect(() => {
    if (!selectedMonth) {
      setSelectedMonth(currentMonth)
    }
  }, [currentMonth])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoryRes, itemsRes] = await Promise.all([
          fetch(`/api/categories`),
          fetch(`/api/stock-items?categoryId=${categoryId}`),
        ])

        const categoriesData = await categoryRes.json()
        const itemsData = await itemsRes.json()

        const foundCategory = categoriesData.find((c: Category) => c.id === categoryId)
        setCategory(foundCategory || null)
        setStockItems(itemsData)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [categoryId])

  useEffect(() => {
    const fetchBookings = async () => {
      if (activeTab !== 'booking' || !selectedMonth) return

      try {
        const response = await fetch(
          `/api/bookings?categoryId=${categoryId}&month=${selectedMonth}&year=${selectedYear}`
        )
        const data = await response.json()
        setBookings(data)
      } catch (error) {
        console.error('Error fetching bookings:', error)
      }
    }

    fetchBookings()
  }, [activeTab, selectedMonth, selectedYear, categoryId])

  // Refresh bookings when switching to master tab to update Monthly Sales
  useEffect(() => {
    if (activeTab === 'master') {
      // Trigger a re-render of StockTable by updating a state
      setRefreshKey(prev => prev + 1)
    }
  }, [activeTab])

  const handleAddItem = () => {
    setEditingItem(null)
    setShowForm(true)
  }

  const handleEditItem = async (item: StockItem) => {
    // Fetch all bookings for this item across all months and years
    let monthlyBooked = 0
    let totalSold = 0
    let inStoreQty = 0
    try {
      const response = await fetch(`/api/bookings?categoryId=${categoryId}`)
      const bookings = await response.json()
      bookings.forEach((booking: any) => {
        if (!booking.isDeleted && booking.stockItemId === item.id) {
          monthlyBooked += booking.quantityBooked
          totalSold += booking.quantityBooked
          if (booking.status === 'In Store') {
            inStoreQty += booking.quantityBooked
          }
        }
      })
    } catch (error) {
      console.error('Error fetching bookings:', error)
    }

    setEditingItem(item)
    setEditingItemWithBookings({ ...item, monthlyBooked, totalSold, inStoreQty })
    setShowForm(true)
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) {
      return
    }

    try {
      const response = await fetch(`/api/stock-items?id=${itemId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setStockItems(stockItems.filter(item => item.id !== itemId))
      } else {
        alert('Failed to delete item')
      }
    } catch (error) {
      console.error('Error deleting item:', error)
      alert('Failed to delete item')
    }
  }

  const handleFormSubmit = async (formData: any) => {
    try {
      const url = editingItem ? '/api/stock-items' : '/api/stock-items'
      const method = editingItem ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          categoryId,
          id: editingItem?.id,
        }),
      })

      if (response.ok) {
        const savedItem = await response.json()

        if (editingItem) {
          setStockItems(stockItems.map(item =>
            item.id === editingItem.id ? savedItem : item
          ))
        } else {
          setStockItems([savedItem, ...stockItems])
        }

        setShowForm(false)
        setEditingItem(null)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save item')
      }
    } catch (error) {
      console.error('Error saving item:', error)
      alert('Failed to save item')
    }
  }

  const handleAddBooking = (booking: Booking) => {
    setBookings([booking, ...bookings])
    // Trigger refresh of master sheet
    setRefreshKey(prev => prev + 1)
  }

  const handleUpdateBooking = () => {
    // Trigger refresh of master sheet
    setRefreshKey(prev => prev + 1)
  }

  const handleStatusChange = () => {
    // Trigger refresh of master sheet
    setRefreshKey(prev => prev + 1)
  }

  const handleDeleteBooking = (id: string) => {
    setBookings(bookings.filter(b => b.id !== id))
    // Trigger refresh of master sheet
    setRefreshKey(prev => prev + 1)
  }

  const handleSplit = (item: StockItem) => {
    setSplitItem(item)
    // Check if item is already split and populate accordingly
    const isSplit = (item as any).isSplit
    setSplitData({
      oldPrice: isSplit ? (item as any).oldPrice?.toString() || '0' : item.ratePerPcs?.toString() || '0',
      oldQuantity: isSplit ? (item as any).oldQty?.toString() || '0' : item.finalQty?.toString() || '0',
      newPrice: isSplit ? (item as any).newPrice?.toString() || '' : '',
      newQuantity: isSplit ? (item as any).newQty?.toString() || '' : '',
    })
    setShowSplitModal(true)
  }

  const handleSplitSubmit = async () => {
    if (!splitItem) return

    try {
      // Update the original item with split data
      const response = await fetch('/api/stock-items', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: splitItem.id,
          isSplit: 1,
          oldPrice: parseFloat(splitData.oldPrice),
          oldQty: parseInt(splitData.oldQuantity),
          newPrice: parseFloat(splitData.newPrice),
          newQty: parseInt(splitData.newQuantity),
          finalQty: parseInt(splitData.oldQuantity) + parseInt(splitData.newQuantity),
        }),
      })

      if (response.ok) {
        // Refresh the stock items list
        const itemsRes = await fetch(`/api/stock-items?categoryId=${categoryId}`)
        const itemsData = await itemsRes.json()
        setStockItems(itemsData)
        setShowSplitModal(false)
        setSplitItem(null)
        setSplitData({ oldPrice: '', oldQuantity: '', newPrice: '', newQuantity: '' })
      } else {
        alert('Failed to split item')
      }
    } catch (error) {
      console.error('Error splitting item:', error)
      alert('Failed to split item')
    }
  }

  const filteredItems = stockItems.filter(item =>
    item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.make && item.make.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!category) {
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
              <h1 className="mt-2 text-3xl font-bold text-gray-900">{category.name}</h1>
              {category.description && (
                <p className="mt-2 text-sm text-gray-600">{category.description}</p>
              )}
            </div>
            {activeTab === 'master' && (
              <button
                onClick={handleAddItem}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add New Item
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('master')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'master'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Master
              </button>
              <button
                onClick={() => setActiveTab('booking')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'booking'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Booking
              </button>
              <button
                onClick={() => setActiveTab('customer-po')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'customer-po'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Customer PO
              </button>
            </nav>
          </div>
        </div>

        {/* Master Tab */}
        {activeTab === 'master' && (
          <>
            {/* Search and Stats */}
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="text-sm text-gray-600">
                {filteredItems.length} items found
              </div>
            </div>

            {/* Stock Table */}
            <StockTable
              items={filteredItems}
              categoryId={categoryId}
              refreshKey={refreshKey}
              onEdit={handleEditItem}
              onSplit={handleSplit}
              onDelete={handleDeleteItem}
            />
          </>
        )}

        {/* Booking Tab */}
        {activeTab === 'booking' && (
          <>
            {/* Month/Year Selector */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Month
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {months.map((month) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Booking Table */}
            <BookingTable
              bookings={bookings}
              setBookings={setBookings}
              stockItems={stockItems}
              categoryId={categoryId}
              month={selectedMonth}
              year={selectedYear}
              onAddBooking={handleAddBooking}
              onUpdateBooking={handleUpdateBooking}
              onStatusChange={handleStatusChange}
              onDeleteBooking={handleDeleteBooking}
            />
          </>
        )}

        {/* Customer PO Tab */}
        {activeTab === 'customer-po' && (
          <CustomerPOTable categoryId={categoryId} />
        )}
      </main>

      {/* Add/Edit Stock Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingItem ? 'Edit Stock Item' : 'Add New Stock Item'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false)
                    setEditingItem(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <StockForm
                initialData={editingItemWithBookings}
                onSubmit={handleFormSubmit}
                onCancel={() => {
                  setShowForm(false)
                  setEditingItem(null)
                  setEditingItemWithBookings(null)
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Split Item Modal */}
      {showSplitModal && splitItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Split Item</h2>
                <button
                  onClick={() => {
                    setShowSplitModal(false)
                    setSplitItem(null)
                    setSplitData({ oldPrice: '', oldQuantity: '', newPrice: '', newQuantity: '' })
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Splitting "{splitItem.itemCode}"</strong>
                  <br />
                  This will create a new item with the new price and quantity.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700">Old Stock (Current Item)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Old Price (AED)
                    </label>
                    <input
                      type="number"
                      value={splitData.oldPrice}
                      onChange={(e) => setSplitData({ ...splitData, oldPrice: e.target.value })}
                      step="0.01"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Old Quantity
                    </label>
                    <input
                      type="number"
                      value={splitData.oldQuantity}
                      onChange={(e) => setSplitData({ ...splitData, oldQuantity: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <h3 className="text-sm font-medium text-gray-700">New Stock (New Item)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      New Price (AED)
                    </label>
                    <input
                      type="number"
                      value={splitData.newPrice}
                      onChange={(e) => setSplitData({ ...splitData, newPrice: e.target.value })}
                      step="0.01"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      New Quantity
                    </label>
                    <input
                      type="number"
                      value={splitData.newQuantity}
                      onChange={(e) => setSplitData({ ...splitData, newQuantity: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowSplitModal(false)
                    setSplitItem(null)
                    setSplitData({ oldPrice: '', oldQuantity: '', newPrice: '', newQuantity: '' })
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSplitSubmit}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Split Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
