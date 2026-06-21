import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// Server-side in-memory cache
const apiCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 60_000

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    if (!categoryId) return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })

    const cacheKey = `customer-pos-${categoryId}-${month || ''}-${year || ''}`
    const cached = apiCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data)
    }

    const where: any = { categoryId }
    if (month && year) {
      const monthIndex = ['January','February','March','April','May','June','July','August','September','October','November','December'].indexOf(month) + 1
      const monthStr = String(monthIndex).padStart(2, '0')
      where.date = { contains: `-${monthStr}-${year}` }
    }

    const pos = await prisma.customerPO.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
    })

    // Cache the result
    apiCache.set(cacheKey, { data: pos, timestamp: Date.now() })

    return NextResponse.json(pos)
  } catch (error) {
    console.error('Error fetching customer POs:', error)
    return NextResponse.json({ error: 'Failed to fetch customer POs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { categoryId, projectNo, date, totalValue } = body
    if (!categoryId) return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })

    const po = await prisma.customerPO.create({
      data: { categoryId, projectNo: projectNo || null, date: date || null, totalValue: parseFloat(totalValue) || 0 }
    })

    // Invalidate cache
    apiCache.clear()

    return NextResponse.json(po, { status: 201 })
  } catch (error) {
    console.error('Error creating customer PO:', error)
    return NextResponse.json({ error: 'Failed to create customer PO' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body
    if (!id) return NextResponse.json({ error: 'Customer PO ID is required' }, { status: 400 })

    const data: any = {}
    if (updateData.projectNo !== undefined) data.projectNo = updateData.projectNo
    if (updateData.date !== undefined) data.date = updateData.date
    if (updateData.totalValue !== undefined) data.totalValue = parseFloat(updateData.totalValue)

    const po = await prisma.customerPO.update({ where: { id }, data })
    // Invalidate cache
    apiCache.clear()
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
    // Invalidate cache
    apiCache.clear()
    return NextResponse.json({ message: 'Customer PO deleted successfully' })
  } catch (error) {
    console.error('Error deleting customer PO:', error)
    return NextResponse.json({ error: 'Failed to delete customer PO' }, { status: 500 })
  }
}
