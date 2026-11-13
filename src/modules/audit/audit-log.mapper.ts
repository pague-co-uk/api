import { Injectable } from "@nestjs/common";

import type { AuditLog } from "@prisma/client";

import { AuditLogResponseDto } from "./dto/audit-log.response.dto.js";

@Injectable()
export class AuditLogMapper {
  toResponse(
    auditLog: AuditLog & { client?: { displayName: string; companyName: string } | null; user?: { firstName: string; lastName: string; username: string } | null },
  ): AuditLogResponseDto {
    return {
      id: auditLog.id,
      clientName: auditLog.client ? auditLog.client.displayName || auditLog.client.companyName : null,
      userName: auditLog.user ? `${auditLog.user.firstName} ${auditLog.user.lastName}`.trim() || auditLog.user.username : null,


      clientId:
        auditLog.clientId,

      userId:
        auditLog.userId,

      entityType:
        auditLog.entityType,

      entityId:
        auditLog.entityId,

      action:
        auditLog.action,

      oldValues:
        auditLog.oldValues,

      newValues:
        auditLog.newValues,

      ipAddress:
        auditLog.ipAddress,

      userAgent:
        auditLog.userAgent,

      createdAt:
        auditLog.createdAt,
    };
  }

  toResponses(
    auditLogs: readonly AuditLog[],
  ): AuditLogResponseDto[] {
    return auditLogs.map(
      (auditLog) =>
        this.toResponse(auditLog),
    );
  }
}