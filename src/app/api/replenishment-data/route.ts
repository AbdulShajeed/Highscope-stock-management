import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { createCache } from '@/lib/cache'

interface PurchaseOrderData {
  id: string
  poNumber: string
  poReleasedDate: string | null
  vendor: string | null
  totalValue: number
  leadTime: string | null
  status: string
  categoryId: string | null
  createdAt: string
  updatedAt: string
}

interface ReplenishmentDataResult {
  category: { id: string; name: string; description: string | null }
  stockItems: Array<{ id: string; itemCode: string; description: string; ratePerPcs: number | null }>
  poList: PurchaseOrderData[]
  summary: { totalPO: number; totalPOValue: number; totalPOReceived: number }
}

const cache = createCache<ReplenishmentDataResult>()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('id')
    if (!categoryId) return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })

    const cached = cache.get(categoryId)
    if (cached) return NextResponse.json(cached)

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

    const result: ReplenishmentDataResult = {
      category: { id: categoryRaw.id, name: categoryRaw.name, description: categoryRaw.description },
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

    cache.set(categoryId, result)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching replenishment data:', error)
    return NextResponse.json({ error: 'Failed to fetch replenishment data' }, { status: 500 })
  }
}
