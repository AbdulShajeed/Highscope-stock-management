import { PrismaClient } from '../src/generated/prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create categories
  const junctionBox = await prisma.category.upsert({
    where: { name: 'Junction Box' },
    update: {},
    create: {
      name: 'Junction Box',
      description: 'EXCELL ETO-A and custom junction boxes for industrial applications',
    },
  })

  const cableGlands = await prisma.category.upsert({
    where: { name: 'Cable Glands' },
    update: {},
    create: {
      name: 'Cable Glands',
      description: 'Cable glands and plugs for secure cable connections',
    },
  })

  console.log('Created categories:', { junctionBox, cableGlands })

  // Create sample stock items for Junction Box
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
      categoryId: junctionBox.id,
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
      categoryId: junctionBox.id,
    },
  ]

  // Create sample stock items for Cable Glands
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
      categoryId: cableGlands.id,
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
      categoryId: cableGlands.id,
    },
  ]

  // Insert stock items
  for (const item of [...junctionBoxItems, ...cableGlandItems]) {
    await prisma.stockItem.upsert({
      where: { itemCode: item.itemCode },
      update: item,
      create: item,
    })
  }

  console.log('Seeded stock items')
  console.log('Database seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
