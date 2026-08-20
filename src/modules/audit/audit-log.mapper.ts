import { Injectable } from "@nestjs/common";

import type { AuditLog } from "@prisma/client";

import { AuditLogResponseDto } from "./dto/audit-log.response.dto.js";

@Injectable()
export class AuditLogMapper {
  toResponse(
    auditLog: AuditLog,
  ): AuditLogResponseDto {
    return {
      id: auditLog.id,

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