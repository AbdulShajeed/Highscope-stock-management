import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// Server-side in-memory cache
const apiCache = { data: null as any, timestamp: 0 }
const CACHE_TTL = 60_000

export async function GET(request: NextRequest) {
  try {
    // Return cached data if fresh
    if (apiCache.data && Date.now() - apiCache.timestamp < CACHE_TTL) {
      return NextResponse.json(apiCache.data)
    }

    const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

    // Fetch categories and monthly reports in parallel
    const [categoriesRaw, monthlyStocks, allRecords] = await Promise.all([
      prisma.category.findMany({
        include: { _count: { select: { stockItems: true } } },
        orderBy: [{ isDeleted: 'asc' }, { name: 'asc' }],
      }),
      prisma.monthlyStock.groupBy({
        by: ['month', 'year'],
        _sum: { openingQty: true, incomingQty: true, soldQty: true, closingQty: true },
        _count: true,
      }),
      prisma.monthlyStock.findMany({
        select: {
          stockItemId: true, month: true, year: true,
          openingQty: true, incomingQty: true, soldQty: true, closingQty: true,
          stockItem: { select: { ratePerPcs: true } },
        },
      }),
    ])

    // Process categories
    const categories = categoriesRaw.map(cat => ({
      id: cat.id, name: cat.name, description: cat.description,
      isDeleted: cat.isDeleted, deletedAt: cat.deletedAt, deleteReason: cat.deleteReason,
      item_count: cat._count.stockItems,
    }))

    // Process monthly reports
    monthlyStocks.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year
      return monthOrder.indexOf(b.month) - monthOrder.indexOf(a.month)
    })

    const limitedStocks = monthlyStocks.slice(0, 6)
    const neededMonths = limitedStocks.map(ms => ({ month: ms.month, year: ms.year }))

    // Filter records for needed months only
    const filteredRecords = allRecords.filter(r =>
      neededMonths.some(m => m.month === r.month && m.year === r.year)
    )

    const valueMap: Record<string, { opening_value: number; added_value: number; sold_value: number; closing_value: number }> = {}
    filteredRecords.forEach(r => {
      const key = `${r.month}-${r.year}`
      if (!valueMap[key]) valueMap[key] = { opening_value: 0, added_value: 0, sold_value: 0, closing_value: 0 }
      const rate = r.stockItem?.ratePerPcs || 0
      valueMap[key].opening_value += r.openingQty * rate
      valueMap[key].added_value += r.incomingQty * rate
      valueMap[key].sold_value += r.soldQty * rate
      valueMap[key].closing_value += r.closingQty * rate
    })

    const monthlyReports = limitedStocks.map(ms => {
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

    const result = { categories, monthlyReports }

    // Cache the result
    apiCache.data = result
    apiCache.timestamp = Date.now()

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
