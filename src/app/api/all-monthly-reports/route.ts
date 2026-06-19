import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export async function GET() {
  try {
    const monthlyStocks = await prisma.monthlyStock.groupBy({
      by: ['month', 'year'],
      _sum: { closingQty: true },
    })

    const reports = monthlyStocks.map(ms => ({
      month: ms.month,
      year: ms.year,
      total_closing: ms._sum.closingQty || 0,
      total_closing_value: 0,
    }))

    // Sort chronologically (newest first)
    reports.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year
      return monthOrder.indexOf(b.month) - monthOrder.indexOf(a.month)
    })

    return NextResponse.json(reports)
  } catch (error) {
    console.error('Error fetching all monthly reports:', error)
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
  }
}
