import { PrismaClient } from '@prisma/client'

type PermissionSeed = {
  code: string
  name: string
  module: string
  action?: string
  description?: string
}

export const PERMISSIONS: PermissionSeed[] = [
  // AUTH
  { code: 'AUTH_CREATE', name: 'Auth: Create', module: 'AUTH', action: 'create', description: 'Create authentication entries' },
  { code: 'AUTH_READ', name: 'Auth: Read', module: 'AUTH', action: 'read', description: 'Read authentication entries' },
  { code: 'AUTH_UPDATE', name: 'Auth: Update', module: 'AUTH', action: 'update', description: 'Update authentication entries' },
  { code: 'AUTH_DELETE', name: 'Auth: Delete', module: 'AUTH', action: 'delete', description: 'Delete authentication entries' },
  { code: 'AUTH_LIST', name: 'Auth: List', module: 'AUTH', action: 'list', description: 'List authentication entries' },

  // CLIENTS
  { code: 'CLIENTS_CREATE', name: 'Clients: Create', module: 'CLIENTS', action: 'create', description: 'Create clients' },
  { code: 'CLIENTS_READ', name: 'Clients: Read', module: 'CLIENTS', action: 'read', description: 'Read client details' },
  { code: 'CLIENTS_UPDATE', name: 'Clients: Update', module: 'CLIENTS', action: 'update', description: 'Update client details' },
  { code: 'CLIENTS_DELETE', name: 'Clients: Delete', module: 'CLIENTS', action: 'delete', description: 'Delete clients' },
  { code: 'CLIENTS_LIST', name: 'Clients: List', module: 'CLIENTS', action: 'list', description: 'List clients' },

  // USERS
  { code: 'USERS_CREATE', name: 'Users: Create', module: 'USERS', action: 'create', description: 'Create users' },
  { code: 'USERS_READ', name: 'Users: Read', module: 'USERS', action: 'read', description: 'Read user profiles' },
  { code: 'USERS_UPDATE', name: 'Users: Update', module: 'USERS', action: 'update', description: 'Update user profiles' },
  { code: 'USERS_DELETE', name: 'Users: Delete', module: 'USERS', action: 'delete', description: 'Delete users' },
  { code: 'USERS_LIST', name: 'Users: List', module: 'USERS', action: 'list', description: 'List users' },

  // ROLES
  { code: 'ROLES_CREATE', name: 'Roles: Create', module: 'ROLES', action: 'create', description: 'Create roles' },
  { code: 'ROLES_READ', name: 'Roles: Read', module: 'ROLES', action: 'read', description: 'Read roles' },
  { code: 'ROLES_UPDATE', name: 'Roles: Update', module: 'ROLES', action: 'update', description: 'Update roles' },
  { code: 'ROLES_DELETE', name: 'Roles: Delete', module: 'ROLES', action: 'delete', description: 'Delete roles' },
  { code: 'ROLES_LIST', name: 'Roles: List', module: 'ROLES', action: 'list', description: 'List roles' },

  // PERMISSIONS
  { code: 'PERMISSIONS_CREATE', name: 'Permissions: Create', module: 'PERMISSIONS', action: 'create', description: 'Create permissions' },
  { code: 'PERMISSIONS_READ', name: 'Permissions: Read', module: 'PERMISSIONS', action: 'read', description: 'Read permissions' },
  { code: 'PERMISSIONS_UPDATE', name: 'Permissions: Update', module: 'PERMISSIONS', action: 'update', description: 'Update permissions' },
  { code: 'PERMISSIONS_DELETE', name: 'Permissions: Delete', module: 'PERMISSIONS', action: 'delete', description: 'Delete permissions' },
  { code: 'PERMISSIONS_LIST', name: 'Permissions: List', module: 'PERMISSIONS', action: 'list', description: 'List permissions' },

  // API_KEYS
  { code: 'API_KEYS_CREATE', name: 'API Keys: Create', module: 'API_KEYS', action: 'create', description: 'Create API keys' },
  { code: 'API_KEYS_READ', name: 'API Keys: Read', module: 'API_KEYS', action: 'read', description: 'Read API keys' },
  { code: 'API_KEYS_UPDATE', name: 'API Keys: Update', module: 'API_KEYS', action: 'update', description: 'Update API key metadata' },
  { code: 'API_KEYS_DELETE', name: 'API Keys: Delete', module: 'API_KEYS', action: 'delete', description: 'Revoke API keys' },
  { code: 'API_KEYS_LIST', name: 'API Keys: List', module: 'API_KEYS', action: 'list', description: 'List API keys' },
  { code: 'API_KEYS_ROTATE', name: 'API Keys: Rotate', module: 'API_KEYS', action: 'update', description: 'Rotate API key secrets' },

  // SENDER_IDS
  { code: 'SENDER_IDS_CREATE', name: 'Sender IDs: Create', module: 'SENDER_IDS', action: 'create', description: 'Create sender IDs' },
  { code: 'SENDER_IDS_READ', name: 'Sender IDs: Read', module: 'SENDER_IDS', action: 'read', description: 'Read sender ID details' },
  { code: 'SENDER_IDS_UPDATE', name: 'Sender IDs: Update', module: 'SENDER_IDS', action: 'update', description: 'Update sender IDs' },
  { code: 'SENDER_IDS_DELETE', name: 'Sender IDs: Delete', module: 'SENDER_IDS', action: 'delete', description: 'Delete sender IDs' },
  { code: 'SENDER_IDS_LIST', name: 'Sender IDs: List', module: 'SENDER_IDS', action: 'list', description: 'List sender IDs' },

  // SMPP
  { code: 'SMPP_CREATE', name: 'SMPP: Create', module: 'SMPP', action: 'create', description: 'Create SMPP accounts' },
  { code: 'SMPP_READ', name: 'SMPP: Read', module: 'SMPP', action: 'read', description: 'Read SMPP account details' },
  { code: 'SMPP_UPDATE', name: 'SMPP: Update', module: 'SMPP', action: 'update', description: 'Update SMPP accounts' },
  { code: 'SMPP_DELETE', name: 'SMPP: Delete', module: 'SMPP', action: 'delete', description: 'Delete SMPP accounts' },
  { code: 'SMPP_LIST', name: 'SMPP: List', module: 'SMPP', action: 'list', description: 'List SMPP accounts' },

  // MESSAGES
  { code: 'MESSAGES_CREATE', name: 'Messages: Create/Send', module: 'MESSAGES', action: 'create', description: 'Create / send messages' },
  { code: 'MESSAGES_READ', name: 'Messages: Read', module: 'MESSAGES', action: 'read', description: 'Read message details' },
  { code: 'MESSAGES_UPDATE', name: 'Messages: Update', module: 'MESSAGES', action: 'update', description: 'Update message metadata' },
  { code: 'MESSAGES_DELETE', name: 'Messages: Delete', module: 'MESSAGES', action: 'delete', description: 'Delete messages' },
  { code: 'MESSAGES_LIST', name: 'Messages: List', module: 'MESSAGES', action: 'list', description: 'List messages' },
  { code: 'MESSAGES_RETRY', name: 'Messages: Retry', module: 'MESSAGES', action: 'update', description: 'Retry failed messages' },

  // FLOAT
  { code: 'FLOAT_VIEW', name: 'Float: View', module: 'FLOAT', action: 'read', description: 'View float balances' },
  { code: 'FLOAT_CREDIT', name: 'Float: Credit', module: 'FLOAT', action: 'create', description: 'Credit float ledger' },
  { code: 'FLOAT_DEBIT', name: 'Float: Debit', module: 'FLOAT', action: 'create', description: 'Debit float ledger' },
  { code: 'FLOAT_LIST', name: 'Float: List', module: 'FLOAT', action: 'list', description: 'List float ledger entries' },

  // WEBHOOKS
  { code: 'WEBHOOKS_CREATE', name: 'Webhooks: Create', module: 'WEBHOOKS', action: 'create', description: 'Create webhooks' },
  { code: 'WEBHOOKS_READ', name: 'Webhooks: Read', module: 'WEBHOOKS', action: 'read', description: 'Read webhook configurations' },
  { code: 'WEBHOOKS_LIST', name: 'Webhooks: List', module: 'WEBHOOKS', action: 'list', description: 'List webhooks' },

  // AUDIT_LOGS
  { code: 'AUDIT_LOGS_READ', name: 'Audit Logs: Read', module: 'AUDIT_LOGS', action: 'read', description: 'Read audit logs' },
  { code: 'AUDIT_LOGS_LIST', name: 'Audit Logs: List', module: 'AUDIT_LOGS', action: 'list', description: 'List audit logs' },
]

export async function seed(prisma: PrismaClient) {
  const now = new Date()

  for (const p of PERMISSIONS) {
    // store the stable code in the permission `name` field so we can reference by code
    const permissionName = p.code
    await prisma.permission.upsert({
      where: { name: permissionName },
      update: {
        module: p.module,
        description: p.description ?? p.name,
      },
      create: {
        name: permissionName,
        module: p.module,
        description: p.description ?? p.name,
        createdAt: now,
      },
    })
  }

  console.log('✔ Seeded permissions')
}
