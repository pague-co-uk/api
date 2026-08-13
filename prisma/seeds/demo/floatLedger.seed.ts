import { LedgerReferenceType, LedgerTransactionType, PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

const LEDGER_COUNT = 100

function randomFrom<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)] }

export async function seed(prisma: PrismaClient) {
  const now = new Date()

  const clients = await prisma.client.findMany({ select: { id: true } })
  const users = await prisma.user.findMany({ select: { id: true } })
  if (clients.length === 0) return

  for (let i = 0; i < LEDGER_COUNT; i++) {
    const client = randomFrom(clients)
    const createdBy = Math.random() > 0.5 ? randomFrom(users)?.id ?? null : null
    const id = uuidv4()
    const credits = Math.floor(Math.random() * 10000) // in cents or smallest unit
    const transactionType = randomFrom([LedgerTransactionType.TOPUP, LedgerTransactionType.DEBIT, LedgerTransactionType.ADJUSTMENT])
    const referenceType = randomFrom([LedgerReferenceType.MESSAGE, LedgerReferenceType.ADMIN, LedgerReferenceType.SYSTEM])
    const referenceId = referenceType === LedgerReferenceType.MESSAGE ? null : null
    const createdAt = new Date(now.getTime() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 30))

    await prisma.floatLedgerEntry.upsert({
      where: { id },
      update: { credits, transactionType, referenceType },
      create: {
        id,
        publicId: `FL${id.replace(/-/g, '').slice(0, 12)}`,
        clientId: client.id,
        createdById: createdBy,
        transactionType,
        credits,
        referenceType,
        referenceId: null,
        description: `${transactionType} ${credits}`,
        createdAt,
      },
    })
  }

  console.log('✔ Seeded float ledger entries')
}
