import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { createSingletonCache } from '@/lib/cache'

interface DashboardData {
  categories: Array<{
    id: string
    name: string
    description: string | null
    isDeleted: number
    deletedAt: string | null
    deleteReason: string | null
    item_count: number
  }>
  monthlyReports: Array<{
    month: string
    year: number
    total_opening: number
    total_opening_value: number
    total_incoming: number
    total_sold: number
    total_sold_value: number
    total_closing: number
    total_closing_value: number
    item_count: number
  }>
}

const cache = createSingletonCache<DashboardData>()
const MONTH_ORDER = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export async function GET() {
  try {
    const cached = cache.get()
    if (cached) return NextResponse.json(cached)

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

    const categories = categoriesRaw.map(cat => ({
      id: cat.id, name: cat.name, description: cat.description,
      isDeleted: cat.isDeleted, deletedAt: cat.deletedAt, deleteReason: cat.deleteReason,
      item_count: cat._count.stockItems,
    }))

    monthlyStocks.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year
      return MONTH_ORDER.indexOf(b.month) - MONTH_ORDER.indexOf(a.month)
    })

    const limitedStocks = monthlyStocks.slice(0, 6)
    const neededMonths = limitedStocks.map(ms => ({ month: ms.month, year: ms.year }))

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

    const result: DashboardData = { categories, monthlyReports }
    cache.set(result)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
