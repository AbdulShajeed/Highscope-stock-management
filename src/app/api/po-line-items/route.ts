import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const poId = searchParams.get('poId')
    if (!poId) return NextResponse.json({ error: 'PO ID is required' }, { status: 400 })

    const lineItems = await prisma.pOLineItem.findMany({
      where: { poId },
      include: { stockItem: { select: { itemCode: true, description: true } } },
      orderBy: { createdAt: 'asc' }
    })

    const result = lineItems.map(li => ({
      id: li.id, poId: li.poId, stockItemId: li.stockItemId,
      quantity: li.quantity, rate: li.rate, totalValue: li.totalValue,
      deliveredQuantity: li.deliveredQuantity, deliveredDate: li.deliveredDate,
      createdAt: li.createdAt, updatedAt: li.updatedAt,
      itemCode: li.stockItem.itemCode, description: li.stockItem.description,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching PO line items:', error)
    return NextResponse.json({ error: 'Failed to fetch PO line items' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { poId, stockItemId, quantity, rate } = body
    if (!poId || !stockItemId) return NextResponse.json({ error: 'PO ID and Stock Item are required' }, { status: 400 })

    const lineItem = await prisma.pOLineItem.create({
      data: {
        poId, stockItemId, quantity: quantity || 0, rate: rate || 0,
        totalValue: (quantity || 0) * (rate || 0),
      },
      include: { stockItem: { select: { itemCode: true, description: true } } }
    })

    return NextResponse.json({
      ...lineItem, itemCode: lineItem.stockItem.itemCode, description: lineItem.stockItem.description,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating PO line item:', error)
    return NextResponse.json({ error: 'Failed to create PO line item' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body
    if (!id) return NextResponse.json({ error: 'Line Item ID is required' }, { status: 400 })

    const data: any = {}
    if (updateData.stockItemId !== undefined) data.stockItemId = updateData.stockItemId
    if (updateData.quantity !== undefined) data.quantity = parseInt(updateData.quantity)
    if (updateData.rate !== undefined) data.rate = parseFloat(updateData.rate)
    if (updateData.deliveredQuantity !== undefined) data.deliveredQuantity = parseInt(updateData.deliveredQuantity)
    if (updateData.deliveredDate !== undefined) data.deliveredDate = updateData.deliveredDate

    // Recalculate totalValue
    const current = await prisma.pOLineItem.findUnique({ where: { id } })
    const qty = data.quantity !== undefined ? data.quantity : current?.quantity || 0
    const rt = data.rate !== undefined ? data.rate : current?.rate || 0
    data.totalValue = qty * rt

    const lineItem = await prisma.pOLineItem.update({
      where: { id }, data,
      include: { stockItem: { select: { itemCode: true, description: true } } }
    })

    return NextResponse.json({
      ...lineItem, itemCode: lineItem.stockItem.itemCode, description: lineItem.stockItem.description,
    })
  } catch (error) {
    console.error('Error updating PO line item:', error)
    return NextResponse.json({ error: 'Failed to update PO line item' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Line Item ID is required' }, { status: 400 })
    await prisma.pOLineItem.delete({ where: { id } })
    return NextResponse.json({ message: 'Line item deleted successfully' })
  } catch (error) {
    console.error('Error deleting PO line item:', error)
    return NextResponse.json({ error: 'Failed to delete PO line item' }, { status: 500 })
  }
}
