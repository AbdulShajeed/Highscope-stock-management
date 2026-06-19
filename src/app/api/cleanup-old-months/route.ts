import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function POST() {
  try {
    const now = new Date()
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

    // Keep only last 6 months
    const cutoffDate = new Date()
    cutoffDate.setMonth(cutoffDate.getMonth() - 6)
    const cutoffMonth = months[cutoffDate.getMonth()]
    const cutoffYear = cutoffDate.getFullYear()

    const deleted = await prisma.monthlyStock.deleteMany({
      where: {
        OR: [
          { year: { lt: cutoffYear } },
          { year: cutoffYear, month: { lt: cutoffMonth } },
        ]
      }
    })

    return NextResponse.json({ message: `Cleaned up old monthly stock records`, deleted: deleted.count })
  } catch (error) {
    console.error('Error cleaning up old months:', error)
    return NextResponse.json({ error: 'Failed to cleanup' }, { status: 500 })
  }
}
