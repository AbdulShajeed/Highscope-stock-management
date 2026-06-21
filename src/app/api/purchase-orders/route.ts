import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { createCache } from '@/lib/cache'

interface PurchaseOrderResult {
  poList: Array<{
    id: string; poNumber: string; poReleasedDate: string | null; vendor: string | null
    totalValue: number; leadTime: string | null; status: string; categoryId: string | null
    createdAt: string; updatedAt: string
  }>
  summary: { totalPO: number; totalPOValue: number; totalPOReceived: number }
}

const cache = createCache<PurchaseOrderResult>()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const cacheKey = categoryId || 'all'

    const cached = cache.get(cacheKey)
    if (cached) return NextResponse.json(cached)

    const where = categoryId ? { categoryId } : {}

    const [poList, summary, deliveredCount] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        orderBy: [{ poReleasedDate: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.purchaseOrder.aggregate({
        where,
        _count: true,
        _sum: { totalValue: true },
      }),
      prisma.purchaseOrder.count({
        where: { ...where, status: 'Delivered' },
      }),
    ])

    const result: PurchaseOrderResult = {
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

    cache.set(cacheKey, result)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching purchase orders:', error)
    return NextResponse.json({ error: 'Failed to fetch purchase orders' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { poNumber, poReleasedDate, vendor, totalValue, leadTime, status, categoryId } = await request.json()
    if (!poNumber) return NextResponse.json({ error: 'PO Number is required' }, { status: 400 })

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber, poReleasedDate: poReleasedDate || null, vendor: vendor || null,
        totalValue: totalValue ? parseFloat(totalValue) : 0, leadTime: leadTime || null,
        status: status || 'Not Delivered', categoryId: categoryId || null,
      },
    })

    cache.clear()
    return NextResponse.json(po, { status: 201 })
  } catch (error) {
    console.error('Error creating purchase order:', error)
    return NextResponse.json({ error: 'Failed to create purchase order' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, ...updateData } = await request.json()
    if (!id) return NextResponse.json({ error: 'Purchase Order ID is required' }, { status: 400 })

    const data: Record<string, unknown> = {}
    for (const key of ['poNumber', 'poReleasedDate', 'vendor', 'leadTime', 'status', 'deliveryDate', 'categoryId']) {
      if (updateData[key] !== undefined) data[key] = updateData[key]
    }
    if (updateData.totalValue !== undefined) data.totalValue = parseFloat(updateData.totalValue)

    const po = await prisma.purchaseOrder.update({ where: { id }, data })
    cache.clear()
    return NextResponse.json(po)
  } catch (error) {
    console.error('Error updating purchase order:', error)
    return NextResponse.json({ error: 'Failed to update purchase order' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Purchase Order ID is required' }, { status: 400 })

    await prisma.purchaseOrder.delete({ where: { id } })
    cache.clear()
    return NextResponse.json({ message: 'Purchase order deleted successfully' })
  } catch (error) {
    console.error('Error deleting purchase order:', error)
    return NextResponse.json({ error: 'Failed to delete purchase order' }, { status: 500 })
  }
}
