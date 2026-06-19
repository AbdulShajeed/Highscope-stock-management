'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Category {
  id: string
  name: string
  description: string | null
  item_count: number
  isDeleted: number
  deletedAt: string | null
  deleteReason: string | null
}

interface MonthlyReport {
  month: string
  year: number
  total_customer_po_value: number
}

interface SalesData {
  month: string
  value: number
}

export default function Dashboard() {
  const [categories, setCategories] = useState<Category[]>([])
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([])
  const [salesData, setSalesData] = useState<SalesData[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategory, setNewCategory] = useState({ name: '', description: '' })
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editCategoryData, setEditCategoryData] = useState({ name: '', description: '' })
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [deleteData, setDeleteData] = useState({ name: '', reason: '' })
  const [chartTooltip, setChartTooltip] = useState<{ x: number; y: number; month: string; value: number; growth: string; isIncrease: boolean } | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all available monthly reports
        const allReportsRes = await fetch('/api/all-monthly-reports')
        const allReportsData = await allReportsRes.json()

        const [categoriesRes] = await Promise.all([
          fetch('/api/categories'),
        ])

        const categoriesData = await categoriesRes.json()

        setCategories(categoriesData)

        // Only show last 3 months in the monthly reports section
        const recentReports = allReportsData.slice(0, 3)
        const reports: MonthlyReport[] = recentReports.map((report: any) => ({
          month: report.month,
          year: report.year,
          total_customer_po_value: report.total_closing || 0,
        }))
        setMonthlyReports(reports)

        // Create sales data for chart (only last 3 months with real data)
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        const sales: SalesData[] = allReportsData.slice(0, 3).map((report: any) => ({
          month: report.month.substring(0, 3),
          value: report.total_closing || 0,
          monthIndex: months.indexOf(report.month),
        })).sort((a, b) => a.monthIndex - b.monthIndex) // Chronological: oldest left, newest right

        setSalesData(sales)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleAddCategory = async () => {
    if (!newCategory.name) {
      alert('Category name is required')
      return
    }

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCategory),
      })

      if (response.ok) {
        const category = await response.json()
        setCategories([...categories, { ...category, item_count: 0 }])
        setNewCategory({ name: '', description: '' })
        setShowAddCategory(false)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to add category')
      }
    } catch (error) {
      console.error('Error adding category:', error)
      alert('Failed to add category')
    }
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setEditCategoryData({ name: category.name, description: category.description || '' })
  }

  const handleUpdateCategory = async () => {
    if (!editCategoryData.name) {
      alert('Category name is required')
      return
    }

    try {
      const response = await fetch('/api/categories', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingCategory?.id,
          name: editCategoryData.name,
          description: editCategoryData.description,
        }),
      })

      if (response.ok) {
        const updatedCategory = await response.json()
        setCategories(categories.map(cat =>
          cat.id === editingCategory?.id
            ? { ...cat, name: editCategoryData.name, description: editCategoryData.description }
            : cat
        ))
        setEditingCategory(null)
        setEditCategoryData({ name: '', description: '' })
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update category')
      }
    } catch (error) {
      console.error('Error updating category:', error)
      alert('Failed to update category')
    }
  }

  const handleDeleteCategory = (category: Category) => {
    setDeletingCategory(category)
    setDeleteData({ name: '', reason: '' })
  }

  const confirmDeleteCategory = async () => {
    if (!deletingCategory) return

    if (!deleteData.name) {
      alert('Please enter your name to confirm deletion')
      return
    }

    if (!deleteData.reason) {
      alert('Please enter a reason for deletion')
      return
    }

    try {
      const response = await fetch('/api/categories', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: deletingCategory.id,
          deletedBy: deleteData.name,
          reason: deleteData.reason,
        }),
      })

      if (response.ok) {
        // Update the category in the list to show as deleted
        setCategories(categories.map(cat =>
          cat.id === deletingCategory.id
            ? { ...cat, isDeleted: 1, deletedAt: new Date().toISOString(), deleteReason: `${deleteData.reason} (by: ${deleteData.name})` }
            : cat
        ))
        setDeletingCategory(null)
        setDeleteData({ name: '', reason: '' })
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete category')
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      alert('Failed to delete category')
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
        <div className="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Stock Management Dashboard</h1>
          <div className="flex-shrink-0">
            {/* Company Logo */}
            <img src="/logo.png" alt="HighScope Engineering FZC" className="h-24 w-auto" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Summary + Monthly Reports Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Summary Section */}
          <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary - Last 3 Months Sales</h2>
          <div className="bg-white shadow rounded-lg p-6">
            {salesData.length > 0 ? (() => {
              const maxValue = Math.max(...salesData.map(d => d.value), 1)
              const chartHeight = 200
              const chartWidth = 600
              const barWidth = 60
              const padding = 80
              const spacing = (chartWidth - padding * 2) / (salesData.length || 1)

              // Build bar positions and heights
              const bars = salesData.map((d, i) => {
                const x = padding + i * spacing + spacing / 2 - barWidth / 2
                const barHeight = (d.value / maxValue) * (chartHeight - 40)
                const y = chartHeight - barHeight - 20
                const prevValue = i > 0 ? salesData[i - 1].value : null
                const growth = prevValue !== null ? ((d.value - prevValue) / (prevValue || 1) * 100).toFixed(1) : null
                const isIncrease = prevValue !== null ? d.value >= prevValue : true
                return { x, y, barHeight, value: d.value, month: d.month, growth, isIncrease }
              })

              // Build smooth curve points through bar tops
              const curvePoints = bars.map(b => ({ x: b.x + barWidth / 2, y: b.y }))

              // Create smooth cubic bezier path
              let pathD = ''
              if (curvePoints.length > 0) {
                pathD = `M ${curvePoints[0].x} ${curvePoints[0].y}`
                for (let i = 1; i < curvePoints.length; i++) {
                  const prev = curvePoints[i - 1]
                  const curr = curvePoints[i]
                  const cpx1 = prev.x + (curr.x - prev.x) * 0.4
                  const cpx2 = curr.x - (curr.x - prev.x) * 0.4
                  pathD += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`
                }
              }

              // Area fill path (curve + bottom)
              const areaD = pathD
                ? `${pathD} L ${curvePoints[curvePoints.length - 1].x} ${chartHeight - 20} L ${curvePoints[0].x} ${chartHeight - 20} Z`
                : ''

              return (
                <div className="relative">
                  <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`} className="w-full h-64" preserveAspectRatio="xMidYMid meet">
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6EE7B7" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.4" />
                      </linearGradient>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.02" />
                      </linearGradient>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      <filter id="barShadow">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#3B82F6" floodOpacity="0.2" />
                      </filter>
                    </defs>

                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                      <line
                        key={ratio}
                        x1={padding - 10}
                        y1={chartHeight - 20 - ratio * (chartHeight - 40)}
                        x2={chartWidth - padding + 10}
                        y2={chartHeight - 20 - ratio * (chartHeight - 40)}
                        stroke="#E5E7EB"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                      />
                    ))}

                    {/* Bars */}
                    {bars.map((b, i) => (
                      <g
                        key={i}
                        filter="url(#barShadow)"
                      >
                        <rect
                          x={b.x}
                          y={b.y}
                          width={barWidth}
                          height={b.barHeight}
                          rx="4"
                          fill="url(#barGradient)"
                        />
                        {/* Value label on top */}
                        <text
                          x={b.x + barWidth / 2}
                          y={b.y - 8}
                          textAnchor="middle"
                          className="text-xs"
                          fill="#374151"
                          fontSize="11"
                          fontWeight="600"
                        >
                          {b.value >= 1000 ? `${(b.value / 1000).toFixed(1)}k` : b.value}
                        </text>
                      </g>
                    ))}

                    {/* Area fill under curve */}
                    {areaD && (
                      <path d={areaD} fill="url(#areaGradient)" />
                    )}

                    {/* Smooth curve line */}
                    {pathD && (
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#3B82F6"
                        strokeWidth="3"
                        strokeLinecap="round"
                        filter="url(#glow)"
                      />
                    )}

                    {/* Dots on curve */}
                    {curvePoints.map((pt, i) => (
                      <g key={i}>
                        <circle cx={pt.x} cy={pt.y} r="5" fill="#3B82F6" />
                        <circle cx={pt.x} cy={pt.y} r="3" fill="white" />
                      </g>
                    ))}

                    {/* Invisible hit areas for tooltips - on top of everything */}
                    {bars.map((b, i) => (
                      <rect
                        key={`hit-${i}`}
                        x={b.x - 10}
                        y={20}
                        width={barWidth + 20}
                        height={chartHeight}
                        fill="transparent"
                        className="cursor-pointer"
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.closest('svg')?.getBoundingClientRect()
                          if (rect) {
                            setChartTooltip({
                              x: rect.left + (b.x + barWidth / 2) * (rect.width / chartWidth),
                              y: rect.top + b.y * (rect.height / (chartHeight + 40)),
                              month: b.month,
                              value: b.value,
                              growth: b.growth || '',
                              isIncrease: b.isIncrease,
                            })
                          }
                        }}
                        onMouseLeave={() => setChartTooltip(null)}
                      />
                    ))}

                    {/* Month labels */}
                    {bars.map((b, i) => (
                      <text
                        key={i}
                        x={b.x + barWidth / 2}
                        y={chartHeight + 15}
                        textAnchor="middle"
                        fill="#6B7280"
                        fontSize="12"
                        fontWeight="500"
                      >
                        {b.month}
                      </text>
                    ))}
                  </svg>
                  {chartTooltip && (
                    <div
                      className="fixed z-[9999] bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg pointer-events-none"
                      style={{ left: chartTooltip.x, top: chartTooltip.y - 10, transform: 'translate(-50%, -100%)' }}
                    >
                      <div className="font-semibold">{chartTooltip.month}</div>
                      <div>AED {chartTooltip.value.toLocaleString()}</div>
                      {chartTooltip.growth && (
                        <div className={chartTooltip.isIncrease ? 'text-green-400' : 'text-red-400'}>
                          {chartTooltip.isIncrease ? '↑' : '↓'} {Math.abs(parseFloat(chartTooltip.growth))}% from previous month
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })() : (
              <div className="text-center text-gray-500 py-8">No sales data available</div>
            )}
            <div className="mt-4 text-center text-sm text-gray-500">
              Customer PO Value (AED) by Month
            </div>
          </div>
        </div>

        {/* Monthly Report Section - Right Side */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Monthly Reports</h2>
            <Link
              href="/monthly/all-reports"
              className="px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-xs"
            >
              View All
            </Link>
          </div>
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Month
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PO Value (AED)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {monthlyReports.slice(0, 6).map((report) => (
                  <tr key={`${report.month}-${report.year}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {report.month} {report.year}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      AED {report.total_customer_po_value.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      <Link
                        href={`/monthly/${report.month.toLowerCase()}-${report.year}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </div>

        {/* Replenishment Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Replenishment Plan</h2>
          <div className="bg-white shadow rounded-lg p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {categories.filter(c => !c.isDeleted).map((category) => (
                <Link
                  key={category.id}
                  href={`/replenishment/${category.id}`}
                  className="flex items-center justify-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-center min-h-[60px]"
                >
                  <div className="text-base font-normal text-gray-900">{category.name}</div>
                </Link>
              ))}
              <Link
                href="/replenishment"
                className="flex items-center justify-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-center min-h-[60px]"
              >
                <div className="text-base font-medium text-blue-700">View All POs →</div>
              </Link>
            </div>
          </div>
        </div>

        {/* Product Category Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Product Categories</h2>
            <button
              onClick={() => setShowAddCategory(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Add Category
            </button>
          </div>
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SL#
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categories.map((category, index) => (
                  <tr key={category.id} className={`hover:bg-gray-50 ${category.isDeleted ? 'bg-gray-100' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {category.isDeleted ? (
                        <span className="line-through text-gray-400">{category.name}</span>
                      ) : (
                        <Link href={`/category/${category.id}`} className="text-blue-600 hover:text-blue-800">
                          {category.name}
                        </Link>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {category.isDeleted ? (
                        <span className="line-through text-gray-400">{category.description || '-'}</span>
                      ) : (
                        category.description || '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {category.item_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {category.isDeleted ? (
                        <span className="text-gray-400 text-xs">
                          Archived {new Date(category.deletedAt!).toLocaleDateString()}
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEditCategory(category)}
                            className="text-blue-600 hover:text-blue-800 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Add New Category</h2>
                <button
                  onClick={() => {
                    setShowAddCategory(false)
                    setNewCategory({ name: '', description: '' })
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
                  <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    id="categoryName"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter category name"
                  />
                </div>
                <div>
                  <label htmlFor="categoryDescription" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    id="categoryDescription"
                    value={newCategory.description}
                    onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter category description (optional)"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddCategory(false)
                    setNewCategory({ name: '', description: '' })
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCategory}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Add Category
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Edit Category</h2>
                <button
                  onClick={() => {
                    setEditingCategory(null)
                    setEditCategoryData({ name: '', description: '' })
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
                  <label htmlFor="editCategoryName" className="block text-sm font-medium text-gray-700">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    id="editCategoryName"
                    value={editCategoryData.name}
                    onChange={(e) => setEditCategoryData({ ...editCategoryData, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter category name"
                  />
                </div>
                <div>
                  <label htmlFor="editCategoryDescription" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    id="editCategoryDescription"
                    value={editCategoryData.description}
                    onChange={(e) => setEditCategoryData({ ...editCategoryData, description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter category description (optional)"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setEditingCategory(null)
                    setEditCategoryData({ name: '', description: '' })
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateCategory}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Modal */}
      {deletingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Archive Category</h2>
                <button
                  onClick={() => {
                    setDeletingCategory(null)
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
                  You are about to archive <strong>"{deletingCategory.name}"</strong>.
                  This category will be moved to the bottom of the list and its name will be struck through.
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
                    placeholder="Enter the reason for archiving this category"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setDeletingCategory(null)
                    setDeleteData({ name: '', reason: '' })
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteCategory}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Archive Category
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
