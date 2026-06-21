import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// Cache for 60 seconds on Vercel
export const revalidate = 60

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    if (!month || !year) return NextResponse.json({ error: 'Month and year are required' }, { status: 400 })

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const monthIndex = months.indexOf(month)
    const prevMonth = monthIndex > 0 ? months[monthIndex - 1] : 'December'
    const prevYear = monthIndex > 0 ? parseInt(year) : parseInt(year) - 1
    const monthPattern = `-${String(monthIndex + 1).padStart(2, '0')}-%`

    // Fetch ALL data upfront in parallel (4 queries instead of 43)
    const [categories, allStockItems, allPrevMonthlyStocks, allBookings, allDeliveries, allCustomerPOs] = await Promise.all([
      prisma.category.findMany({ where: { isDeleted: 0 }, orderBy: { name: 'asc' } }),
      prisma.stockItem.findMany({ select: { id: true, categoryId: true, ratePerPcs: true } }),
      prisma.monthlyStock.findMany({
        where: { month: prevMonth, year: prevYear },
        select: { stockItemId: true, closingQty: true, stockItem: { select: { categoryId: true, ratePerPcs: true } } }
      }),
      prisma.booking.findMany({
        where: { month, year: parseInt(year), isDeleted: 0 },
        select: { stockItemId: true, quantityBooked: true, stockItem: { select: { categoryId: true, ratePerPcs: true } } }
      }),
      prisma.pODeliveryHistory.findMany({
        where: { deliveryDate: { contains: monthPattern } },
        select: { quantity: true, poLineItem: { select: { stockItemId: true, stockItem: { select: { categoryId: true, ratePerPcs: true } } } } }
      }),
      prisma.customerPO.findMany({
        where: { date: { contains: monthPattern } },
        select: { categoryId: true, totalValue: true }
      }),
    ])

    // Pre-index data by categoryId
    const stockItemsByCategory: Record<string, any[]> = {}
    allStockItems.forEach(si => {
      ;(stockItemsByCategory[si.categoryId] ||= []).push(si)
    })

    const prevMonthlyByCategory: Record<string, any[]> = {}
    allPrevMonthlyStocks.forEach(ms => {
      const catId = ms.stockItem?.categoryId
      if (catId) (prevMonthlyByCategory[catId] ||= []).push(ms)
    })

    const bookingsByCategory: Record<string, any[]> = {}
    allBookings.forEach(b => {
      const catId = b.stockItem?.categoryId
      if (catId) (bookingsByCategory[catId] ||= []).push(b)
    })

    const deliveriesByCategory: Record<string, any[]> = {}
    allDeliveries.forEach(d => {
      const catId = d.poLineItem?.stockItem?.categoryId
      if (catId) (deliveriesByCategory[catId] ||= []).push(d)
    })

    const poValueByCategory: Record<string, number> = {}
    allCustomerPOs.forEach(cp => {
      poValueByCategory[cp.categoryId] = (poValueByCategory[cp.categoryId] || 0) + (cp.totalValue || 0)
    })

    // Build report per category (no DB calls — all in-memory)
    const reportData = categories.map(cat => {
      const catStockItems = stockItemsByCategory[cat.id] || []
      const catPrevMonthly = prevMonthlyByCategory[cat.id] || []
      const catBookings = bookingsByCategory[cat.id] || []
      const catDeliveries = deliveriesByCategory[cat.id] || []

      const total_opening = catPrevMonthly.reduce((sum, ms) => sum + ms.closingQty, 0)
      const total_opening_value = catPrevMonthly.reduce((sum, ms) => sum + (ms.closingQty * (ms.stockItem?.ratePerPcs || 0)), 0)

      const total_sold = catBookings.reduce((sum, b) => sum + b.quantityBooked, 0)
      const total_sold_value = catBookings.reduce((sum, b) => sum + (b.quantityBooked * (b.stockItem?.ratePerPcs || 0)), 0)

      const total_added = catDeliveries.reduce((sum, d) => sum + d.quantity, 0)
      const total_added_value = catDeliveries.reduce((sum, d) => sum + (d.quantity * (d.poLineItem?.stockItem?.ratePerPcs || 0)), 0)

      const total_po_value = poValueByCategory[cat.id] || 0
      const total_closing = total_opening - total_sold + total_added
      const total_closing_value = total_opening_value - total_sold_value + total_added_value

      return {
        category_name: cat.name,
        total_opening, total_opening_value,
        total_sold, total_sold_value,
        total_po_value,
        total_added, total_added_value,
        total_closing, total_closing_value,
        item_count: catStockItems.length,
      }
    })

    const totals = reportData.reduce((acc, row) => ({
      total_opening: acc.total_opening + row.total_opening,
      total_opening_value: acc.total_opening_value + row.total_opening_value,
      total_sold: acc.total_sold + row.total_sold,
      total_sold_value: acc.total_sold_value + row.total_sold_value,
      total_po_value: acc.total_po_value + row.total_po_value,
      total_added: acc.total_added + row.total_added,
      total_added_value: acc.total_added_value + row.total_added_value,
      total_closing: acc.total_closing + row.total_closing,
      total_closing_value: acc.total_closing_value + row.total_closing_value,
      item_count: acc.item_count + row.item_count,
    }), { total_opening: 0, total_opening_value: 0, total_sold: 0, total_sold_value: 0, total_po_value: 0, total_added: 0, total_added_value: 0, total_closing: 0, total_closing_value: 0, item_count: 0 })

    return NextResponse.json({ month, year: parseInt(year), categories: reportData, totals })
  } catch (error) {
    console.error('Error fetching monthly report:', error)
    return NextResponse.json({ error: 'Failed to fetch monthly report' }, { status: 500 })
  }
}
