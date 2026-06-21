import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

// Keep the database connection alive
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Warmup failed:', error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
