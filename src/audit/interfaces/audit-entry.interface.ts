export interface AuditEntry {
  action: string;

  actorId?: string;

  actorType?: string;

  clientId?: string;

  resourceType: string;

  resourceId: string;

  metadata?: Record<string, unknown>;
}
