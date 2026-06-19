import Database from 'better-sqlite3'
import pg from 'pg'

async function migrate() {
  const sqlite = new Database('./prisma/dev.db')

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL!,
    ssl: { rejectUnauthorized: false }
  })

  async function insertBatch(table: string, columns: string[], rows: any[]) {
    if (rows.length === 0) return
    const placeholders = rows.map((_, i) => `(${columns.map((_, j) => `$${i * columns.length + j + 1}`).join(',')})`).join(',')
    const values = rows.flatMap(row => columns.map(col => row[col] ?? null))
    const query = `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(',')}) VALUES ${placeholders} ON CONFLICT DO NOTHING`
    await pool.query(query, values)
  }

  // Categories
  const categories = sqlite.prepare('SELECT * FROM Category').all() as any[]
  console.log('Categories:', categories.length)
  await insertBatch('Category', ['id', 'name', 'description', 'isDeleted', 'deletedAt', 'deleteReason', 'createdAt', 'updatedAt'], categories)

  // StockItems
  const items = sqlite.prepare('SELECT * FROM StockItem').all() as any[]
  console.log('StockItems:', items.length)
  await insertBatch('StockItem', ['id', 'itemCode', 'description', 'detailedDescription', 'make', 'ratePerPcs', 'location', 'incomingQty', 'soldQty', 'finalQty', 'totalValue', 'reorderLevel', 'notes', 'oldPrice', 'oldQty', 'newPrice', 'newQty', 'isSplit', 'sortOrder', 'categoryId', 'createdAt', 'updatedAt'], items)

  // Bookings
  const bookings = sqlite.prepare('SELECT * FROM Booking').all() as any[]
  console.log('Bookings:', bookings.length)
  await insertBatch('Booking', ['id', 'stockItemId', 'categoryId', 'month', 'year', 'quantityBooked', 'projectNumber', 'engineerName', 'bookingDate', 'notes', 'status', 'isDeleted', 'deletedAt', 'deletedBy', 'deleteReason', 'createdAt', 'updatedAt'], bookings)

  // PurchaseOrders
  const pos = sqlite.prepare('SELECT * FROM PurchaseOrder').all() as any[]
  console.log('PurchaseOrders:', pos.length)
  await insertBatch('PurchaseOrder', ['id', 'poNumber', 'poReleasedDate', 'vendor', 'totalValue', 'leadTime', 'status', 'deliveryDate', 'categoryId', 'createdAt', 'updatedAt'], pos)

  // POLineItems
  const lineItems = sqlite.prepare('SELECT * FROM POLineItem').all() as any[]
  console.log('POLineItems:', lineItems.length)
  await insertBatch('POLineItem', ['id', 'poId', 'stockItemId', 'quantity', 'rate', 'totalValue', 'deliveredQuantity', 'deliveredDate', 'createdAt', 'updatedAt'], lineItems)

  // PODeliveryHistory
  const history = sqlite.prepare('SELECT * FROM PODeliveryHistory').all() as any[]
  console.log('DeliveryHistory:', history.length)
  await insertBatch('PODeliveryHistory', ['id', 'poLineItemId', 'quantity', 'deliveryDate', 'createdAt'], history)

  // CustomerPOs
  const customerPOs = sqlite.prepare('SELECT * FROM CustomerPO').all() as any[]
  console.log('CustomerPOs:', customerPOs.length)
  await insertBatch('CustomerPO', ['id', 'categoryId', 'projectNo', 'date', 'totalValue', 'createdAt', 'updatedAt'], customerPOs)

  // MonthlyStock
  const monthlyStocks = sqlite.prepare('SELECT * FROM MonthlyStock').all() as any[]
  console.log('MonthlyStock:', monthlyStocks.length)
  await insertBatch('MonthlyStock', ['id', 'stockItemId', 'month', 'year', 'openingQty', 'incomingQty', 'soldQty', 'closingQty', 'notes', 'createdAt', 'updatedAt'], monthlyStocks)

  console.log('Migration complete!')
  await pool.end()
  sqlite.close()
}

migrate().catch(e => { console.error('Error:', e.message); process.exit(1) })
