import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    const where: any = { isDeleted: 0 }
    if (categoryId) where.categoryId = categoryId
    if (month) where.month = month
    if (year) where.year = parseInt(year)

    const bookings = await prisma.booking.findMany({
      where,
      include: { stockItem: { select: { itemCode: true, description: true, make: true } } },
      orderBy: { createdAt: 'desc' }
    })

    const result = bookings.map(b => ({
      id: b.id, stockItemId: b.stockItemId, categoryId: b.categoryId,
      month: b.month, year: b.year, quantityBooked: b.quantityBooked,
      projectNumber: b.projectNumber, engineerName: b.engineerName,
      bookingDate: b.bookingDate, notes: b.notes, status: b.status,
      isDeleted: b.isDeleted, createdAt: b.createdAt, updatedAt: b.updatedAt,
      itemCode: b.stockItem.itemCode, item_description: b.stockItem.description, make: b.stockItem.make,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { stockItemId, categoryId, month, year, quantityBooked, projectNumber, engineerName, bookingDate, notes, status } = body

    if (!stockItemId || !categoryId || !month || !year || quantityBooked === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const booking = await prisma.booking.create({
      data: {
        stockItemId, categoryId, month, year: parseInt(year),
        quantityBooked: parseInt(quantityBooked),
        projectNumber: projectNumber || null, engineerName: engineerName || null,
        bookingDate: bookingDate || null, notes: notes || null, status: status || 'In Store',
      },
      include: { stockItem: { select: { itemCode: true, description: true, make: true } } }
    })

    return NextResponse.json({
      ...booking, itemCode: booking.stockItem.itemCode,
      item_description: booking.stockItem.description, make: booking.stockItem.make,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating booking:', error)
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body
    if (!id) return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })

    const data: any = {}
    for (const key of ['quantityBooked', 'projectNumber', 'engineerName', 'bookingDate', 'notes', 'status', 'isDeleted', 'deletedAt', 'deletedBy', 'deleteReason']) {
      if (updateData[key] !== undefined) data[key] = key === 'quantityBooked' ? parseInt(updateData[key]) : updateData[key]
    }

    const booking = await prisma.booking.update({
      where: { id }, data,
      include: { stockItem: { select: { itemCode: true, description: true, make: true } } }
    })

    return NextResponse.json({
      ...booking, itemCode: booking.stockItem.itemCode,
      item_description: booking.stockItem.description, make: booking.stockItem.make,
    })
  } catch (error) {
    console.error('Error updating booking:', error)
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })
    await prisma.booking.delete({ where: { id } })
    return NextResponse.json({ message: 'Booking deleted successfully' })
  } catch (error) {
    console.error('Error deleting booking:', error)
    return NextResponse.json({ error: 'Failed to delete booking' }, { status: 500 })
  }
}
