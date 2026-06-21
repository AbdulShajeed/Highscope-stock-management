'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

// Types
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

interface DashboardApiResponse {
  categories: Category[]
  monthlyReports: Array<{
    month: string
    year: number
    total_closing: number
  }>
}

interface ChartTooltip {
  x: number
  y: number
  month: string
  value: number
  growth: string
  isIncrease: boolean
}

// Constants
const CACHE_TTL = 60_000
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const
const CHART_HEIGHT = 200
const CHART_WIDTH = 600
const CHART_BAR_WIDTH = 60
const CHART_PADDING = 80

// Cache
const cache: { data: DashboardApiResponse | null; timestamp: number } = { data: null, timestamp: 0 }

// Helper functions
function processMonthlyReports(rawReports: DashboardApiResponse['monthlyReports']): MonthlyReport[] {
  return rawReports.map(report => ({
    month: report.month,
    year: report.year,
    total_customer_po_value: report.total_closing || 0,
  }))
}

function processSalesData(rawReports: DashboardApiResponse['monthlyReports']): SalesData[] {
  return rawReports
    .map(report => ({
      month: report.month.substring(0, 3),
      value: report.total_closing || 0,
      monthIndex: MONTHS.indexOf(report.month as typeof MONTHS[number]),
    }))
    .sort((a, b) => a.monthIndex - b.monthIndex)
}

