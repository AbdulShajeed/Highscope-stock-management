'use client'

import { useState } from 'react'

interface CategoryReport {
  category_name: string
  total_opening: number
  total_opening_value: number
  total_sold: number
  total_sold_value: number
  total_added: number
  total_added_value: number
  total_closing: number
  total_closing_value: number
  item_count: number
}

interface ReportData {
  month: string
  year: number
  categories: CategoryReport[]
  totals: {
    total_opening: number
    total_opening_value: number
    total_sold: number
    total_sold_value: number
    total_added: number
    total_added_value: number
    total_closing: number
    total_closing_value: number
    item_count: number
  }
}

interface MonthlyReportTableProps {
  report: ReportData
  onUpdate?: (data: any) => void
}

export default function MonthlyReportTable({ report, onUpdate }: MonthlyReportTableProps) {
  const [editingCategory, setEditingCategory] = useState<CategoryReport | null>(null)
  const [editData, setEditData] = useState({
    total_opening: 0,
    total_opening_value: 0,
    total_sold: 0,
    total_sold_value: 0,
    total_added: 0,
    total_added_value: 0,
  })
  const [loading, setLoading] = useState(false)

  if (!report || report.categories.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-8 text-center">
        <p className="text-gray-500">No report data found.</p>
      </div>
    )
  }

  const handleEdit = (category: CategoryReport) => {
    setEditingCategory(category)
    setEditData({
      total_opening: category.total_opening,
      total_opening_value: category.total_opening_value,
      total_sold: category.total_sold,
      total_sold_value: category.total_sold_value,
      total_added: category.total_added || 0,
      total_added_value: category.total_added_value || 0,
    })
  }

  const handleSave = async () => {
    if (!editingCategory) return

    setLoading(true)
    try {
      // Calculate new closing quantity and value
      // Closing = Opening - Sold + Added
      const newClosingQty = editData.total_opening - editData.total_sold + editData.total_added
      const newClosingValue = editData.total_opening_value - editData.total_sold_value + editData.total_added_value

      // Update the category in the report
      const updatedCategories = report.categories.map(cat => {
        if (cat.category_name === editingCategory.category_name) {
          return {
            ...cat,
            total_opening: editData.total_opening,
            total_opening_value: editData.total_opening_value,
            total_sold: editData.total_sold,
            total_sold_value: editData.total_sold_value,
            total_added: editData.total_added,
            total_added_value: editData.total_added_value,
            total_closing: newClosingQty,
            total_closing_value: newClosingValue,
          }
        }
        return cat
      })

      // Recalculate totals
      const newTotals = updatedCategories.reduce((acc, cat) => ({
        total_opening: acc.total_opening + cat.total_opening,
        total_opening_value: acc.total_opening_value + cat.total_opening_value,
        total_sold: acc.total_sold + cat.total_sold,
        total_sold_value: acc.total_sold_value + cat.total_sold_value,
        total_added: acc.total_added + (cat.total_added || 0),
        total_added_value: acc.total_added_value + (cat.total_added_value || 0),
        total_closing: acc.total_closing + cat.total_closing,
        total_closing_value: acc.total_closing_value + cat.total_closing_value,
        item_count: acc.item_count + cat.item_count,
      }), {
        total_opening: 0,
        total_opening_value: 0,
        total_sold: 0,
        total_sold_value: 0,
        total_added: 0,
        total_added_value: 0,
        total_closing: 0,
        total_closing_value: 0,
        item_count: 0
      })

      const updatedReport = {
        ...report,
        categories: updatedCategories,
        totals: newTotals,
      }

      // Call onUpdate if provided
      if (onUpdate) {
        onUpdate(updatedReport)
      }

      setEditingCategory(null)
    } catch (error) {
      console.error('Error updating:', error)
      alert('Failed to update')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SL#
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Opening Qty
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Opening Value
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sold
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total PO Value
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Qty Added
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Added Value
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Closing Qty
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Closing Value
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {report.categories.map((category, index) => (
                <tr key={category.category_name} className="hover:bg-gray-50">
                  <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {index + 1}
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-900 font-medium">
                    {category.category_name}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                    {category.total_opening.toLocaleString()}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                    AED {(category.total_opening_value || 0).toLocaleString()}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                    {category.total_sold.toLocaleString()}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                    AED {(category.total_po_value || 0).toLocaleString()}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                    {(category.total_added || 0).toLocaleString()}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-blue-600">
                    AED {(category.total_added_value || 0).toLocaleString()}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                    <span className={category.total_closing < 0 ? 'text-red-600' : 'text-green-600'}>
                      {category.total_closing.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={category.total_closing_value < 0 ? 'text-red-600' : 'text-green-600'}>
                      AED {(category.total_closing_value || 0).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => handleEdit(category)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {/* Totals Row */}
              <tr className="bg-gray-50 font-bold">
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                  -
                </td>
                <td className="px-3 py-4 text-sm text-gray-900">
                  TOTAL
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                  AED {(report.totals.total_opening_value || 0).toLocaleString()}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                  AED {(report.totals.total_po_value || 0).toLocaleString()}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-blue-600">
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-blue-600">
                  AED {(report.totals.total_added_value || 0).toLocaleString()}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                  AED {(report.totals.total_closing_value || 0).toLocaleString()}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                  -
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Edit {editingCategory.category_name}
                </h2>
                <button
                  onClick={() => setEditingCategory(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Opening Quantity
                    </label>
                    <input
                      type="number"
                      value={editData.total_opening}
                      onChange={(e) => setEditData({ ...editData, total_opening: parseInt(e.target.value) || 0 })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Opening Value (AED)
                    </label>
                    <input
                      type="number"
                      value={editData.total_opening_value}
                      onChange={(e) => setEditData({ ...editData, total_opening_value: parseFloat(e.target.value) || 0 })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Sold Quantity
                    </label>
                    <input
                      type="number"
                      value={editData.total_sold}
                      onChange={(e) => setEditData({ ...editData, total_sold: parseInt(e.target.value) || 0 })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Sold Value (AED)
                    </label>
                    <input
                      type="number"
                      value={editData.total_sold_value}
                      onChange={(e) => setEditData({ ...editData, total_sold_value: parseFloat(e.target.value) || 0 })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Qty Added
                    </label>
                    <input
                      type="number"
                      value={editData.total_added}
                      onChange={(e) => setEditData({ ...editData, total_added: parseInt(e.target.value) || 0 })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Added Value (AED)
                    </label>
                    <input
                      type="number"
                      value={editData.total_added_value}
                      onChange={(e) => setEditData({ ...editData, total_added_value: parseFloat(e.target.value) || 0 })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Closing Quantity (Auto-calculated)
                      </label>
                      <div className="mt-1 text-lg font-bold text-gray-900">
                        {editData.total_opening - editData.total_sold + editData.total_added}
                      </div>
                      <div className="text-xs text-gray-500">
                        Opening - Sold + Added
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Closing Value (Auto-calculated)
                      </label>
                      <div className="mt-1 text-lg font-bold text-gray-900">
                        AED {editData.total_opening_value - editData.total_sold_value + editData.total_added_value}
                      </div>
                      <div className="text-xs text-gray-500">
                        Opening - Sold + Added
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
