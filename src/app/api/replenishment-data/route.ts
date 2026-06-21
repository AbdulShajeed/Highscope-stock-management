import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// Server-side in-memory cache
const apiCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 60_000

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('id')
    if (!categoryId) return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })

    const cacheKey = `replenishment-data-${categoryId}`
    const cached = apiCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data)
    }

    // Fetch category + stock items + POs in parallel
    const [categoryRaw, stockItemsRaw, poList, summary, deliveredCount] = await Promise.all([
      prisma.category.findUnique({ where: { id: categoryId } }),
      prisma.stockItem.findMany({
        where: { categoryId },
        select: { id: true, itemCode: true, description: true, ratePerPcs: true },
      }),
      prisma.purchaseOrder.findMany({
        where: { categoryId },
        orderBy: [{ poReleasedDate: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.purchaseOrder.aggregate({
        where: { categoryId },
        _count: true,
        _sum: { totalValue: true },
      }),
      prisma.purchaseOrder.count({
        where: { categoryId, status: 'Delivered' },
      }),
    ])

    if (!categoryRaw) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const category = {
      id: categoryRaw.id, name: categoryRaw.name, description: categoryRaw.description,
    }

    const result = {
      category,
      stockItems: stockItemsRaw,
      poList: poList.map(po => ({
        id: po.id, poNumber: po.poNumber, poReleasedDate: po.poReleasedDate,
        vendor: po.vendor, totalValue: po.totalValue, leadTime: po.leadTime,
        status: po.status, categoryId: po.categoryId,
        createdAt: po.createdAt.toISOString(), updatedAt: po.updatedAt.toISOString(),
      })),
      summary: {
        totalPO: summary._count,
        totalPOValue: summary._sum.totalValue || 0,
        totalPOReceived: deliveredCount,
      },
    }

    // Cache the result
    apiCache.set(cacheKey, { data: result, timestamp: Date.now() })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching replenishment data:', error)
    return NextResponse.json({ error: 'Failed to fetch replenishment data' }, { status: 500 })
  }
}
