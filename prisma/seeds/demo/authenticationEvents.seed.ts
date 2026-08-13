import { AuthenticationEventType, AuthenticationMethod, PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

const AUTH_EVENTS = 200

function randomFrom<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)] }

export async function seed(prisma: PrismaClient) {
  const now = new Date()

  const users = await prisma.user.findMany({ select: { id: true, email: true } })
  const clients = await prisma.client.findMany({ select: { id: true } })
  if (users.length === 0) return

  const results = [AuthenticationEventType.LOGIN_SUCCESS, AuthenticationEventType.LOGIN_FAILED]
  const methods = [AuthenticationMethod.PASSWORD, AuthenticationMethod.API_KEY]

  for (let i = 0; i < AUTH_EVENTS; i++) {
    const user = randomFrom(users)
    const client = randomFrom(clients)
    const id = uuidv4()
    const eventType = randomFrom(results)
    const method = randomFrom(methods)
    const createdAt = new Date(now.getTime() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 30))

    await prisma.authenticationEvent.upsert({
      where: { id },
      update: {},
      create: {
        id,
        userId: user.id,
        clientId: client?.id ?? null,
        authenticationMethod: method,
        type: eventType,
        ipAddress: `102.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        userAgent: 'seed-script/1.0',
        createdAt,
      },
    })
  }

  console.log('✔ Seeded authentication events')
}
