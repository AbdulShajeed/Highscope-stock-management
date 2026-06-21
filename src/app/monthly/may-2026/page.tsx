'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import MonthlyReportTable from '@/components/MonthlyReportTable'

interface ReportData { month: string; year: number; categories: any[]; totals: any }

const cache: Record<string, { data: ReportData; timestamp: number }> = {}
const CACHE_TTL = 60_000

export default function May2026Page() {
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const key = 'May-2026'

  useEffect(() => {
    const fetchData = async () => {
      if (cache[key] && Date.now() - cache[key].timestamp < CACHE_TTL) {
        setReport(cache[key].data); setLoading(false)
        fetch('/api/monthly-report?month=May&year=2026').then(r => r.json()).then(d => { cache[key] = { data: d, timestamp: Date.now() }; setReport(d) }).catch(() => {})
        return
      }
      try {
        const res = await fetch('/api/monthly-report?month=May&year=2026')
        const d = await res.json(); cache[key] = { data: d, timestamp: Date.now() }; setReport(d)
      } catch (e) { console.error(e) } finally { setLoading(false) }
    }
    fetchData()
  }, [])

  if (!loading && !report) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-xl text-gray-600">Report not found</div></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm">← Back to Dashboard</Link>
              <h1 className="mt-2 text-3xl font-bold text-gray-900">May 2026 - Monthly Stock Report</h1>
              <p className="mt-2 text-sm text-gray-600">Stock summary across all categories for May 2026</p>
            </div>
            <div className="flex space-x-2">
              <Link href="/monthly/april-2026" className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">← Previous Month (April)</Link>
              <Link href="/monthly/june-2026" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">Next Month (June) →</Link>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {report && <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white shadow rounded-lg p-4"><h3 className="text-sm font-medium text-gray-500">Total Categories</h3><p className="text-2xl font-bold text-gray-900">{report.categories.length}</p></div>
          <div className="bg-white shadow rounded-lg p-4"><h3 className="text-sm font-medium text-gray-500">Opening Value</h3><p className="text-2xl font-bold text-orange-600">AED {(report.totals.total_opening_value || 0).toLocaleString()}</p></div>
          <div className="bg-white shadow rounded-lg p-4"><h3 className="text-sm font-medium text-gray-500">Total P/O Value</h3><p className="text-2xl font-bold text-blue-600">AED {(report.totals.total_sold_value || 0).toLocaleString()}</p></div>
          <div className="bg-white shadow rounded-lg p-4"><h3 className="text-sm font-medium text-gray-500">Closing Value</h3><p className="text-2xl font-bold text-green-600">AED {(report.totals.total_closing_value || 0).toLocaleString()}</p></div></div>}
        {loading ? (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="space-y-3">
              {[1,2,3,4,5,6,7].map(i => (
                <div key={i} className="h-10 bg-gray-100 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
        ) : report && <MonthlyReportTable report={report} onUpdate={(d) => setReport(d)} />}
        <div className="mt-8 flex justify-between">
          <Link href="/monthly/april-2026" className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">← Previous Month (April)</Link>
          <Link href="/monthly/june-2026" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Next Month (June) →</Link>
        </div>
      </main>
    </div>
  )
}
