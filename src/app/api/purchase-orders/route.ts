import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')

    const where: any = {}
    if (categoryId) where.categoryId = categoryId

    const poList = await prisma.purchaseOrder.findMany({
      where,
      orderBy: [{ poReleasedDate: 'desc' }, { createdAt: 'desc' }]
    })

    const summary = await prisma.purchaseOrder.aggregate({
      where,
      _count: true,
      _sum: { totalValue: true },
    })

    const deliveredCount = await prisma.purchaseOrder.count({
      where: { ...where, status: 'Delivered' }
    })

    return NextResponse.json({
      poList,
      summary: {
        totalPO: summary._count,
        totalPOValue: summary._sum.totalValue || 0,
        totalPOReceived: deliveredCount,
      }
    })
  } catch (error) {
    console.error('Error fetching purchase orders:', error)
    return NextResponse.json({ error: 'Failed to fetch purchase orders' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { poNumber, poReleasedDate, vendor, totalValue, leadTime, status, categoryId } = body

    if (!poNumber) return NextResponse.json({ error: 'PO Number is required' }, { status: 400 })

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber, poReleasedDate: poReleasedDate || null, vendor: vendor || null,
        totalValue: totalValue ? parseFloat(totalValue) : 0, leadTime: leadTime || null,
        status: status || 'Not Delivered', categoryId: categoryId || null,
      }
    })

    return NextResponse.json(po, { status: 201 })
  } catch (error) {
    console.error('Error creating purchase order:', error)
    return NextResponse.json({ error: 'Failed to create purchase order' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body
    if (!id) return NextResponse.json({ error: 'Purchase Order ID is required' }, { status: 400 })

    const data: any = {}
    for (const key of ['poNumber', 'poReleasedDate', 'vendor', 'leadTime', 'status', 'deliveryDate', 'categoryId']) {
      if (updateData[key] !== undefined) data[key] = updateData[key]
    }
    if (updateData.totalValue !== undefined) data.totalValue = parseFloat(updateData.totalValue)

    const po = await prisma.purchaseOrder.update({ where: { id }, data })
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
    return NextResponse.json({ message: 'Purchase order deleted successfully' })
  } catch (error) {
    console.error('Error deleting purchase order:', error)
    return NextResponse.json({ error: 'Failed to delete purchase order' }, { status: 500 })
  }
}
