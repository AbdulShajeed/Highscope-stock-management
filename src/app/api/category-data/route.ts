import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { createCache } from '@/lib/cache'

interface StockItemData {
  id: string
  itemCode: string
  description: string
  detailedDescription: string | null
  make: string | null
  ratePerPcs: number | null
  location: string | null
  incomingQty: number
  soldQty: number
  finalQty: number
  totalValue: number | null
  reorderLevel: number | null
  notes: string | null
  createdAt: string
  isSplit: number
  oldPrice: number | null
  oldQty: number | null
  newPrice: number | null
  newQty: number | null
}

interface CategoryDataResult {
  category: { id: string; name: string; description: string | null }
  stockItems: StockItemData[]
}

const cache = createCache<CategoryDataResult>()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('id')
    if (!categoryId) return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })

    const cached = cache.get(categoryId)
    if (cached) return NextResponse.json(cached)

    const [categoryRaw, stockItemsRaw, poData] = await Promise.all([
      prisma.category.findUnique({ where: { id: categoryId } }),
      prisma.stockItem.findMany({
        where: { categoryId },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.pOLineItem.findMany({
        where: {
          stockItem: { categoryId },
          purchaseOrder: { status: { not: 'Delivered' } },
        },
        select: { stockItemId: true, quantity: true, deliveredQuantity: true },
      }),
    ])

    if (!categoryRaw) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const stockItems: StockItemData[] = stockItemsRaw.map(item => {
      const itemPOData = poData.filter(d => d.stockItemId === item.id)
      const incomingQty = itemPOData
        .filter(d => d.quantity - d.deliveredQuantity > 0)
        .reduce((sum, d) => sum + (d.quantity - d.deliveredQuantity), 0)
      const deliveredQty = itemPOData
        .filter(d => d.deliveredQuantity > 0)
        .reduce((sum, d) => sum + d.deliveredQuantity, 0)

      return {
        id: item.id, itemCode: item.itemCode, description: item.description,
        detailedDescription: item.detailedDescription, make: item.make,
        ratePerPcs: item.ratePerPcs, location: item.location,
        incomingQty, soldQty: item.soldQty, finalQty: item.finalQty + deliveredQty,
        totalValue: item.totalValue, reorderLevel: item.reorderLevel,
        notes: item.notes, createdAt: item.createdAt.toISOString(),
        isSplit: item.isSplit, oldPrice: item.oldPrice, oldQty: item.oldQty,
        newPrice: item.newPrice, newQty: item.newQty,
      }
    })

    const result: CategoryDataResult = {
      category: { id: categoryRaw.id, name: categoryRaw.name, description: categoryRaw.description },
      stockItems,
    }

    cache.set(categoryId, result)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching category data:', error)
    return NextResponse.json({ error: 'Failed to fetch category data' }, { status: 500 })
  }
}
