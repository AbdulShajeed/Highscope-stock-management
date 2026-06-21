import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// Cache for 60 seconds on Vercel
export const revalidate = 60

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stockItemId = searchParams.get('stockItemId')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    const where: any = {}
    if (stockItemId) where.stockItemId = stockItemId
    if (month) where.month = month
    if (year) where.year = parseInt(year)

    const data = await prisma.monthlyStock.findMany({ where })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching monthly stock:', error)
    return NextResponse.json({ error: 'Failed to fetch monthly stock' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { stockItemId, month, year, openingQty, incomingQty, soldQty, closingQty, notes } = body

    if (!stockItemId || !month || !year) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const data = await prisma.monthlyStock.upsert({
      where: { stockItemId_month_year: { stockItemId, month, year: parseInt(year) } },
      update: { openingQty, incomingQty, soldQty, closingQty, notes },
      create: { stockItemId, month, year: parseInt(year), openingQty: openingQty || 0, incomingQty: incomingQty || 0, soldQty: soldQty || 0, closingQty: closingQty || 0, notes },
    })

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating monthly stock:', error)
    return NextResponse.json({ error: 'Failed to create monthly stock' }, { status: 500 })
  }
}
