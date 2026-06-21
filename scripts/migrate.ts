import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const OLD_URL = 'postgresql://postgres.imsthwyqutwpiwgwuwzx:IcPIVloTXeVMq3Ip@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require'
const NEW_URL = 'postgresql://postgres:Yy2cwCZbaMHYqa1V@db.ysqhirzajwyegzslcrjz.supabase.co:5432/postgres'

async function migrate() {
  const oldPrisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: OLD_URL }) })
  const newPrisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: NEW_URL }) })

  try {
    // Categories
    const cats = await oldPrisma.category.findMany()
    console.log(`Categories: ${cats.length}`)
    for (const cat of cats) {
      const { _count, ...data } = cat as any
      await newPrisma.category.upsert({ where: { id: cat.id }, create: data, update: data })
    }

    // Stock Items
    const items = await oldPrisma.stockItem.findMany()
    console.log(`Stock Items: ${items.length}`)
    for (const item of items) {
      const { category, stockMovements, monthlyStocks, bookings, poLineItems, ...data } = item as any
      await newPrisma.stockItem.upsert({ where: { id: item.id }, create: { ...data, categoryId: item.categoryId }, update: data })
    }

    // Bookings
    const bookings = await oldPrisma.booking.findMany()
    console.log(`Bookings: ${bookings.length}`)
    for (const b of bookings) {
      const { stockItem, category, ...data } = b as any
      await newPrisma.booking.upsert({ where: { id: b.id }, create: { ...data, stockItemId: b.stockItemId, categoryId: b.categoryId }, update: data })
    }

    // Purchase Orders
    const pos = await oldPrisma.purchaseOrder.findMany()
    console.log(`Purchase Orders: ${pos.length}`)
    for (const po of pos) {
      const { lineItems, ...data } = po as any
      await newPrisma.purchaseOrder.upsert({ where: { id: po.id }, create: data, update: data })
    }

    // PO Line Items
    const lis = await oldPrisma.pOLineItem.findMany()
    console.log(`PO Line Items: ${lis.length}`)
    for (const li of lis) {
      const { purchaseOrder, stockItem, deliveryHistory, ...data } = li as any
      await newPrisma.pOLineItem.upsert({ where: { id: li.id }, create: { ...data, poId: li.poId, stockItemId: li.stockItemId }, update: data })
    }

    // Delivery History
    const dhs = await oldPrisma.pODeliveryHistory.findMany()
    console.log(`Delivery History: ${dhs.length}`)
    for (const dh of dhs) {
      const { poLineItem, ...data } = dh as any
      await newPrisma.pODeliveryHistory.upsert({ where: { id: dh.id }, create: { ...data, poLineItemId: dh.poLineItemId }, update: data })
    }

    // Customer POs
    const cpods = await oldPrisma.customerPO.findMany()
    console.log(`Customer POs: ${cpods.length}`)
    for (const cpo of cpods) {
      const { category, ...data } = cpo as any
      await newPrisma.customerPO.upsert({ where: { id: cpo.id }, create: { ...data, categoryId: cpo.categoryId }, update: data })
    }

    // Monthly Stocks
    const ms = await oldPrisma.monthlyStock.findMany()
    console.log(`Monthly Stocks: ${ms.length}`)
    for (const m of ms) {
      const { stockItem, ...data } = m as any
      await newPrisma.monthlyStock.upsert({
        where: { stockItemId_month_year: { stockItemId: m.stockItemId, month: m.month, year: m.year } },
        create: { ...data, stockItemId: m.stockItemId },
        update: data
      })
    }

    // Stock Movements
    const sms = await oldPrisma.stockMovement.findMany()
    console.log(`Stock Movements: ${sms.length}`)
    for (const sm of sms) {
      const { stockItem, ...data } = sm as any
      await newPrisma.stockMovement.upsert({ where: { id: sm.id }, create: { ...data, stockItemId: sm.stockItemId }, update: data })
    }

    console.log('\n✅ Migration complete!')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await oldPrisma.$disconnect()
    await newPrisma.$disconnect()
  }
}

migrate()