async function fetchDashboardData(): Promise<DashboardApiResponse> {
  const res = await fetch('/api/dashboard-data')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// Components
function CategoryModal({
  mode,
  data,
  onClose,
  onSubmit,
}: {
  mode: 'add' | 'edit'
  data: { name: string; description: string }
  onClose: () => void
  onSubmit: (data: { name: string; description: string }) => void
}) {
  const [formData, setFormData] = useState(data)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {mode === 'add' ? 'Add New Category' : 'Edit Category'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Category Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter category name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter category description (optional)"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={() => onSubmit(formData)} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
              {mode === 'add' ? 'Add Category' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DeleteCategoryModal({
  category,
  onClose,
  onConfirm,
}: {
  category: Category
  onClose: () => void
  onConfirm: (name: string, reason: string) => void
}) {
  const [deleteName, setDeleteName] = useState('')
  const [deleteReason, setDeleteReason] = useState('')

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Archive Category</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              You are about to archive <strong>&quot;{category.name}&quot;</strong>.
              This category will be moved to the bottom of the list and its name will be struck through.
              The data will not be deleted.
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Your Name *</label>
              <input
                type="text"
                value={deleteName}
                onChange={(e) => setDeleteName(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter your name to confirm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Reason for Archiving *</label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter the reason for archiving this category"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={() => {
                if (!deleteName) { alert('Please enter your name'); return }
                if (!deleteReason) { alert('Please enter a reason'); return }
                onConfirm(deleteName, deleteReason)
              }}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            >
              Archive Category
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [categories, setCategories] = useState<Category[]>([])
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([])
  const [salesData, setSalesData] = useState<SalesData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [chartTooltip, setChartTooltip] = useState<ChartTooltip | null>(null)

  const processData = useCallback((data: DashboardApiResponse) => {
    setCategories(data.categories)
    setMonthlyReports(processMonthlyReports(data.monthlyReports))
    setSalesData(processSalesData(data.monthlyReports))
  }, [])

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)

    try {
      const data = await fetchDashboardData()
      cache.data = data
      cache.timestamp = Date.now()
      processData(data)
    } catch (e) {
      console.error('Error fetching data:', e)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [processData])

  const loadFromCacheOrFetch = useCallback(async () => {
    if (cache.data && Date.now() - cache.timestamp < CACHE_TTL) {
      processData(cache.data)
      setLoading(false)
      loadData(false) // Background refresh
      return
    }
    await loadData()
  }, [processData, loadData])

  useEffect(() => { loadFromCacheOrFetch() }, [loadFromCacheOrFetch])

  const handleAddCategory = async (data: { name: string; description: string }) => {
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (response.ok) {
        const category = await response.json()
        setCategories([...categories, { ...category, item_count: 0 }])
        setShowAddCategory(false)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to add category')
      }
    } catch (e) {
      console.error('Error adding category:', e)
      alert('Failed to add category')
    }
  }

  const handleUpdateCategory = async (data: { name: string; description: string }) => {
    if (!editingCategory) return
    try {
      const response = await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingCategory.id, ...data }),
      })
      if (response.ok) {
        setCategories(categories.map(cat =>
          cat.id === editingCategory.id ? { ...cat, ...data } : cat
        ))
        setEditingCategory(null)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update category')
      }
    } catch (e) {
      console.error('Error updating category:', e)
      alert('Failed to update category')
    }
  }

  const handleDeleteCategory = async (deletedBy: string, reason: string) => {
    if (!deletingCategory) return
    try {
      const response = await fetch('/api/categories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deletingCategory.id, deletedBy, reason }),
      })
      if (response.ok) {
        setCategories(categories.map(cat =>
          cat.id === deletingCategory.id
            ? { ...cat, isDeleted: 1, deletedAt: new Date().toISOString(), deleteReason: `${reason} (by: ${deletedBy})` }
            : cat
        ))
        setDeletingCategory(null)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete category')
      }
    } catch (e) {
      console.error('Error deleting category:', e)
      alert('Failed to delete category')
    }
  }

  // Chart calculations
  const maxValue = Math.max(...salesData.map(d => d.value), 1)
  const chartSpacing = (CHART_WIDTH - CHART_PADDING * 2) / (salesData.length || 1)

  const bars = salesData.map((d, i) => {
    const x = CHART_PADDING + i * chartSpacing + chartSpacing / 2 - CHART_BAR_WIDTH / 2
    const barHeight = (d.value / maxValue) * (CHART_HEIGHT - 40)
    const y = CHART_HEIGHT - barHeight - 20
    const prevValue = i > 0 ? salesData[i - 1].value : null
    const growth = prevValue !== null ? ((d.value - prevValue) / (prevValue || 1) * 100).toFixed(1) : null
    const isIncrease = prevValue !== null ? d.value >= prevValue : true
    return { x, y, barHeight, value: d.value, month: d.month, growth, isIncrease }
  })

  const curvePoints = bars.map(b => ({ x: b.x + CHART_BAR_WIDTH / 2, y: b.y }))

  let pathD = ''
  if (curvePoints.length > 0) {
    pathD = `M ${curvePoints[0].x} ${curvePoints[0].y}`
    for (let i = 1; i < curvePoints.length; i++) {
      const prev = curvePoints[i - 1]
      const curr = curvePoints[i]
      pathD += ` C ${prev.x + (curr.x - prev.x) * 0.4} ${prev.y}, ${curr.x - (curr.x - prev.x) * 0.4} ${curr.y}, ${curr.x} ${curr.y}`
    }
  }

  const areaD = pathD
    ? `${pathD} L ${curvePoints[curvePoints.length - 1].x} ${CHART_HEIGHT - 20} L ${curvePoints[0].x} ${CHART_HEIGHT - 20} Z`
    : ''

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-24 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <div className="h-6 w-56 bg-gray-200 rounded animate-pulse mb-4"></div>
              <div className="bg-white shadow rounded-lg p-6 h-72 flex items-center justify-center">
                <div className="text-gray-400 text-sm">Loading chart...</div>
              </div>
            </div>
            <div><div className="h-6 w-36 bg-gray-200 rounded animate-pulse mb-4"></div><div className="bg-white shadow rounded-lg h-48"></div></div>
          </div>
          <div className="h-6 w-44 bg-gray-200 rounded animate-pulse mb-4"></div>
          <div className="bg-white shadow rounded-lg h-24 mb-8"></div>
          <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-4"></div>
          <div className="bg-white shadow rounded-lg h-64"></div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-gray-600 mb-4">Failed to load data</div>
          <button onClick={() => { setError(false); cache.timestamp = 0; loadData() }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Stock Management Dashboard</h1>
          <div className="flex-shrink-0"><img src="/logo.png" alt="HighScope Engineering FZC" className="h-24 w-auto" /></div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary - Last 3 Months Sales</h2>
            <div className="bg-white shadow rounded-lg p-6">
              {salesData.length > 0 ? (
                <div className="relative">
                  <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT + 40}`} className="w-full h-64" preserveAspectRatio="xMidYMid meet">
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6EE7B7" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.4" />
                      </linearGradient>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.02" />
                      </linearGradient>
                      <filter id="glow"><feGaussianBlur stdDeviation="3" result="coloredBlur" /><feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                      <filter id="barShadow"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#3B82F6" floodOpacity="0.2" /></filter>
                    </defs>
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                      <line key={ratio} x1={CHART_PADDING - 10} y1={CHART_HEIGHT - 20 - ratio * (CHART_HEIGHT - 40)} x2={CHART_WIDTH - CHART_PADDING + 10} y2={CHART_HEIGHT - 20 - ratio * (CHART_HEIGHT - 40)} stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4 4" />
                    ))}
                    {bars.map((b, i) => (
                      <g key={i} filter="url(#barShadow)">
                        <rect x={b.x} y={b.y} width={CHART_BAR_WIDTH} height={b.barHeight} rx="4" fill="url(#barGradient)" />
                        <text x={b.x + CHART_BAR_WIDTH / 2} y={b.y - 8} textAnchor="middle" fill="#374151" fontSize="11" fontWeight="600">
                          {b.value >= 1000 ? `${(b.value / 1000).toFixed(1)}k` : b.value}
                        </text>
                      </g>
                    ))}
                    {areaD && <path d={areaD} fill="url(#areaGradient)" />}
                    {pathD && <path d={pathD} fill="none" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" filter="url(#glow)" />}
                    {curvePoints.map((pt, i) => (<g key={i}><circle cx={pt.x} cy={pt.y} r="5" fill="#3B82F6" /><circle cx={pt.x} cy={pt.y} r="3" fill="white" /></g>))}
                    {bars.map((b, i) => (
                      <rect key={`hit-${i}`} x={b.x - 10} y={20} width={CHART_BAR_WIDTH + 20} height={CHART_HEIGHT} fill="transparent" className="cursor-pointer"
                        onMouseEnter={(e) => { const rect = e.currentTarget.closest('svg')?.getBoundingClientRect(); if (rect) setChartTooltip({ x: rect.left + (b.x + CHART_BAR_WIDTH / 2) * (rect.width / CHART_WIDTH), y: rect.top + b.y * (rect.height / (CHART_HEIGHT + 40)), month: b.month, value: b.value, growth: b.growth || '', isIncrease: b.isIncrease }) }}
                        onMouseLeave={() => setChartTooltip(null)} />
                    ))}
                    {bars.map((b, i) => (<text key={i} x={b.x + CHART_BAR_WIDTH / 2} y={CHART_HEIGHT + 15} textAnchor="middle" fill="#6B7280" fontSize="12" fontWeight="500">{b.month}</text>))}
                  </svg>
                  {chartTooltip && (
                    <div className="fixed z-[9999] bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg pointer-events-none" style={{ left: chartTooltip.x, top: chartTooltip.y - 10, transform: 'translate(-50%, -100%)' }}>
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
              ) : <div className="text-center text-gray-500 py-8">No sales data available</div>}
              <div className="mt-4 text-center text-sm text-gray-500">Customer PO Value (AED) by Month</div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Monthly Reports</h2>
              <Link href="/monthly/all-reports" className="px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-xs">View All</Link>
            </div>
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50"><tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO Value (AED)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr></thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {monthlyReports.slice(0, 6).map((report) => (
                    <tr key={`${report.month}-${report.year}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{report.month} {report.year}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">AED {report.total_customer_po_value.toLocaleString()}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500"><Link href={`/monthly/${report.month.toLowerCase()}-${report.year}`} className="text-blue-600 hover:text-blue-800">View</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Replenishment Plan</h2>
          <div className="bg-white shadow rounded-lg p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {categories.filter(c => !c.isDeleted).map((category) => (
                <Link key={category.id} href={`/replenishment/${category.id}`} className="flex items-center justify-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-center min-h-[60px]">
                  <div className="text-base font-normal text-gray-900">{category.name}</div>
                </Link>
              ))}
              <Link href="/replenishment" className="flex items-center justify-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-center min-h-[60px]">
                <div className="text-base font-medium text-blue-700">View All POs →</div>
              </Link>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Product Categories</h2>
            <button onClick={() => setShowAddCategory(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">+ Add Category</button>
          </div>
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50"><tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SL#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items Count</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr></thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categories.map((category, index) => (
                  <tr key={category.id} className={`hover:bg-gray-50 ${category.isDeleted ? 'bg-gray-100' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {category.isDeleted ? <span className="line-through text-gray-400">{category.name}</span> : <Link href={`/category/${category.id}`} className="text-blue-600 hover:text-blue-800">{category.name}</Link>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{category.isDeleted ? <span className="line-through text-gray-400">{category.description || '-'}</span> : category.description || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{category.item_count}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {category.isDeleted ? <span className="text-gray-400 text-xs">Archived {new Date(category.deletedAt!).toLocaleDateString()}</span> : (
                        <><button onClick={() => setEditingCategory(category)} className="text-blue-600 hover:text-blue-800 mr-3">Edit</button><button onClick={() => setDeletingCategory(category)} className="text-red-600 hover:text-red-800">Delete</button></>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {showAddCategory && <CategoryModal mode="add" data={{ name: '', description: '' }} onClose={() => setShowAddCategory(false)} onSubmit={handleAddCategory} />}
      {editingCategory && <CategoryModal mode="edit" data={{ name: editingCategory.name, description: editingCategory.description || '' }} onClose={() => setEditingCategory(null)} onSubmit={handleUpdateCategory} />}
      {deletingCategory && <DeleteCategoryModal category={deletingCategory} onClose={() => setDeletingCategory(null)} onConfirm={handleDeleteCategory} />}
    </div>
  )
}
