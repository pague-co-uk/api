import { PrismaClient, UserStatus } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

export const USERS = [
  // Acme Telecom users
  {
    id: '00000000-0000-0000-0000-000000000001',
    clientCompany: 'Acme Telecom',
    email: 'superadmin@acmetelecom.example',
    firstName: 'Alice',
    lastName: 'Karanja',
    passwordHash: '<CHANGE_ME_HASH>',
    status: UserStatus.ACTIVE,
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    clientCompany: 'Acme Telecom',
    email: 'admin@acmetelecom.example',
    firstName: 'Bob',
    lastName: 'Mwangi',
    passwordHash: '<CHANGE_ME_HASH>',
    status: UserStatus.ACTIVE,
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    clientCompany: 'Acme Telecom',
    email: 'operator@acmetelecom.example',
    firstName: 'Carol',
    lastName: 'Njoroge',
    passwordHash: '<CHANGE_ME_HASH>',
    status: UserStatus.ACTIVE,
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    clientCompany: 'Acme Telecom',
    email: 'support@acmetelecom.example',
    firstName: 'David',
    lastName: 'Otieno',
    passwordHash: '<CHANGE_ME_HASH>',
    status: UserStatus.ACTIVE,
  },
  {
    id: '00000000-0000-0000-0000-000000000005',
    clientCompany: 'Acme Telecom',
    email: 'readonly@acmetelecom.example',
    firstName: 'Eve',
    lastName: 'Kamau',
    passwordHash: '<CHANGE_ME_HASH>',
    status: UserStatus.ACTIVE,
  },

  // Demo Client users
  {
    id: '00000000-0000-0000-0000-000000000011',
    clientCompany: 'Demo Client',
    email: 'superadmin@democlient.example',
    firstName: 'Frank',
    lastName: 'Ochieng',
    passwordHash: '<CHANGE_ME_HASH>',
    status: UserStatus.ACTIVE,
  },
  {
    id: '00000000-0000-0000-0000-000000000012',
    clientCompany: 'Demo Client',
    email: 'admin@democlient.example',
    firstName: 'Grace',
    lastName: 'Wanjiru',
    passwordHash: '<CHANGE_ME_HASH>',
    status: UserStatus.ACTIVE,
  },
  {
    id: '00000000-0000-0000-0000-000000000013',
    clientCompany: 'Demo Client',
    email: 'operator@democlient.example',
    firstName: 'Hassan',
    lastName: 'Abdi',
    passwordHash: '<CHANGE_ME_HASH>',
    status: UserStatus.ACTIVE,
  },
  {
    id: '00000000-0000-0000-0000-000000000014',
    clientCompany: 'Demo Client',
    email: 'support@democlient.example',
    firstName: 'Ivy',
    lastName: 'Otieno',
    passwordHash: '<CHANGE_ME_HASH>',
    status: UserStatus.ACTIVE,
  },
  {
    id: '00000000-0000-0000-0000-000000000015',
    clientCompany: 'Demo Client',
    email: 'readonly@democlient.example',
    firstName: 'Jack',
    lastName: 'Kiplagat',
    passwordHash: '<CHANGE_ME_HASH>',
    status: UserStatus.ACTIVE,
  },
]

export async function seed(prisma: PrismaClient) {
  const now = new Date()

  for (const u of USERS) {
    // find client by company name (not unique in schema) — use findFirst
    const client = await prisma.client.findFirst({ where: { companyName: u.clientCompany } })
    if (!client) continue

    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        firstName: u.firstName,
        lastName: u.lastName,
        passwordHash: u.passwordHash,
        status: u.status,
        clientId: client.id,
        updatedAt: now,
      },
      create: {
        id: u.id ?? uuidv4(),
        username: `${u.email.split('@')[0]}-${u.id.slice(-4)}`,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        passwordHash: u.passwordHash,
        status: u.status,
        clientId: client.id,
        createdAt: now,
        updatedAt: now,
      },
    })
  }

  console.log('✔ Seeded users')
}
