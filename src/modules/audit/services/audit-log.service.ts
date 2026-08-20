import {
  Injectable,
} from "@nestjs/common";

import {
  Prisma,
} from "@prisma/client";

import { AuditLogRepository } from "../../../repositories/auditLogRepository.js";

@Injectable()
export class AuditLogService {
  constructor(
    private readonly auditLogs: AuditLogRepository,
  ) { }

  // -------------------------------------------------------------------------
  // Create
  // -------------------------------------------------------------------------

  async create(
    data: {
      readonly clientId?: string;
      readonly userId?: string;

      readonly entityType: string;
      readonly entityId: string;
      readonly action: string;

      readonly oldValues?: Prisma.InputJsonValue;
      readonly newValues?: Prisma.InputJsonValue;

      readonly ipAddress?: string;
      readonly userAgent?: string;
    },
  ) {
    return this.auditLogs.create({
      ...(data.clientId
        ? {
          client: {
            connect: {
              id: data.clientId,
            },
          },
        }
        : {}),

      ...(data.userId
        ? {
          user: {
            connect: {
              id: data.userId,
            },
          },
        }
        : {}),

      entityType:
        data.entityType,

      entityId:
        data.entityId,

      action:
        data.action,

      ...(data.oldValues !== undefined
        ? {
          oldValues:
            data.oldValues,
        }
        : {}),

      ...(data.newValues !== undefined
        ? {
          newValues:
            data.newValues,
        }
        : {}),

      ...(data.ipAddress !== undefined
        ? {
          ipAddress:
            data.ipAddress,
        }
        : {}),

      ...(data.userAgent !== undefined
        ? {
          userAgent:
            data.userAgent,
        }
        : {}),
    });
  }

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  async findById(
    id: string,
  ) {
    return this.auditLogs.findById(
      id,
    );
  }

  async findByEntity(
    entityType: string,
    entityId: string,
  ) {
    return this.auditLogs.findByEntity(
      entityType,
      entityId,
    );
  }

  async findByClient(
    clientId: string,
    options?: {
      readonly limit?: number;
      readonly offset?: number;
    },
  ) {
    return this.auditLogs.findByClient(
      clientId,
      options,
    );
  }

  async findByUser(
    userId: string,
    options?: {
      readonly limit?: number;
      readonly offset?: number;
    },
  ) {
    return this.auditLogs.findByUser(
      userId,
      options,
    );
  }

  async findByAction(
    action: string,
    options?: {
      readonly limit?: number;
      readonly offset?: number;
    },
  ) {
    return this.auditLogs.findByAction(
      action,
      options,
    );
  }
}