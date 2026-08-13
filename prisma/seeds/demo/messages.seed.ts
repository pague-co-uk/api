import { MessageEncoding, MessageStatus, PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

const MESSAGE_COUNT = 100

function randomFrom<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)] }

export async function seed(prisma: PrismaClient) {
  const now = new Date()

  const clients = await prisma.client.findMany({ select: { id: true } })
  const senderIds = await prisma.senderId.findMany({ select: { id: true } })

  if (clients.length === 0 || senderIds.length === 0) return

  const statuses = [
    MessageStatus.QUEUED,
    MessageStatus.ROUTED,
    MessageStatus.SUBMITTED,
    MessageStatus.DELIVERED,
    MessageStatus.FAILED,
    MessageStatus.EXPIRED,
  ]

  const encodings = [MessageEncoding.GSM7, MessageEncoding.UCS2]

  for (let i = 0; i < MESSAGE_COUNT; i++) {
    const id = uuidv4()
    const client = randomFrom(clients)
    const sender = randomFrom(senderIds)
    const currentStatus = randomFrom(statuses)
    const encoding = randomFrom(encodings)
    const publicId = `MSG${id.replace(/-/g, '').slice(0, 12)}`
    const destination = '+2547' + (10000000 + i).toString().slice(-7)
    const createdAt = new Date(now.getTime() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 30))

    await prisma.message.upsert({
      where: { id },
      update: { currentStatus, updatedAt: now },
      create: {
        id,
        publicId,
        clientId: client.id,
        senderIdId: sender.id,
        destination,
        body: `Demo message ${i + 1}`,
        encoding,
        segmentCount: 1,
        currentStatus,
        submittedAt: createdAt,
        createdAt,
        updatedAt: createdAt,
      },
    })
  }

  console.log('✔ Seeded demo messages')
}
