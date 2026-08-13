import { MessageAttemptStatus, PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

const ATTEMPT_COUNT = 150

function randomFrom<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)] }

export async function seed(prisma: PrismaClient) {
  const now = new Date()

  const messages = await prisma.message.findMany({ select: { id: true, currentStatus: true } })
  const smppAccounts = await prisma.smppAccount.findMany({ select: { id: true, publicId: true } })

  if (messages.length === 0 || smppAccounts.length === 0) return

  for (let i = 0; i < ATTEMPT_COUNT; i++) {
    const msg = randomFrom(messages)
    const account = randomFrom(smppAccounts)
    const attemptNumber = Math.floor(Math.random() * 3) + 1
    const id = uuidv4()
    const status = msg.currentStatus === 'DELIVERED' ? MessageAttemptStatus.SUBMITTED : (Math.random() > 0.7 ? MessageAttemptStatus.FAILED : MessageAttemptStatus.SUBMITTED)
    const createdAt = new Date(now.getTime() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 30))

    await prisma.messageAttempt.upsert({
      where: { messageId_attemptNumber: { messageId: msg.id, attemptNumber } },
      update: { status },
      create: {
        id,
        messageId: msg.id,
        attemptNumber,
        status,
        provider: account.publicId ?? 'smpp',
        providerMessageId: 'gw-' + id.slice(0, 8),
        startedAt: createdAt,
        completedAt: status === MessageAttemptStatus.FAILED ? createdAt : createdAt,
        createdAt,
      },
    })
  }

  console.log('✔ Seeded message attempts')
}
