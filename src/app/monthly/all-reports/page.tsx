'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface MonthlyReport {
  month: string; year: number; total_opening: number; total_opening_value: number
  total_incoming: number; total_sold: number; total_sold_value: number
  total_closing: number; total_closing_value: number; item_count: number
}

const cache = { data: null as MonthlyReport[] | null, timestamp: 0 }
const CACHE_TTL = 60_000

export default function AllReportsPage() {
  const [reports, setReports] = useState<MonthlyReport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (cache.data && Date.now() - cache.timestamp < CACHE_TTL) {
      setReports(cache.data); setLoading(false)
      fetch('/api/all-monthly-reports').then(r => r.json()).then(d => { cache.data = d; cache.timestamp = Date.now(); setReports(d) }).catch(() => {})
      return
    }
    fetch('/api/all-monthly-reports').then(r => r.json()).then(d => {
      cache.data = d; cache.timestamp = Date.now(); setReports(d)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm">← Back to Dashboard</Link>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">All Monthly Reports</h1>
          <p className="mt-2 text-sm text-gray-600">Complete list of all monthly stock reports — {reports.length} reports</p>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50"><tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SL#</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opening</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Incoming</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sold</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Closing</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr></thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.map((report, index) => (
                <tr key={`${report.month}-${report.year}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{report.month}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.year}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.item_count}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.total_opening.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.total_incoming.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.total_sold.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium"><span className={report.total_closing < 0 ? 'text-red-600' : 'text-green-600'}>{report.total_closing.toLocaleString()}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><Link href={`/monthly/${report.month.toLowerCase()}-${report.year}`} className="text-blue-600 hover:text-blue-800">View Report</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-8"><Link href="/" className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">← Back to Dashboard</Link></div>
      </main>
    </div>
  )
}
