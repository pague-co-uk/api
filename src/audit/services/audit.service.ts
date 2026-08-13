import { Injectable } from "@nestjs/common";
import {
  getComponentLogger,
  recordException,
  withSpan,
} from "@pague-co-uk/sms-gateway-telemetry";

import type { AuditEntry } from "../interfaces/audit-entry.interface.js";

@Injectable()
export class AuditService {
  private readonly logger =
    getComponentLogger(AuditService.name);

  async record(
    entry: AuditEntry,
  ): Promise<void> {
    return withSpan(
      "AuditService.record",
      async (span) => {
        span.setAttributes({
          "audit.action": entry.action,
          "audit.resource_type": entry.resourceType,
          "audit.resource_id": entry.resourceId,
          ...(entry.actorId && {
            "audit.actor_id": entry.actorId,
          }),
          ...(entry.actorType && {
            "audit.actor_type": entry.actorType,
          }),
          ...(entry.clientId && {
            "audit.client_id": entry.clientId,
          }),
        });

        try {
          this.logger.info(
            {
              action: entry.action,
              actorId: entry.actorId,
              actorType: entry.actorType,
              clientId: entry.clientId,
              resourceType: entry.resourceType,
              resourceId: entry.resourceId,
              metadata: entry.metadata,
            },
            "AUDIT",
          );
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              action: entry.action,
              resourceType: entry.resourceType,
              resourceId: entry.resourceId,
            },
            "Failed to record audit event.",
          );

          throw error;
        }
      },
    );
  }
}
