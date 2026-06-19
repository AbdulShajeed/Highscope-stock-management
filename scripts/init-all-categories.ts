import Database from 'better-sqlite3'
import path from 'path'

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')
const db = new Database(dbPath)

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Create all categories
const categories = [
  { name: 'Junction Box SS', description: 'SS316 Junction boxes for industrial applications' },
  { name: 'Light Fittings', description: 'Cooper light fittings for various applications' },
  { name: 'Cable Glands & Plugs', description: 'Cable glands and plugs for secure connections' },
  { name: 'Eaton SS Breatherdrain, Plug SS', description: 'Eaton SS breather drain and plugs' },
  { name: 'GRP JB', description: 'GRP junction boxes' },
  { name: 'Automation', description: 'Automation components' },
]

const insertCategory = db.prepare(`
  INSERT OR IGNORE INTO Category (id, name, description, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?)
`)

const now = new Date().toISOString()
const categoryIds: { [key: string]: string } = {}

for (const cat of categories) {
  const id = crypto.randomUUID()
  insertCategory.run(id, cat.name, cat.description, now, now)
  categoryIds[cat.name] = id
}

// Create sample items for each category
const sampleItems = [
  // Junction Box SS
  { category: 'Junction Box SS', itemCode: 'JBSS-001', description: 'EXCELL _ETO_A ME XLHS 33030201', make: 'COOPER', incomingQty: 172, soldQty: 74, finalQty: 98 },
  { category: 'Junction Box SS', itemCode: 'JBSS-002', description: 'EXCELL _ETO_A ME XLHS 34040201', make: 'COOPER', incomingQty: 138, soldQty: 132, finalQty: 6 },
  { category: 'Junction Box SS', itemCode: 'JBSS-003', description: 'EXCELL _ETO_A ME XLHS 35050201', make: 'COOPER', incomingQty: 98, soldQty: 10, finalQty: 88 },

  // Light Fittings
  { category: 'Light Fittings', itemCode: 'LF-001', description: 'CCL1622411U HLL-2-3L-D-2/6-220', make: 'COOPER', incomingQty: 41, soldQty: 41, finalQty: 0 },
  { category: 'Light Fittings', itemCode: 'LF-002', description: 'CCL1622795U HLL-4-5L-D-2/6-220', make: 'COOPER', incomingQty: 111, soldQty: 41, finalQty: 70 },
  { category: 'Light Fittings', itemCode: 'LF-003', description: 'CCL1622859U HLL-4-5L-EM2-2/6', make: 'COOPER', incomingQty: 83, soldQty: 46, finalQty: 37 },

  // Cable Glands & Plugs
  { category: 'Cable Glands & Plugs', itemCode: 'CG-001', description: 'M20 Cable gland CAP846694V1K2', make: 'COOPER', incomingQty: 1374, soldQty: 2055, finalQty: -681 },
  { category: 'Cable Glands & Plugs', itemCode: 'CG-002', description: 'M25 Cable gland CAP846704V1K2', make: 'COOPER', incomingQty: 399, soldQty: 541, finalQty: -142 },
  { category: 'Cable Glands & Plugs', itemCode: 'CG-003', description: 'M32 Cable gland CAP846804V1K2', make: 'COOPER', incomingQty: 170, soldQty: 100, finalQty: 70 },
  { category: 'Cable Glands & Plugs', itemCode: 'CG-004', description: 'M40 Cable gland CAP846904V1K2', make: 'COOPER', incomingQty: 83, soldQty: 106, finalQty: -23 },

  // Eaton SS
  { category: 'Eaton SS Breatherdrain, Plug SS', itemCode: 'ESS-001', description: 'Breather Drain-SS DPE3004S1', make: 'COOPER', incomingQty: 494, soldQty: 191, finalQty: 303 },
  { category: 'Eaton SS Breatherdrain, Plug SS', itemCode: 'ESS-002', description: 'M20 HOLLOW HEAD PLUG S/S EXD/E', make: 'COOPER', incomingQty: 1000, soldQty: 91, finalQty: 909 },

  // GRP JB
  { category: 'GRP JB', itemCode: 'GRP-001', description: 'GBX121209 & B+C+A', make: 'EATON', incomingQty: 400, soldQty: 54, finalQty: 346 },
  { category: 'GRP JB', itemCode: 'GRP-002', description: 'GBX221209 & B+C+A', make: 'EATON', incomingQty: 35, soldQty: 15, finalQty: 20 },

  // Automation
  { category: 'Automation', itemCode: 'AU-001', description: '2966171-PLC-RSC-24DC/21Relay', make: 'PHOENIX', incomingQty: 363, soldQty: 339, finalQty: 24 },
  { category: 'Automation', itemCode: 'AU-002', description: '2907945 EEM-MA770 Meas', make: 'PHOENIX', incomingQty: 2, soldQty: 0, finalQty: 2 },
]

const insertItem = db.prepare(`
  INSERT OR IGNORE INTO StockItem (
    id, itemCode, description, make, incomingQty, soldQty, finalQty, categoryId, createdAt, updatedAt
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

for (const item of sampleItems) {
  const categoryId = categoryIds[item.category]
  if (categoryId) {
    insertItem.run(
      crypto.randomUUID(),
      item.itemCode,
      item.description,
      item.make,
      item.incomingQty,
      item.soldQty,
      item.finalQty,
      categoryId,
      now,
      now
    )
  }
}

// Create monthly stock data for all categories
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

// Get all stock items
const allItems = db.prepare('SELECT * FROM StockItem').all() as any[]

for (const item of allItems) {
  let previousClosing = 0

  for (let i = 0; i < months.length; i++) {
    const { month, year } = months[i]

    // Opening is previous month's closing (or 0 for first month)
    const openingQty = previousClosing

    // Random incoming and sold quantities
    const incomingQty = Math.floor(Math.random() * 50) + 10
    const soldQty = Math.floor(Math.random() * 30) + 5

    // Calculate closing
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

    // Set previous closing for next month
    previousClosing = closingQty
  }
}

console.log('All categories and monthly data created successfully!')
console.log('Categories:', Object.keys(categoryIds).join(', '))

db.close()
