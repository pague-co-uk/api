import { PrismaClient } from '@prisma/client'

type RoleMap = { [key: string]: string[] }

// Assign permissions by permission code
const ROLE_PERMISSIONS: RoleMap = {
  SUPER_ADMIN: ['*'], // wildcard — will connect all permissions

  ADMIN: [
    'CLIENTS_CREATE', 'CLIENTS_READ', 'CLIENTS_UPDATE', 'CLIENTS_LIST',
    'USERS_CREATE', 'USERS_READ', 'USERS_UPDATE', 'USERS_LIST',
    'ROLES_READ', 'ROLES_LIST', 'PERMISSIONS_READ', 'PERMISSIONS_LIST',
    'API_KEYS_CREATE', 'API_KEYS_READ', 'API_KEYS_LIST', 'API_KEYS_ROTATE',
    'SENDER_IDS_CREATE', 'SENDER_IDS_READ', 'SENDER_IDS_UPDATE', 'SENDER_IDS_LIST',
    'SMPP_CREATE', 'SMPP_READ', 'SMPP_UPDATE', 'SMPP_LIST',
    'MESSAGES_LIST', 'MESSAGES_READ', 'MESSAGES_RETRY', 'MESSAGES_CREATE',
    'FLOAT_VIEW', 'FLOAT_CREDIT', 'FLOAT_DEBIT', 'FLOAT_LIST',
    'WEBHOOKS_CREATE', 'WEBHOOKS_READ', 'WEBHOOKS_LIST',
    'AUDIT_LOGS_READ', 'AUDIT_LOGS_LIST'
  ],

  OPERATOR: [
    'MESSAGES_CREATE', 'MESSAGES_READ', 'MESSAGES_LIST', 'MESSAGES_RETRY',
    'SENDER_IDS_READ', 'SENDER_IDS_LIST', 'SENDER_IDS_CREATE', 'SENDER_IDS_UPDATE',
    'SMPP_READ', 'SMPP_LIST'
  ],

  SUPPORT: [
    'CLIENTS_READ', 'CLIENTS_LIST', 'USERS_READ', 'USERS_LIST',
    'MESSAGES_READ', 'MESSAGES_LIST', 'AUDIT_LOGS_READ', 'AUDIT_LOGS_LIST'
  ],

  READ_ONLY: [
    'CLIENTS_READ', 'CLIENTS_LIST', 'USERS_READ', 'USERS_LIST',
    'MESSAGES_READ', 'MESSAGES_LIST', 'SENDER_IDS_READ', 'SENDER_IDS_LIST',
    'AUDIT_LOGS_READ', 'AUDIT_LOGS_LIST'
  ],
}

export async function seed(prisma: PrismaClient) {
  const now = new Date()

  // fetch all permissions once
  const allPermissions = await prisma.permission.findMany({ select: { id: true, name: true } })
  const permByCode = new Map(allPermissions.map(p => [p.name, p.id]))

  for (const [roleCode, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.findUnique({ where: { name: roleCode } })
    if (!role) continue

    if (perms.length === 1 && perms[0] === '*') {
      // connect all permissions
      for (const p of allPermissions) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: p.id } },
          update: {},
          create: { roleId: role.id, permissionId: p.id, assignedAt: now },
        })
      }
      continue
    }

    for (const code of perms) {
      const pid = permByCode.get(code)
      if (!pid) continue
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: pid } },
        update: {},
        create: { roleId: role.id, permissionId: pid, assignedAt: now },
      })
    }
  }

  console.log('✔ Seeded role-permissions')
}
