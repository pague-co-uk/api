import { PrismaClient } from '@prisma/client';

type SeedModule = {
  seed: (prisma: PrismaClient) => Promise<void>
}

const seedOrder: Array<{ name: string; path: string }> = [
  { name: 'permissions', path: './seeds/permissions.seed.ts' },
  { name: 'roles', path: './seeds/roles.seed.ts' },
  { name: 'rolePermissions', path: './seeds/rolePermissions.seed.ts' },
  { name: 'clients', path: './seeds/clients.seed.ts' },
  { name: 'users', path: './seeds/users.seed.ts' },
  { name: 'userRoles', path: './seeds/userRoles.seed.ts' },
  { name: 'senderIds', path: './seeds/senderIds.seed.ts' },
  { name: 'smppAccounts', path: './seeds/smppAccounts.seed.ts' },
  { name: 'apiKeys', path: './seeds/apiKeys.seed.ts' },
  { name: 'demo/messages', path: './seeds/demo/messages.seed.ts' },
  { name: 'demo/messageAttempts', path: './seeds/demo/messageAttempts.seed.ts' },
  { name: 'demo/messageStatusEvents', path: './seeds/demo/messageStatusEvents.seed.ts' },
  { name: 'demo/floatLedger', path: './seeds/demo/floatLedger.seed.ts' },
  { name: 'demo/auditLogs', path: './seeds/demo/auditLogs.seed.ts' },
  { name: 'demo/authenticationEvents', path: './seeds/demo/authenticationEvents.seed.ts' },
]

async function run() {
  const prisma = new PrismaClient()

  try {
    for (const entry of seedOrder) {
      process.stdout.write(`→ Running seed: ${entry.name}... `)
      const mod = (await import(entry.path)) as SeedModule
      if (!mod || typeof mod.seed !== 'function') {
        console.warn(`skipping ${entry.name} — no exported seed()`)
        continue
      }
      await mod.seed(prisma)
      console.log('✔')
    }

    console.log('\nAll seeds executed successfully.')
  } catch (error) {
    console.error('Seeding failed:', error)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

run()
