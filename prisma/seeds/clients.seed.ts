import { ClientStatus, PrismaClient } from '@prisma/client'

export const CLIENTS = [
  {
    companyName: 'Acme Telecom',
    displayName: 'Acme Telecom',
    email: 'support@acmetelecom.example',
    phone: '+254700000001',
    timezone: 'Africa/Nairobi',
    status: ClientStatus.ACTIVE,
  },
  {
    companyName: 'Demo Client',
    displayName: 'Demo Client',
    email: 'hello@democlient.example',
    phone: '+254700000002',
    timezone: 'UTC',
    status: ClientStatus.ACTIVE,
  },
]

export async function seed(prisma: PrismaClient) {
  const now = new Date()

  for (const c of CLIENTS) {
    const publicId = c.companyName.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 12)

    await prisma.client.upsert({
      where: { email: c.email },
      update: {
        displayName: c.displayName,
        phone: c.phone,
        timezone: c.timezone,
        status: c.status,
        updatedAt: now,
      },
      create: {
        publicId,
        companyName: c.companyName,
        displayName: c.displayName,
        email: c.email,
        phone: c.phone,
        timezone: c.timezone,
        status: c.status,
        createdAt: now,
        updatedAt: now,
      },
    })
  }

  console.log('✔ Seeded clients')
}
