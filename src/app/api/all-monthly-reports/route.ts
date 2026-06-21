import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// Server-side in-memory cache
const apiCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 60_000

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    const cacheKey = `all-monthly-reports-${limit || 'all'}`

    // Return cached data if fresh
    const cached = apiCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data)
    }

    const monthlyStocks = await prisma.monthlyStock.groupBy({
      by: ['month', 'year'],
      _sum: { openingQty: true, incomingQty: true, soldQty: true, closingQty: true },
      _count: true,
    })

    monthlyStocks.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year
      return monthOrder.indexOf(b.month) - monthOrder.indexOf(a.month)
    })

    const limitedStocks = limit ? monthlyStocks.slice(0, limit) : monthlyStocks
    const neededMonths = limitedStocks.map(ms => ({ month: ms.month, year: ms.year }))

    const allRecords = await prisma.monthlyStock.findMany({
      where: { OR: neededMonths.map(m => ({ month: m.month, year: m.year })) },
      select: {
        stockItemId: true, month: true, year: true,
        openingQty: true, incomingQty: true, soldQty: true, closingQty: true,
        stockItem: { select: { ratePerPcs: true } },
      },
    })

    const valueMap: Record<string, { opening_value: number; added_value: number; sold_value: number; closing_value: number }> = {}
    allRecords.forEach(r => {
      const key = `${r.month}-${r.year}`
      if (!valueMap[key]) valueMap[key] = { opening_value: 0, added_value: 0, sold_value: 0, closing_value: 0 }
      const rate = r.stockItem?.ratePerPcs || 0
      valueMap[key].opening_value += r.openingQty * rate
      valueMap[key].added_value += r.incomingQty * rate
      valueMap[key].sold_value += r.soldQty * rate
      valueMap[key].closing_value += r.closingQty * rate
    })

    const reports = limitedStocks.map(ms => {
      const key = `${ms.month}-${ms.year}`
      const vals = valueMap[key] || { opening_value: 0, added_value: 0, sold_value: 0, closing_value: 0 }
      return {
        month: ms.month, year: ms.year,
        total_opening: ms._sum.openingQty || 0, total_opening_value: vals.opening_value,
        total_incoming: ms._sum.incomingQty || 0,
        total_sold: ms._sum.soldQty || 0, total_sold_value: vals.sold_value,
        total_closing: ms._sum.closingQty || 0, total_closing_value: vals.closing_value,
        item_count: ms._count,
      }
    })

    // Cache the result
    apiCache.set(cacheKey, { data: reports, timestamp: Date.now() })

    return NextResponse.json(reports)
  } catch (error) {
    console.error('Error fetching all monthly reports:', error)
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
  }
}
