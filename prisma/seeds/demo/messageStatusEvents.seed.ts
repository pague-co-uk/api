import { MessageStatus, PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

const EVENT_COUNT = 300

function randomFrom<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)] }

export async function seed(prisma: PrismaClient) {
  const now = new Date()

  const messages = await prisma.message.findMany({ select: { id: true } })
  if (messages.length === 0) return

  const possibleStatuses = [
    MessageStatus.QUEUED,
    MessageStatus.ROUTED,
    MessageStatus.SUBMITTED,
    MessageStatus.DELIVERED,
    MessageStatus.FAILED,
    MessageStatus.EXPIRED,
  ]

  for (let i = 0; i < EVENT_COUNT; i++) {
    const msg = randomFrom(messages)
    const id = uuidv4()
    const status = randomFrom(possibleStatuses)
    const createdAt = new Date(now.getTime() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 30))

    await prisma.messageStatusEvent.upsert({
      where: { id },
      update: { status },
      create: {
        id,
        messageId: msg.id,
        status,
        source: 'seed-script',
        description: `Auto event ${i + 1}`,
        rawData: { note: `generated ${i + 1}` },
        createdAt,
      },
    })
  }

  console.log('✔ Seeded message status events')
}
