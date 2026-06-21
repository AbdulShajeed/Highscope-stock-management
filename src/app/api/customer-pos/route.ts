import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { createCache } from '@/lib/cache'

const cache = createCache<any[]>()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    if (!categoryId) return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })

    const cacheKey = `${categoryId}-${month || ''}-${year || ''}`
    const cached = cache.get(cacheKey)
    if (cached) return NextResponse.json(cached)

    const where: Record<string, unknown> = { categoryId }
    if (month && year) {
      const monthIndex = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].indexOf(month) + 1
      const monthStr = String(monthIndex).padStart(2, '0')
      where.date = { contains: `-${monthStr}-${year}` }
    }

    const pos = await prisma.customerPO.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    })

    cache.set(cacheKey, pos)
    return NextResponse.json(pos)
  } catch (error) {
    console.error('Error fetching customer POs:', error)
    return NextResponse.json({ error: 'Failed to fetch customer POs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { categoryId, projectNo, date, totalValue } = await request.json()
    if (!categoryId) return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })

    const po = await prisma.customerPO.create({
      data: { categoryId, projectNo: projectNo || null, date: date || null, totalValue: parseFloat(totalValue) || 0 },
    })

    cache.clear()
    return NextResponse.json(po, { status: 201 })
  } catch (error) {
    console.error('Error creating customer PO:', error)
    return NextResponse.json({ error: 'Failed to create customer PO' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, ...updateData } = await request.json()
    if (!id) return NextResponse.json({ error: 'Customer PO ID is required' }, { status: 400 })

    const data: Record<string, unknown> = {}
    if (updateData.projectNo !== undefined) data.projectNo = updateData.projectNo
    if (updateData.date !== undefined) data.date = updateData.date
    if (updateData.totalValue !== undefined) data.totalValue = parseFloat(updateData.totalValue)

    const po = await prisma.customerPO.update({ where: { id }, data })
    cache.clear()
    return NextResponse.json(po)
  } catch (error) {
    console.error('Error updating customer PO:', error)
    return NextResponse.json({ error: 'Failed to update customer PO' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Customer PO ID is required' }, { status: 400 })

    await prisma.customerPO.delete({ where: { id } })
    cache.clear()
    return NextResponse.json({ message: 'Customer PO deleted successfully' })
  } catch (error) {
    console.error('Error deleting customer PO:', error)
    return NextResponse.json({ error: 'Failed to delete customer PO' }, { status: 500 })
  }
}
