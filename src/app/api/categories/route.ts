import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { createSingletonCache } from '@/lib/cache'

interface CategoryData {
  id: string
  name: string
  description: string | null
  isDeleted: number
  deletedAt: string | null
  deleteReason: string | null
  item_count: number
  createdAt: Date
  updatedAt: Date
}

const cache = createSingletonCache<CategoryData[]>()

export async function GET() {
  try {
    const cached = cache.get()
    if (cached) return NextResponse.json(cached)

    const categories = await prisma.category.findMany({
      include: { _count: { select: { stockItems: true } } },
      orderBy: [{ isDeleted: 'asc' }, { name: 'asc' }],
    })

    const result: CategoryData[] = categories.map(cat => ({
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

    cache.set(result)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, description } = await request.json()
    if (!name) return NextResponse.json({ error: 'Category name is required' }, { status: 400 })

    const existing = await prisma.category.findUnique({ where: { name } })
    if (existing) return NextResponse.json({ error: 'Category name already exists' }, { status: 400 })

    const category = await prisma.category.create({
      data: { name, description: description || null },
    })

    cache.clear()
    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, name, description } = await request.json()
    if (!id) return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    if (!name) return NextResponse.json({ error: 'Category name is required' }, { status: 400 })

    const existing = await prisma.category.findFirst({ where: { name, id: { not: id } } })
    if (existing) return NextResponse.json({ error: 'Category name already exists' }, { status: 400 })

    const category = await prisma.category.update({
      where: { id },
      data: { name, description: description || null },
    })

    cache.clear()
    return NextResponse.json(category)
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id, deletedBy, reason } = await request.json()
    if (!id) return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    if (!deletedBy) return NextResponse.json({ error: 'Name is required for deletion' }, { status: 400 })
    if (!reason) return NextResponse.json({ error: 'Reason is required for deletion' }, { status: 400 })

    await prisma.category.update({
      where: { id },
      data: {
        isDeleted: 1,
        deletedAt: new Date().toISOString(),
        deleteReason: `${reason} (by: ${deletedBy})`,
      },
    })

    cache.clear()
    return NextResponse.json({ message: 'Category archived successfully' })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}
