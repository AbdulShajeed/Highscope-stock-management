import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET() {
  try {
    const monthlyStocks = await prisma.monthlyStock.groupBy({
      by: ['month', 'year'],
      _sum: { closingQty: true },
      orderBy: [{ year: 'desc' }, { month: 'desc' }]
    })

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

    const reports = monthlyStocks.map(ms => ({
      month: ms.month,
      year: ms.year,
      total_closing: ms._sum.closingQty || 0,
      total_closing_value: 0,
    }))

    return NextResponse.json(reports)
  } catch (error) {
    console.error('Error fetching all monthly reports:', error)
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
  }
}
