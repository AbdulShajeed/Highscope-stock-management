import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// Cache for 60 seconds on Vercel
export const revalidate = 60

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stockItemId = searchParams.get('stockItemId')

    const where: any = {}
    if (stockItemId) where.stockItemId = stockItemId

    const movements = await prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(movements)
  } catch (error) {
    console.error('Error fetching stock movements:', error)
    return NextResponse.json({ error: 'Failed to fetch stock movements' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { stockItemId, movementType, quantity, projectCode, customerName, employee, poNumber, sellingPrice, totalAmount, notes } = body

    if (!stockItemId || !movementType || !quantity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const movement = await prisma.stockMovement.create({
      data: {
        stockItemId, movementType, quantity: parseInt(quantity),
        projectCode: projectCode || null, customerName: customerName || null,
        employee: employee || null, poNumber: poNumber || null,
        sellingPrice: sellingPrice ? parseFloat(sellingPrice) : null,
        totalAmount: totalAmount ? parseFloat(totalAmount) : null,
        notes: notes || null,
      }
    })

    return NextResponse.json(movement, { status: 201 })
  } catch (error) {
    console.error('Error creating stock movement:', error)
    return NextResponse.json({ error: 'Failed to create stock movement' }, { status: 500 })
  }
}
