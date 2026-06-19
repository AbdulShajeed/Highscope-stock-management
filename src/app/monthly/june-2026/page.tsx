'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import MonthlyReportTable from '@/components/MonthlyReportTable'

interface CategoryReport {
  category_name: string
  total_opening: number
  total_opening_value: number
  total_incoming: number
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
    total_incoming: number
    total_sold: number
    total_sold_value: number
    total_added: number
    total_added_value: number
    total_closing: number
    total_closing_value: number
    item_count: number
  }
}

export default function June2026Page() {
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/monthly-report?month=June&year=2026')
        const data = await response.json()
        setReport(data)
      } catch (error) {
        console.error('Error fetching monthly report:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleUpdate = (updatedReport: ReportData) => {
    setReport(updatedReport)
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
              <h1 className="mt-2 text-3xl font-bold text-gray-900">June 2026 - Monthly Stock Report</h1>
              <p className="mt-2 text-sm text-gray-600">
                Stock summary across all categories for June 2026
              </p>
            </div>
            <div className="flex space-x-2">
              <Link
                href="/monthly/may-2026"
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                ← Previous Month (May)
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Summary Stats */}
        {report && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white shadow rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500">Total Categories</h3>
              <p className="text-2xl font-bold text-gray-900">{report.categories.length}</p>
            </div>
            <div className="bg-white shadow rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500">Opening Value</h3>
              <p className="text-2xl font-bold text-orange-600">
                AED {(report.totals.total_opening_value || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-white shadow rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500">Total P/O Value</h3>
              <p className="text-2xl font-bold text-blue-600">
                AED {(report.totals.total_sold_value || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-white shadow rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500">Closing Value</h3>
              <p className="text-2xl font-bold text-green-600">
                AED {(report.totals.total_closing_value || 0).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Monthly Report Table */}
        {report && <MonthlyReportTable report={report} onUpdate={handleUpdate} />}

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          <Link
            href="/monthly/may-2026"
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            ← Previous Month (May)
          </Link>
          <div className="text-gray-500 text-sm">
            Current Month - June 2026
          </div>
        </div>
      </main>
    </div>
  )
}
