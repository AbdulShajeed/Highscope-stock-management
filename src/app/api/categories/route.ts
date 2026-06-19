import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { stockItems: true }
        }
      },
      orderBy: [
        { isDeleted: 'asc' },
        { name: 'asc' }
      ]
    })

    const result = categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      isDeleted: cat.isDeleted,
      deletedAt: cat.deletedAt,
      deleteReason: cat.deleteReason,
      item_count: cat._count.stockItems,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      )
    }

    const existing = await prisma.category.findUnique({ where: { name } })
    if (existing) {
      return NextResponse.json(
        { error: 'Category name already exists' },
        { status: 400 }
      )
    }

    const category = await prisma.category.create({
      data: { name, description: description || null }
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, description } = body

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    }
    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    const existing = await prisma.category.findFirst({ where: { name, id: { not: id } } })
    if (existing) {
      return NextResponse.json({ error: 'Category name already exists' }, { status: 400 })
    }

    const category = await prisma.category.update({
      where: { id },
      data: { name, description: description || null }
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, deletedBy, reason } = body

    if (!id) return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    if (!deletedBy) return NextResponse.json({ error: 'Name is required for deletion' }, { status: 400 })
    if (!reason) return NextResponse.json({ error: 'Reason is required for deletion' }, { status: 400 })

    const category = await prisma.category.update({
      where: { id },
      data: {
        isDeleted: 1,
        deletedAt: new Date().toISOString(),
        deleteReason: `${reason} (by: ${deletedBy})`,
      }
    })

    return NextResponse.json({ message: 'Category archived successfully' })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}
