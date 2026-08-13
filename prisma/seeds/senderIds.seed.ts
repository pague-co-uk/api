import { PrismaClient, SenderIdStatus } from '@prisma/client'

const SENDER_NAMES = ['PAGUE', 'BANK', 'SHOP', 'ALERT', 'VERIFY']

export async function seed(prisma: PrismaClient) {
  const now = new Date()

  const clients = await prisma.client.findMany({ select: { id: true, publicId: true } })
  if (clients.length === 0) return

  for (const client of clients) {
    for (const s of SENDER_NAMES) {
      const publicId = `${client.publicId}-${s}`.slice(0, 20)
      await prisma.senderId.upsert({
        where: { publicId },
        update: { sender: s, status: SenderIdStatus.APPROVED, updatedAt: now, clientId: client.id },
        create: {
          publicId,
          clientId: client.id,
          sender: s,
          status: SenderIdStatus.APPROVED,
          isDefault: s === 'PAGUE',
          createdAt: now,
          updatedAt: now,
        },
      })
    }
  }

  console.log('✔ Seeded sender IDs')
}
