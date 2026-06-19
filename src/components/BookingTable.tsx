'use client'

import { useState } from 'react'

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

interface StockItem {
  id: string
  itemCode: string
  description: string
  make: string | null
}

interface BookingTableProps {
  bookings: Booking[]
  setBookings: (bookings: Booking[]) => void
  stockItems: StockItem[]
  categoryId: string
  month: string
  year: number
  onAddBooking: (booking: any) => void
  onUpdateBooking: () => void
  onStatusChange: () => void
  onDeleteBooking: (id: string) => void
}

export default function BookingTable({
  bookings,
  setBookings,
  stockItems,
  categoryId,
  month,
  year,
  onAddBooking,
  onUpdateBooking,
  onStatusChange,
  onDeleteBooking
}: BookingTableProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null)
  const [deletingBooking, setDeletingBooking] = useState<Booking | null>(null)
  const [deleteData, setDeleteData] = useState({ name: '', reason: '' })
  const [newBooking, setNewBooking] = useState({
    stockItemId: '',
    quantityBooked: '',
    projectNumber: '',
    engineerName: '',
    bookingDate: new Date().toISOString().split('T')[0],
    notes: '',
    status: 'In Store',
  })
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  const handleAddBooking = async () => {
    if (!newBooking.stockItemId || !newBooking.quantityBooked) {
      alert('Please select an item and enter quantity')
      return
    }

    // Determine the correct month and year from the booking date
    const bookingDate = newBooking.bookingDate ? new Date(newBooking.bookingDate) : new Date()
    const bookingMonth = bookingDate.toLocaleString('default', { month: 'long' })
    const bookingYear = bookingDate.getFullYear()

    setLoading(true)
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newBooking,
          categoryId,
          month: bookingMonth,
          year: bookingYear,
          quantityBooked: parseInt(newBooking.quantityBooked),
        }),
      })

      if (response.ok) {
        const booking = await response.json()
        onAddBooking(booking)
        setNewBooking({
          stockItemId: '',
          quantityBooked: '',
          projectNumber: '',
          engineerName: '',
          bookingDate: new Date().toISOString().split('T')[0],
          notes: '',
          status: 'In Store',
        })
        setShowAddForm(false)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create booking')
      }
    } catch (error) {
      console.error('Error creating booking:', error)
      alert('Failed to create booking')
    } finally {
      setLoading(false)
    }
  }

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking)
    setNewBooking({
      stockItemId: booking.stockItemId,
      quantityBooked: booking.quantityBooked.toString(),
      projectNumber: booking.projectNumber || '',
      engineerName: booking.engineerName || '',
      bookingDate: booking.bookingDate ? booking.bookingDate.split('T')[0] : new Date().toISOString().split('T')[0],
      notes: booking.notes || '',
      status: booking.status,
    })
    setShowAddForm(true)
  }

  const handleUpdateBooking = async () => {
    if (!editingBooking) return

    setLoading(true)
    try {
      const response = await fetch('/api/bookings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingBooking.id,
          quantityBooked: parseInt(newBooking.quantityBooked),
          projectNumber: newBooking.projectNumber,
          engineerName: newBooking.engineerName,
          bookingDate: newBooking.bookingDate,
          notes: newBooking.notes,
          status: newBooking.status,
        }),
      })

      if (response.ok) {
        const updatedBooking = await response.json()
        setBookings(bookings.map(b =>
          b.id === editingBooking.id ? { ...b, ...updatedBooking } : b
        ))
        setEditingBooking(null)
        setNewBooking({
          stockItemId: '',
          quantityBooked: '',
          projectNumber: '',
          engineerName: '',
          bookingDate: new Date().toISOString().split('T')[0],
          notes: '',
          status: 'In Store',
        })
        setShowAddForm(false)
        // Notify parent to refresh master sheet
        onUpdateBooking()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update booking')
      }
    } catch (error) {
      console.error('Error updating booking:', error)
      alert('Failed to update booking')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteBooking = (booking: Booking) => {
    setDeletingBooking(booking)
    setDeleteData({ name: '', reason: '' })
  }

  const confirmDeleteBooking = async () => {
    if (!deletingBooking) return

    if (!deleteData.name) {
      alert('Please enter your name to confirm deletion')
      return
    }

    if (!deleteData.reason) {
      alert('Please enter a reason for deletion')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/bookings', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: deletingBooking.id,
          deletedBy: deleteData.name,
          reason: deleteData.reason,
        }),
      })

      if (response.ok) {
        // Update the booking in the list to show as deleted
        setBookings(bookings.map(b =>
          b.id === deletingBooking.id
            ? {
                ...b,
                isDeleted: 1,
                deletedAt: new Date().toISOString(),
                deletedBy: deleteData.name,
                deleteReason: deleteData.reason,
              }
            : b
        ))
        setDeletingBooking(null)
        setDeleteData({ name: '', reason: '' })
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete booking')
      }
    } catch (error) {
      console.error('Error deleting booking:', error)
      alert('Failed to delete booking')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const response = await fetch('/api/bookings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, status: newStatus }),
      })

      if (response.ok) {
        // Update local state
        setBookings(bookings.map(b =>
          b.id === id ? { ...b, status: newStatus } : b
        ))
        // Notify parent to refresh master sheet
        onStatusChange()
        // Show notification
        setStatusMessage(`Status updated to "${newStatus}". Switch to Master tab to see changes.`)
        setTimeout(() => setStatusMessage(''), 3000)
      } else {
        alert('Failed to update status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status')
    }
  }

  return (
    <>
      {/* Status Update Notification */}
      {statusMessage && (
        <div className="mb-4 p-3 bg-green-100 border border-green-200 rounded-md">
          <p className="text-sm text-green-800">{statusMessage}</p>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Bookings for {month} {year}
        </h3>
        <button
          onClick={() => {
            setEditingBooking(null)
            setNewBooking({
              stockItemId: '',
              quantityBooked: '',
              projectNumber: '',
              engineerName: '',
              bookingDate: new Date().toISOString().split('T')[0],
              notes: '',
              status: 'In Store',
            })
            setShowAddForm(true)
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Booking
        </button>
      </div>

      {/* Bookings Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SL#
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item Code
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Make
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Qty Booked
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Project No
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Engineer
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                  No bookings found for this month
                </td>
              </tr>
            ) : (
              bookings.map((booking, index) => (
                <tr key={booking.id} className={`hover:bg-gray-50 ${booking.isDeleted ? 'bg-gray-100' : ''}`}>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {index + 1}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {booking.isDeleted ? (
                      <span className="line-through text-gray-400">{booking.itemCode}</span>
                    ) : (
                      booking.itemCode
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {booking.isDeleted ? (
                      <span className="line-through text-gray-400">{booking.item_description}</span>
                    ) : (
                      booking.item_description
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {booking.isDeleted ? (
                      <span className="line-through text-gray-400">{booking.make || '-'}</span>
                    ) : (
                      booking.make || '-'
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                    {booking.isDeleted ? (
                      <span className="line-through text-gray-400">{booking.quantityBooked}</span>
                    ) : (
                      booking.quantityBooked
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {booking.isDeleted ? (
                      <span className="line-through text-gray-400">{booking.projectNumber || '-'}</span>
                    ) : (
                      booking.projectNumber || '-'
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {booking.isDeleted ? (
                      <span className="line-through text-gray-400">{booking.engineerName || '-'}</span>
                    ) : (
                      booking.engineerName || '-'
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {booking.isDeleted ? (
                      <span className="line-through text-gray-400">
                        {booking.bookingDate ? new Date(booking.bookingDate).toLocaleDateString() : '-'}
                      </span>
                    ) : (
                      booking.bookingDate ? new Date(booking.bookingDate).toLocaleDateString() : '-'
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    {booking.isDeleted ? (
                      <span className="text-gray-400 text-xs">Archived</span>
                    ) : (
                      <select
                        value={booking.status}
                        onChange={(e) => handleStatusChange(booking.id, e.target.value)}
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          booking.status === 'Out'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        <option value="In Store">In Store</option>
                        <option value="Out">Out</option>
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {booking.isDeleted ? (
                      <span className="text-gray-400 text-xs">
                        Archived {new Date(booking.deletedAt!).toLocaleDateString()}
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEditBooking(booking)}
                          className="text-blue-600 hover:text-blue-800 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteBooking(booking)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Booking Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingBooking ? 'Edit Booking' : 'Add New Booking'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingBooking(null)
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
                  <label className="block text-sm font-medium text-gray-700">
                    Select Item *
                  </label>
                  <select
                    value={newBooking.stockItemId}
                    onChange={(e) => setNewBooking({ ...newBooking, stockItemId: e.target.value })}
                    disabled={!!editingBooking}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
                  >
                    <option value="">Select an item</option>
                    {stockItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.itemCode} - {item.description}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Quantity Booked *
                    </label>
                    <input
                      type="number"
                      value={newBooking.quantityBooked}
                      onChange={(e) => setNewBooking({ ...newBooking, quantityBooked: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter quantity"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Project Number
                    </label>
                    <input
                      type="text"
                      value={newBooking.projectNumber}
                      onChange={(e) => setNewBooking({ ...newBooking, projectNumber: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter project number"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Engineer Name
                    </label>
                    <input
                      type="text"
                      value={newBooking.engineerName}
                      onChange={(e) => setNewBooking({ ...newBooking, engineerName: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter engineer name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Booking Date
                    </label>
                    <input
                      type="date"
                      value={newBooking.bookingDate}
                      onChange={(e) => setNewBooking({ ...newBooking, bookingDate: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Status
                    </label>
                    <select
                      value={newBooking.status}
                      onChange={(e) => setNewBooking({ ...newBooking, status: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="In Store">In Store</option>
                      <option value="Out">Out</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Notes
                    </label>
                    <textarea
                      value={newBooking.notes}
                      onChange={(e) => setNewBooking({ ...newBooking, notes: e.target.value })}
                      rows={2}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter any additional notes"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingBooking(null)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={editingBooking ? handleUpdateBooking : handleAddBooking}
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingBooking ? 'Update Booking' : 'Add Booking'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Booking Confirmation Modal */}
      {deletingBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Archive Booking</h2>
                <button
                  onClick={() => {
                    setDeletingBooking(null)
                    setDeleteData({ name: '', reason: '' })
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  You are about to archive booking for <strong>"{deletingBooking.itemCode}"</strong>.
                  This booking will be moved to the bottom of the list and its details will be struck through.
                  The data will not be deleted.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label htmlFor="deleteName" className="block text-sm font-medium text-gray-700">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    id="deleteName"
                    value={deleteData.name}
                    onChange={(e) => setDeleteData({ ...deleteData, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter your name to confirm"
                  />
                </div>
                <div>
                  <label htmlFor="deleteReason" className="block text-sm font-medium text-gray-700">
                    Reason for Archiving *
                  </label>
                  <textarea
                    id="deleteReason"
                    value={deleteData.reason}
                    onChange={(e) => setDeleteData({ ...deleteData, reason: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter the reason for archiving this booking"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setDeletingBooking(null)
                    setDeleteData({ name: '', reason: '' })
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteBooking}
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {loading ? 'Archiving...' : 'Archive Booking'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
