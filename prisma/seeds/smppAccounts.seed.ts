import { PrismaClient, SmppAccountStatus } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

const SMPP_ACCOUNTS = [
  {
    systemId: 'ACME_SMPP',
    publicId: 'acme-smpp',
    passwordHash: '<CHANGE_ME_HASH>',
    status: SmppAccountStatus.ACTIVE,
    clientCompany: 'Acme Telecom',
  },
  {
    systemId: 'DEMO_SMPP',
    publicId: 'demo-smpp',
    passwordHash: '<CHANGE_ME_HASH>',
    status: SmppAccountStatus.ACTIVE,
    clientCompany: 'Demo Client',
  },
]

export async function seed(prisma: PrismaClient) {
  const now = new Date()

  for (const s of SMPP_ACCOUNTS) {
    const client = await prisma.client.findFirst({ where: { companyName: s.clientCompany } })
    if (!client) continue

    await prisma.smppAccount.upsert({
      where: { publicId: s.publicId },
      update: {
        systemId: s.systemId,
        passwordHash: s.passwordHash,
        status: s.status,
        clientId: client.id,
        updatedAt: now,
      },
      create: {
        id: uuidv4(),
        publicId: s.publicId,
        clientId: client.id,
        systemId: s.systemId,
        passwordHash: s.passwordHash,
        status: s.status,
        createdAt: now,
        updatedAt: now,
      },
    })
  }

  console.log('✔ Seeded SMPP accounts')
}
