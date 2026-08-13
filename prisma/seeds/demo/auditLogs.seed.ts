import { Prisma, PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

const AUDIT_COUNT = 200

function randomFrom<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)] }

export async function seed(prisma: PrismaClient) {
  const now = new Date()

  const users = await prisma.user.findMany({ select: { id: true, email: true } })
  const clients = await prisma.client.findMany({ select: { id: true } })
  if (users.length === 0) return

  const actions = ['user.login', 'user.update', 'message.send', 'message.status', 'api.key.use']

  for (let i = 0; i < AUDIT_COUNT; i++) {
    const user = randomFrom(users)
    const client = randomFrom(clients)
    const id = uuidv4()
    const action = randomFrom(actions)
    const createdAt = new Date(now.getTime() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 30))

    await prisma.auditLog.upsert({
      where: { id },
      update: {},
      create: {
        id,
        clientId: client?.id ?? null,
        userId: user.id,
        entityType: 'demo',
        entityId: id,
        action,
        oldValues: Prisma.JsonNull,
        newValues: { message: `Audit ${action}` },
        ipAddress: '102.0.0.1',
        userAgent: 'seed-script/1.0',
        createdAt,
      },
    })
  }

  console.log('✔ Seeded audit logs')
}
