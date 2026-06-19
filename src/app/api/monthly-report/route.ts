import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

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

    const categories = await prisma.category.findMany({ where: { isDeleted: 0 }, orderBy: { name: 'asc' } })

    const monthPattern = `-${String(monthIndex + 1).padStart(2, '0')}-%`

    const reportData = await Promise.all(categories.map(async (cat) => {
      const stockItems = await prisma.stockItem.findMany({ where: { categoryId: cat.id } })

      // Previous month's closing from MonthlyStock
      const prevMonthData = await prisma.monthlyStock.aggregate({
        where: { stockItem: { categoryId: cat.id }, month: prevMonth, year: prevYear },
        _sum: { closingQty: true }
      })

      const prevClosing = prevMonthData._sum.closingQty || 0
      const prevClosingValue = stockItems.reduce((sum, si) => {
        const prevClosingPerItem = Math.min(si.finalQty, prevClosing) // approximate
        return sum + (prevClosingPerItem * (si.ratePerPcs || 0))
      }, 0)

      // Actually get proper prev closing value
      const prevMonthlyStocks = await prisma.monthlyStock.findMany({
        where: { stockItem: { categoryId: cat.id }, month: prevMonth, year: prevYear },
        include: { stockItem: { select: { ratePerPcs: true } } }
      })
      const total_opening = prevMonthlyStocks.reduce((sum, ms) => sum + ms.closingQty, 0)
      const total_opening_value = prevMonthlyStocks.reduce((sum, ms) => sum + (ms.closingQty * (ms.stockItem.ratePerPcs || 0)), 0)

      // Sold from bookings this month
      const bookings = await prisma.booking.findMany({
        where: { categoryId: cat.id, month, year: parseInt(year), isDeleted: 0 }
      })
      const total_sold = bookings.reduce((sum, b) => sum + b.quantityBooked, 0)
      const total_sold_value = bookings.reduce((sum, b) => {
        const si = stockItems.find(s => s.id === b.stockItemId)
        return sum + (b.quantityBooked * (si?.ratePerPcs || 0))
      }, 0)

      // Delivered this month from PO delivery history
      const deliveries = await prisma.pODeliveryHistory.findMany({
        where: {
          poLineItem: { stockItem: { categoryId: cat.id } },
          deliveryDate: { contains: monthPattern }
        },
        include: { poLineItem: { include: { stockItem: { select: { ratePerPcs: true } } } } }
      })
      const total_added = deliveries.reduce((sum, d) => sum + d.quantity, 0)
      const total_added_value = deliveries.reduce((sum, d) => sum + (d.quantity * (d.poLineItem.stockItem.ratePerPcs || 0)), 0)

      // Customer PO value this month
      const customerPOs = await prisma.customerPO.findMany({
        where: { categoryId: cat.id, date: { contains: monthPattern } }
      })
      const total_po_value = customerPOs.reduce((sum, cp) => sum + (cp.totalValue || 0), 0)

      const total_closing = total_opening - total_sold + total_added
      const total_closing_value = total_opening_value - total_sold_value + total_added_value

      return {
        category_name: cat.name, total_opening, total_opening_value,
        total_sold, total_sold_value, total_po_value,
        total_added, total_added_value, total_closing, total_closing_value,
        item_count: stockItems.length,
      }
    }))

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
