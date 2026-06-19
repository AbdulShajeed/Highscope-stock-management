import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const search = searchParams.get('search')

    const where: any = {}
    if (categoryId) where.categoryId = categoryId
    if (search) {
      where.OR = [
        { itemCode: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { make: { contains: search, mode: 'insensitive' } },
      ]
    }

    const stockItems = await prisma.stockItem.findMany({
      where,
      include: {
        category: { select: { name: true } },
        poLineItems: {
          include: {
            purchaseOrder: { select: { status: true } },
          }
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    // Calculate incoming and delivered quantities from POs
    const result = stockItems.map(item => {
      const incomingQty = item.poLineItems
        .filter(li => li.purchaseOrder.status !== 'Delivered' && (li.quantity - li.deliveredQuantity) > 0)
        .reduce((sum, li) => sum + (li.quantity - li.deliveredQuantity), 0)

      const deliveredQty = item.poLineItems
        .filter(li => li.deliveredQuantity > 0)
        .reduce((sum, li) => sum + li.deliveredQuantity, 0)

      return {
        ...item,
        category_name: item.category.name,
        incomingQty,
        finalQty: item.finalQty + deliveredQty,
        poLineItems: undefined,
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching stock items:', error)
    return NextResponse.json({ error: 'Failed to fetch stock items' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      itemCode, description, detailedDescription, make, ratePerPcs,
      location, incomingQty, soldQty, finalQty, totalValue, reorderLevel,
      notes, categoryId,
    } = body

    if (!itemCode || !description || !categoryId) {
      return NextResponse.json({ error: 'Item code, description, and category are required' }, { status: 400 })
    }

    const existing = await prisma.stockItem.findUnique({ where: { itemCode } })
    if (existing) {
      return NextResponse.json({ error: 'Item code already exists' }, { status: 400 })
    }

    const stockItem = await prisma.stockItem.create({
      data: {
        itemCode,
        description,
        detailedDescription: detailedDescription || null,
        make: make || null,
        ratePerPcs: ratePerPcs ? parseFloat(ratePerPcs) : null,
        location: location || null,
        incomingQty: incomingQty ? parseInt(incomingQty) : 0,
        soldQty: soldQty ? parseInt(soldQty) : 0,
        finalQty: finalQty ? parseInt(finalQty) : 0,
        totalValue: totalValue ? parseFloat(totalValue) : null,
        reorderLevel: reorderLevel ? parseInt(reorderLevel) : null,
        notes: notes || null,
        categoryId,
      },
      include: { category: { select: { name: true } } }
    })

    return NextResponse.json({ ...stockItem, category_name: stockItem.category.name }, { status: 201 })
  } catch (error) {
    console.error('Error creating stock item:', error)
    return NextResponse.json({ error: 'Failed to create stock item' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) return NextResponse.json({ error: 'Stock item ID is required' }, { status: 400 })

    const data: any = {}
    if (updateData.itemCode !== undefined) data.itemCode = updateData.itemCode
    if (updateData.description !== undefined) data.description = updateData.description
    if (updateData.detailedDescription !== undefined) data.detailedDescription = updateData.detailedDescription
    if (updateData.make !== undefined) data.make = updateData.make
    if (updateData.ratePerPcs !== undefined) data.ratePerPcs = updateData.ratePerPcs ? parseFloat(updateData.ratePerPcs) : null
    if (updateData.location !== undefined) data.location = updateData.location
    if (updateData.incomingQty !== undefined) data.incomingQty = parseInt(updateData.incomingQty)
    if (updateData.soldQty !== undefined) data.soldQty = parseInt(updateData.soldQty)
    if (updateData.finalQty !== undefined) data.finalQty = parseInt(updateData.finalQty)
    if (updateData.totalValue !== undefined) data.totalValue = updateData.totalValue ? parseFloat(updateData.totalValue) : null
    if (updateData.reorderLevel !== undefined) data.reorderLevel = updateData.reorderLevel ? parseInt(updateData.reorderLevel) : null
    if (updateData.notes !== undefined) data.notes = updateData.notes
    if (updateData.isSplit !== undefined) data.isSplit = updateData.isSplit
    if (updateData.oldPrice !== undefined) data.oldPrice = updateData.oldPrice ? parseFloat(updateData.oldPrice) : null
    if (updateData.oldQty !== undefined) data.oldQty = parseInt(updateData.oldQty)
    if (updateData.newPrice !== undefined) data.newPrice = updateData.newPrice ? parseFloat(updateData.newPrice) : null
    if (updateData.newQty !== undefined) data.newQty = parseInt(updateData.newQty)

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const stockItem = await prisma.stockItem.update({
      where: { id },
      data,
      include: { category: { select: { name: true } } }
    })

    return NextResponse.json({ ...stockItem, category_name: stockItem.category.name })
  } catch (error) {
    console.error('Error updating stock item:', error)
    return NextResponse.json({ error: 'Failed to update stock item' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'Stock item ID is required' }, { status: 400 })

    await prisma.stockItem.delete({ where: { id } })

    return NextResponse.json({ message: 'Stock item deleted successfully' })
  } catch (error) {
    console.error('Error deleting stock item:', error)
    return NextResponse.json({ error: 'Failed to delete stock item' }, { status: 500 })
  }
}
