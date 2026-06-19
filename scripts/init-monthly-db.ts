import Database from 'better-sqlite3'
import path from 'path'

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')
const db = new Database(dbPath)

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Create MonthlyStock table
db.exec(`
  CREATE TABLE IF NOT EXISTS MonthlyStock (
    id TEXT PRIMARY KEY,
    stockItemId TEXT NOT NULL,
    month TEXT NOT NULL,
    year INTEGER NOT NULL,
    openingQty INTEGER NOT NULL DEFAULT 0,
    incomingQty INTEGER NOT NULL DEFAULT 0,
    soldQty INTEGER NOT NULL DEFAULT 0,
    closingQty INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (stockItemId) REFERENCES StockItem(id),
    UNIQUE(stockItemId, month, year)
  );
`)

// Seed monthly data for Junction Box items
const now = new Date().toISOString()

// Get Junction Box items
const junctionBoxItems = db.prepare(`
  SELECT si.* FROM StockItem si
  JOIN Category c ON si.categoryId = c.id
  WHERE c.name = 'Junction Box'
`).all() as any[]

// Create monthly data for April, May, June 2026
const months = [
  { month: 'April', year: 2026 },
  { month: 'May', year: 2026 },
  { month: 'June', year: 2026 },
]

const insertMonthlyStock = db.prepare(`
  INSERT OR REPLACE INTO MonthlyStock (
    id, stockItemId, month, year, openingQty, incomingQty, soldQty, closingQty, notes, createdAt, updatedAt
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

for (const item of junctionBoxItems) {
  // April 2026 - Starting month
  const aprilOpening = 0
  const aprilIncoming = Math.floor(Math.random() * 50) + 10 // Random 10-60
  const aprilSold = Math.floor(Math.random() * 30) + 5 // Random 5-35
  const aprilClosing = aprilOpening + aprilIncoming - aprilSold

  insertMonthlyStock.run(
    crypto.randomUUID(),
    item.id,
    'April',
    2026,
    aprilOpening,
    aprilIncoming,
    aprilSold,
    aprilClosing,
    'Initial stock for April',
    now,
    now
  )

  // May 2026 - Opening is April's closing
  const mayOpening = aprilClosing
  const mayIncoming = Math.floor(Math.random() * 40) + 15 // Random 15-55
  const maySold = Math.floor(Math.random() * 25) + 10 // Random 10-35
  const mayClosing = mayOpening + mayIncoming - maySold

  insertMonthlyStock.run(
    crypto.randomUUID(),
    item.id,
    'May',
    2026,
    mayOpening,
    mayIncoming,
    maySold,
    mayClosing,
    'Carried forward from April',
    now,
    now
  )

  // June 2026 - Opening is May's closing
  const juneOpening = mayClosing
  const juneIncoming = Math.floor(Math.random() * 35) + 20 // Random 20-55
  const juneSold = Math.floor(Math.random() * 20) + 8 // Random 8-28
  const juneClosing = juneOpening + juneIncoming - juneSold

  insertMonthlyStock.run(
    crypto.randomUUID(),
    item.id,
    'June',
    2026,
    juneOpening,
    juneIncoming,
    juneSold,
    juneClosing,
    'Carried forward from May',
    now,
    now
  )
}

console.log('Monthly stock data created successfully!')
console.log('Created monthly data for April, May, June 2026')

db.close()
