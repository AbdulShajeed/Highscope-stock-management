import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const poLineItemId = searchParams.get('poLineItemId')
    if (!poLineItemId) return NextResponse.json({ error: 'PO Line Item ID is required' }, { status: 400 })

    const history = await prisma.pODeliveryHistory.findMany({
      where: { poLineItemId },
      orderBy: { deliveryDate: 'asc' }
    })

    return NextResponse.json(history)
  } catch (error) {
    console.error('Error fetching delivery history:', error)
    return NextResponse.json({ error: 'Failed to fetch delivery history' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { poLineItemId, quantity, deliveryDate } = body
    if (!poLineItemId || !deliveryDate) return NextResponse.json({ error: 'Line Item ID and delivery date are required' }, { status: 400 })

    const record = await prisma.pODeliveryHistory.create({
      data: { poLineItemId, quantity: quantity || 0, deliveryDate }
    })

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error('Error creating delivery history:', error)
    return NextResponse.json({ error: 'Failed to create delivery history' }, { status: 500 })
  }
}
