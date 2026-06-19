'use client'

import { useState, useEffect, Fragment } from 'react'

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
  deliveryHistory?: { quantity: number; deliveryDate: string; poNumber: string }[]
}

interface StockTableProps {
  items: StockItem[]
  categoryId: string
  refreshKey?: number
  onEdit: (item: StockItem) => void
  onSplit: (item: StockItem) => void
  onDelete: (itemId: string) => void
}

export default function StockTable({ items, categoryId, refreshKey = 0, onEdit, onSplit, onDelete }: StockTableProps) {
  const [itemMonths, setItemMonths] = useState<{ [key: string]: string }>({})
  const [itemYears, setItemYears] = useState<{ [key: string]: number }>({})
  const [monthlyBookings, setMonthlyBookings] = useState<{ [key: string]: number }>({})
  const [inStoreBookings, setInStoreBookings] = useState<{ [key: string]: number }>({})
  const [loadingItems, setLoadingItems] = useState<{ [key: string]: boolean }>({})
  const [expandedItems, setExpandedItems] = useState<{ [key: string]: boolean }>({})

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

  const fetchMonthlyBooking = async (itemId: string, month: string, year: number) => {
    setLoadingItems(prev => ({ ...prev, [itemId]: true }))
    try {
      // Fetch bookings for the selected month (for Monthly Sales column)
      const response = await fetch(
        `/api/bookings?categoryId=${categoryId}&month=${month}&year=${year}`
      )
      const bookings = await response.json()

      // Calculate total bookings for this specific item in selected month
      let totalBooked = 0
      bookings.forEach((booking: any) => {
        if (!booking.isDeleted && booking.stockItemId === itemId) {
          totalBooked += booking.quantityBooked
        }
      })

      setMonthlyBookings(prev => ({ ...prev, [itemId]: totalBooked }))

      // Fetch ALL bookings for this item across all months (for In Store column)
      const allBookingsResponse = await fetch(
        `/api/bookings?categoryId=${categoryId}`
      )
      const allBookings = await allBookingsResponse.json()

      // Calculate total in-store quantity across all months
      let inStoreQty = 0
      allBookings.forEach((booking: any) => {
        if (!booking.isDeleted && booking.stockItemId === itemId && booking.status === 'In Store') {
          inStoreQty += booking.quantityBooked
        }
      })

      setInStoreBookings(prev => ({ ...prev, [itemId]: inStoreQty }))
    } catch (error) {
      console.error('Error fetching bookings:', error)
      setMonthlyBookings(prev => ({ ...prev, [itemId]: 0 }))
      setInStoreBookings(prev => ({ ...prev, [itemId]: 0 }))
    } finally {
      setLoadingItems(prev => ({ ...prev, [itemId]: false }))
    }
  }

  const handleMonthChange = (itemId: string, month: string) => {
    setItemMonths(prev => ({ ...prev, [itemId]: month }))
    const year = itemYears[itemId] || currentYear
    fetchMonthlyBooking(itemId, month, year)
  }

  const handleYearChange = (itemId: string, year: number) => {
    setItemYears(prev => ({ ...prev, [itemId]: year }))
    const month = itemMonths[itemId] || currentMonth
    fetchMonthlyBooking(itemId, month, year)
  }

  // Initialize default months for all items
  useEffect(() => {
    const defaultMonths: { [key: string]: string } = {}
    const defaultYears: { [key: string]: number } = {}
    items.forEach(item => {
      defaultMonths[item.id] = currentMonth
      defaultYears[item.id] = currentYear
    })
    setItemMonths(defaultMonths)
    setItemYears(defaultYears)

    // Fetch bookings for all items on initial load
    const fetchAllBookings = async () => {
      try {
        // Fetch ALL bookings for the category (for In Store column)
        const response = await fetch(
          `/api/bookings?categoryId=${categoryId}`
        )
        const bookings = await response.json()

        // Calculate total bookings per item for selected month (Monthly Sales)
        const bookingsByItem: { [key: string]: number } = {}
        // Calculate total in-store bookings per item across all months
        const inStoreByItem: { [key: string]: number } = {}

        bookings.forEach((booking: any) => {
          if (!booking.isDeleted) {
            const itemId = booking.stockItemId
            // For Monthly Sales: count only bookings for current month
            if (booking.month === currentMonth && booking.year === currentYear) {
              bookingsByItem[itemId] = (bookingsByItem[itemId] || 0) + booking.quantityBooked
            }
            // For In Store: count all bookings with status "In Store" across all months
            if (booking.status === 'In Store') {
              inStoreByItem[itemId] = (inStoreByItem[itemId] || 0) + booking.quantityBooked
            }
          }
        })

        setMonthlyBookings(bookingsByItem)
        setInStoreBookings(inStoreByItem)
      } catch (error) {
        console.error('Error fetching bookings:', error)
      }
    }

    fetchAllBookings()
  }, [items, categoryId, refreshKey]) // Removed currentMonth and currentYear

  if (items.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-8 text-center">
        <p className="text-gray-500">No stock items found.</p>
      </div>
    )
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8">
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SL#
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item Code
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-96">
                Description
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Part No
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Make
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock Quantity
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price/qty
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock Value
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Incoming
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                In Store
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sold (TOTAL)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Monthly Sales
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item, index) => {
              const monthlyBooked = monthlyBookings[item.id] || 0
              const inStoreQty = inStoreBookings[item.id] || 0
              // Total Quantity = Original + Incoming - Monthly Booked
              const totalQuantity = item.finalQty + item.incomingQty - monthlyBooked
              // Sold (TOTAL) increases by booked amount
              const soldTotal = item.soldQty + monthlyBooked

              return (
                <Fragment key={item.id}>
                <tr className="hover:bg-gray-50">
                  <td className="px-2 py-4">
                    {(item.deliveryHistory && item.deliveryHistory.length > 0) || item.incomingQty > 0 ? (
                      <button
                        onClick={() => setExpandedItems(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <svg
                          className={`w-4 h-4 transition-transform ${expandedItems[item.id] ? 'rotate-90' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {index + 1}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.itemCode}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500 w-96">
                    <div className="whitespace-normal">{item.description}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.detailedDescription || '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.make || '-'}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500 font-medium">
                    {item.isSplit ? (
                      <div className="text-xs">
                        <div>Old: {(item as any).oldQty?.toLocaleString() || '0'}</div>
                        <div>New: {(item as any).newQty?.toLocaleString() || '0'}</div>
                        <div className="font-bold">Total: {totalQuantity.toLocaleString()}</div>
                      </div>
                    ) : (
                      <span className={totalQuantity < 0 ? 'text-red-600' : ''}>
                        {totalQuantity.toLocaleString()}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {item.isSplit ? (
                      <div className="text-xs">
                        <div>Old: AED {(item as any).oldPrice?.toLocaleString() || '0'}</div>
                        <div>New: AED {(item as any).newPrice?.toLocaleString() || '0'}</div>
                      </div>
                    ) : (
                      item.ratePerPcs ? `AED ${item.ratePerPcs.toLocaleString()}` : '-'
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.isSplit ? (
                      `AED ${(((item as any).oldQty || 0) * ((item as any).oldPrice || 0) + ((item as any).newQty || 0) * ((item as any).newPrice || 0)).toLocaleString()}`
                    ) : (
                      item.ratePerPcs ? `AED ${(totalQuantity * item.ratePerPcs).toLocaleString()}` : '-'
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.incomingQty.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={inStoreQty < 0 ? 'text-red-600' : 'text-green-600'}>
                      {loadingItems[item.id] ? '...' : inStoreQty.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                    {soldTotal.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <div className="flex flex-col gap-1">
                      <select
                        value={`${itemMonths[item.id] || currentMonth}-${itemYears[item.id] || currentYear}`}
                        onChange={(e) => {
                          const [month, year] = e.target.value.split('-')
                          handleMonthChange(item.id, month)
                          handleYearChange(item.id, parseInt(year))
                        }}
                        className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full min-w-[120px]"
                      >
                        {months.map((month) => (
                          <option key={`${month}-${currentYear}`} value={`${month}-${currentYear}`}>
                            {month.substring(0, 3)} {currentYear}
                          </option>
                        ))}
                      </select>
                      <div className="text-blue-600 font-medium text-sm">
                        {loadingItems[item.id] ? '...' : monthlyBooked}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => onEdit(item)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onSplit(item)}
                      className="text-green-600 hover:text-green-900 mr-3"
                    >
                      Split
                    </button>
                    <button
                      onClick={() => onDelete(item.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
                {expandedItems[item.id] && (
                  <tr>
                    <td colSpan={13} className="px-4 py-3 bg-blue-50">
                      <div className="ml-6">
                        <div className="text-xs font-semibold text-gray-600 mb-2">Delivery History & Incoming</div>
                        {item.incomingQty > 0 && (
                          <div className="mb-2 px-2 py-1 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-800">
                            Incoming: <span className="font-medium">{item.incomingQty.toLocaleString()}</span> pcs (pending delivery)
                          </div>
                        )}
                        {item.deliveryHistory && item.deliveryHistory.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {item.deliveryHistory.map((h, i) => (
                              <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-white border border-green-200 text-green-700">
                                {h.poNumber}: <span className="font-medium ml-1">{h.quantity} pcs</span> <span className="text-gray-400 ml-1">({h.deliveryDate})</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No deliveries yet</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
              )
            })}
            {/* Total Row */}
            <tr className="bg-gray-50 font-bold border-t-2 border-gray-300">
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
              </td>
              <td className="px-4 py-4 text-sm text-gray-900">
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                TOTAL
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                {items.reduce((sum, item) => {
                  const monthlyBooked = monthlyBookings[item.id] || 0
                  const qty = item.finalQty + item.incomingQty - monthlyBooked
                  return sum + Math.max(0, qty)
                }, 0).toLocaleString()}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                AED {items.reduce((sum, item) => {
                  const monthlyBooked = monthlyBookings[item.id] || 0
                  const totalQuantity = Math.max(0, item.finalQty + item.incomingQty - monthlyBooked)
                  if (item.isSplit) {
                    const oldQty = Math.max(0, (item as any).oldQty || 0)
                    const newQty = Math.max(0, (item as any).newQty || 0)
                    return sum + (oldQty * ((item as any).oldPrice || 0) + newQty * ((item as any).newPrice || 0))
                  }
                  return sum + (totalQuantity * (item.ratePerPcs || 0))
                }, 0).toLocaleString()}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
