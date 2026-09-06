import {
  Injectable,
} from "@nestjs/common";

import {
  Prisma,
} from "@prisma/client";

import { AuditLogRepository } from "../../../repositories/auditLogRepository.js";
import { FindAuditLogsDto } from "../dto/find-audit-logs.dto.js";

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
    options?: {
      readonly page?: number;
      readonly pageSize?: number;
    },
  ) {
    return this.auditLogs.findByEntity(
      entityType,
      entityId,
      options,
    );
  }

  async findByClient(
    clientId: string,
    options?: {
      readonly page?: number;
      readonly pageSize?: number;
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
      readonly page?: number;
      readonly pageSize?: number;
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
      readonly page?: number;
      readonly pageSize?: number;
    },
  ) {
    return this.auditLogs.findByAction(
      action,
      options,
    );
  }

  async findMany(
    query: FindAuditLogsDto,
  ) {
    return this.auditLogs.findMany({
      search: query.search,
      clientId: query.clientId,
      userId: query.userId,
      action: query.action,
      entityType: query.entityType,
      entityId: query.entityId,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    });
  }
}