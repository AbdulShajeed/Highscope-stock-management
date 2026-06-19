import Database from 'better-sqlite3'
import path from 'path'

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')
const db = new Database(dbPath)

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS Category (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS StockItem (
    id TEXT PRIMARY KEY,
    itemCode TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    detailedDescription TEXT,
    make TEXT,
    ratePerPcs REAL,
    location TEXT,
    incomingQty INTEGER NOT NULL DEFAULT 0,
    soldQty INTEGER NOT NULL DEFAULT 0,
    finalQty INTEGER NOT NULL DEFAULT 0,
    totalValue REAL,
    reorderLevel INTEGER,
    notes TEXT,
    categoryId TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (categoryId) REFERENCES Category(id)
  );

  CREATE TABLE IF NOT EXISTS StockMovement (
    id TEXT PRIMARY KEY,
    movementType TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    projectCode TEXT,
    customerName TEXT,
    employee TEXT,
    poNumber TEXT,
    sellingPrice REAL,
    totalAmount REAL,
    notes TEXT,
    stockItemId TEXT NOT NULL,
    movementDate TEXT NOT NULL DEFAULT (datetime('now')),
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (stockItemId) REFERENCES StockItem(id)
  );

  CREATE TABLE IF NOT EXISTS Project (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT,
    customerName TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );
`)

// Seed initial categories
const junctionBoxId = crypto.randomUUID()
const cableGlandsId = crypto.randomUUID()
const now = new Date().toISOString()

db.prepare(`
  INSERT OR IGNORE INTO Category (id, name, description, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?)
`).run(junctionBoxId, 'Junction Box', 'EXCELL ETO-A and custom junction boxes for industrial applications', now, now)

db.prepare(`
  INSERT OR IGNORE INTO Category (id, name, description, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?)
`).run(cableGlandsId, 'Cable Glands', 'Cable glands and plugs for secure cable connections', now, now)

// Seed sample stock items
const junctionBoxItems = [
  {
    itemCode: 'JB-001',
    description: 'EXCELL _ETO_A EXCELL CUSTOM XLHS 14030151',
    detailedDescription: 'Custom junction box for industrial use',
    make: 'COOPER-MF(old)',
    ratePerPcs: 1050,
    location: 'ADMIN STOCK OLD',
    incomingQty: 3,
    soldQty: 2,
    finalQty: 1,
    totalValue: 1050,
    categoryId: junctionBoxId,
  },
  {
    itemCode: 'JB-002',
    description: 'EXCELL _ETO_A ME XLHS 33030201 - L10',
    detailedDescription: 'Standard junction box model',
    make: 'COOPER-new',
    ratePerPcs: 950,
    location: 'ADMIN STOCK',
    incomingQty: 261,
    soldQty: 89,
    finalQty: 172,
    totalValue: 163400,
    categoryId: junctionBoxId,
  },
]

const cableGlandItems = [
  {
    itemCode: 'CG-001',
    description: 'M20 Cable gland CAP846694V1K2',
    detailedDescription: 'Model: M20 ADE 4F Cable gland with kit K',
    make: 'COOPER',
    ratePerPcs: 20.52,
    incomingQty: 1374,
    soldQty: 2055,
    finalQty: -681,
    totalValue: -13970.92,
    categoryId: cableGlandsId,
  },
  {
    itemCode: 'CG-002',
    description: 'M25 Cable gland CAP846704V1K2',
    detailedDescription: 'Model: M25 ADE 4F Cable gland with kit K',
    make: 'COOPER',
    ratePerPcs: 59.82,
    incomingQty: 399,
    soldQty: 541,
    finalQty: -142,
    totalValue: -8494.58,
    categoryId: cableGlandsId,
  },
]

const insertItem = db.prepare(`
  INSERT OR IGNORE INTO StockItem (
    id, itemCode, description, detailedDescription, make, ratePerPcs,
    location, incomingQty, soldQty, finalQty, totalValue, categoryId, createdAt, updatedAt
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

for (const item of [...junctionBoxItems, ...cableGlandItems]) {
  insertItem.run(
    crypto.randomUUID(),
    item.itemCode,
    item.description,
    item.detailedDescription,
    item.make,
    item.ratePerPcs,
    item.location,
    item.incomingQty,
    item.soldQty,
    item.finalQty,
    item.totalValue,
    item.categoryId,
    now,
    now
  )
}

console.log('Database initialized successfully!')
console.log('Created categories: Junction Box, Cable Glands')
console.log('Created sample stock items: JB-001, JB-002, CG-001, CG-002')

db.close()
