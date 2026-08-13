import { PrismaClient } from '@prisma/client'

export const ROLES = [
  { name: 'SUPER_ADMIN', description: 'Super Administrator — unrestricted access' },
  { name: 'ADMIN', description: 'Administrator — manage most resources' },
  { name: 'OPERATOR', description: 'Operator — manage messages and sender IDs' },
  { name: 'SUPPORT', description: 'Support — view data and assist customers' },
  { name: 'READ_ONLY', description: 'Read Only — view-only access' },
]

export async function seed(prisma: PrismaClient) {
  const now = new Date()

  for (const r of ROLES) {
    await prisma.role.upsert({
      where: { name: r.name },
      update: {
        description: r.description ?? null,
      },
      create: {
        name: r.name,
        description: r.description ?? null,
        createdAt: now,
      },
    })
  }

  console.log('✔ Seeded roles')
}
