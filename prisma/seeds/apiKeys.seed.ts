import { ApiKeyStatus, PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

const API_KEYS = [
  {
    name: 'Acme API key',
    prefix: 'ACME',
    secretHash: '<CHANGE_ME>',
    clientCompany: 'Acme Telecom',
    status: ApiKeyStatus.ACTIVE,
  },
  {
    name: 'Demo API key',
    prefix: 'DEMO',
    secretHash: '<CHANGE_ME>',
    clientCompany: 'Demo Client',
    status: ApiKeyStatus.ACTIVE,
  },
]

export async function seed(prisma: PrismaClient) {
  const now = new Date()

  for (const k of API_KEYS) {
    const client = await prisma.client.findFirst({ where: { companyName: k.clientCompany } })
    if (!client) continue

    const publicId = `${k.prefix}-${client.publicId}`.slice(0, 20)

    await prisma.apiKey.upsert({
      where: { prefix: k.prefix },
      update: {
        name: k.name,
        secretHash: k.secretHash,
        status: k.status,
        clientId: client.id,
        updatedAt: now,
      },
      create: {
        id: uuidv4(),
        publicId,
        name: k.name,
        prefix: k.prefix,
        secretHash: k.secretHash,
        status: k.status,
        clientId: client.id,
        createdAt: now,
        updatedAt: now,
      },
    })
  }

  console.log('✔ Seeded API keys')
}
