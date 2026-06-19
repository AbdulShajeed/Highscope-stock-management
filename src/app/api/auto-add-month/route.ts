import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { month, year } = body

    if (!month || !year) {
      return NextResponse.json({ error: 'Month and year are required' }, { status: 400 })
    }

    const stockItems = await prisma.stockItem.findMany()

    let created = 0
    for (const item of stockItems) {
      try {
        await prisma.monthlyStock.upsert({
          where: { stockItemId_month_year: { stockItemId: item.id, month, year } },
          update: {},
          create: { stockItemId: item.id, month, year, openingQty: 0, incomingQty: 0, soldQty: 0, closingQty: 0 },
        })
        created++
      } catch (e) {
        // Skip duplicates
      }
    }

    return NextResponse.json({ message: `Monthly stock records ensured for ${month} ${year}`, count: created })
  } catch (error) {
    console.error('Error auto-adding month:', error)
    return NextResponse.json({ error: 'Failed to auto-add month' }, { status: 500 })
  }
}
