import Database from 'better-sqlite3'
import path from 'path'

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')
const db = new Database(dbPath)

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Get the month and year from command line arguments
const args = process.argv.slice(2)
if (args.length < 2) {
  console.log('Usage: npx tsx scripts/add-month.ts <month> <year>')
  console.log('Example: npx tsx scripts/add-month.ts July 2026')
  process.exit(1)
}

const [month, yearStr] = args
const year = parseInt(yearStr)

if (isNaN(year)) {
  console.error('Year must be a number')
  process.exit(1)
}

// Check if month already exists
const existingMonth = db.prepare(`
  SELECT COUNT(*) as count FROM MonthlyStock WHERE month = ? AND year = ?
`).get(month, year) as any

if (existingMonth.count > 0) {
  console.log(`Monthly data for ${month} ${year} already exists`)
  process.exit(0)
}

// Get all stock items
const stockItems = db.prepare('SELECT * FROM StockItem').all() as any[]

if (stockItems.length === 0) {
  console.error('No stock items found. Please run db:init-all first.')
  process.exit(1)
}

// Get the previous month's closing quantities
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const monthIndex = months.indexOf(month)
let previousMonth = ''
let previousYear = year

if (monthIndex > 0) {
  previousMonth = months[monthIndex - 1]
} else {
  // If January, previous month is December of previous year
  previousMonth = 'December'
  previousYear = year - 1
}

console.log(`Adding monthly data for ${month} ${year}`)
console.log(`Previous month: ${previousMonth} ${previousYear}`)

// Insert monthly data for each stock item
const insertMonthlyStock = db.prepare(`
  INSERT OR REPLACE INTO MonthlyStock (
    id, stockItemId, month, year, openingQty, incomingQty, soldQty, closingQty, notes, createdAt, updatedAt
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

const now = new Date().toISOString()
let itemCount = 0

for (const item of stockItems) {
  // Get previous month's closing quantity
  const previousData = db.prepare(`
    SELECT closingQty FROM MonthlyStock
    WHERE stockItemId = ? AND month = ? AND year = ?
  `).get(item.id, previousMonth, previousYear) as any

  const openingQty = previousData?.closingQty || 0

  // Generate random incoming and sold quantities
  const incomingQty = Math.floor(Math.random() * 50) + 10
  const soldQty = Math.floor(Math.random() * 30) + 5

  // Calculate closing quantity
  const closingQty = openingQty + incomingQty - soldQty

  insertMonthlyStock.run(
    crypto.randomUUID(),
    item.id,
    month,
    year,
    openingQty,
    incomingQty,
    soldQty,
    closingQty,
    `Monthly stock for ${month} ${year}`,
    now,
    now
  )

  itemCount++
}

console.log(`Successfully added monthly data for ${itemCount} items`)
console.log(`Month: ${month} ${year}`)
console.log(`Opening quantities carried forward from ${previousMonth} ${previousYear}`)

db.close()
