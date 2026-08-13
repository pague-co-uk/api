import { PrismaClient } from '@prisma/client';

const ASSIGNMENTS: { email: string; roleCode: string }[] = [
  { email: 'superadmin@acmetelecom.example', roleCode: 'SUPER_ADMIN' },
  { email: 'admin@acmetelecom.example', roleCode: 'ADMIN' },
  { email: 'operator@acmetelecom.example', roleCode: 'OPERATOR' },
  { email: 'support@acmetelecom.example', roleCode: 'SUPPORT' },
  { email: 'readonly@acmetelecom.example', roleCode: 'READ_ONLY' },

  { email: 'superadmin@democlient.example', roleCode: 'SUPER_ADMIN' },
  { email: 'admin@democlient.example', roleCode: 'ADMIN' },
  { email: 'operator@democlient.example', roleCode: 'OPERATOR' },
  { email: 'support@democlient.example', roleCode: 'SUPPORT' },
  { email: 'readonly@democlient.example', roleCode: 'READ_ONLY' },
]

export async function seed(prisma: PrismaClient) {
  const now = new Date()

  for (const a of ASSIGNMENTS) {
    const user = await prisma.user.findUnique({ where: { email: a.email } })
    const role = await prisma.role.findUnique({ where: { name: a.roleCode } })
    if (!user || !role) continue

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id, assignedAt: now },
    })
  }

  console.log('✔ Seeded user-roles')
}
