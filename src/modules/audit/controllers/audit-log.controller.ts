import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
} from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";

import { Authorize } from "../../../common/authorization/decorators/authorize.decorator.js";
import { Permissions } from "../../../common/authorization/permissions/permissions.registry.js";
import { ApiSuccessResponse } from "../../../decorators/api-success-response.decorator.js";

import { AuditLogMapper } from "../audit-log.mapper.js";
import { AuditLogResponseDto } from "../dto/audit-log.response.dto.js";
import { AuditLogService } from "../services/audit-log.service.js";

@ApiTags("Audit Logs")
@Controller("audit-logs")
export class AuditLogController {
  constructor(
    private readonly auditLogs: AuditLogService,
    private readonly mapper: AuditLogMapper,
  ) { }

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  @Get("entity/:entityType/:entityId")
  @Authorize(Permissions.AUDIT_LOGS_READ)
  @ApiOperation({
    summary: "Retrieve audit logs for an entity.",
  })
  @ApiParam({
    name: "entityType",
    description: "Type of entity.",
  })
  @ApiParam({
    name: "entityId",
    description: "Entity identifier.",
  })
  async findByEntity(
    @Param("entityType")
    entityType: string,

    @Param("entityId", ParseUUIDPipe)
    entityId: string,
  ): Promise<AuditLogResponseDto[]> {
    return this.mapper.toResponses(
      await this.auditLogs.findByEntity(
        entityType,
        entityId,
      ),
    );
  }

  @Get("client/:clientId")
  @Authorize(Permissions.AUDIT_LOGS_READ)
  @ApiOperation({
    summary: "Retrieve audit logs for a client.",
  })
  @ApiParam({
    name: "clientId",
    description: "Client identifier.",
  })
  async findByClient(
    @Param("clientId", ParseUUIDPipe)
    clientId: string,

    @Query("limit")
    limit?: number,

    @Query("offset")
    offset?: number,
  ): Promise<AuditLogResponseDto[]> {
    return this.mapper.toResponses(
      await this.auditLogs.findByClient(
        clientId,
        {
          limit,
          offset,
        },
      ),
    );
  }

  @Get("user/:userId")
  @Authorize(Permissions.AUDIT_LOGS_READ)
  @ApiOperation({
    summary: "Retrieve audit logs for a user.",
  })
  @ApiParam({
    name: "userId",
    description: "User identifier.",
  })
  async findByUser(
    @Param("userId", ParseUUIDPipe)
    userId: string,

    @Query("limit")
    limit?: number,

    @Query("offset")
    offset?: number,
  ): Promise<AuditLogResponseDto[]> {
    return this.mapper.toResponses(
      await this.auditLogs.findByUser(
        userId,
        {
          limit,
          offset,
        },
      ),
    );
  }

  @Get("action/:action")
  @Authorize(Permissions.AUDIT_LOGS_READ)
  @ApiOperation({
    summary: "Retrieve audit logs by action.",
  })
  @ApiParam({
    name: "action",
    description: "Audit action.",
  })
  async findByAction(
    @Param("action")
    action: string,

    @Query("limit")
    limit?: number,

    @Query("offset")
    offset?: number,
  ): Promise<AuditLogResponseDto[]> {
    return this.mapper.toResponses(
      await this.auditLogs.findByAction(
        action,
        {
          limit,
          offset,
        },
      ),
    );
  }

  @Get(":id")
  @Authorize(Permissions.AUDIT_LOGS_READ)
  @ApiOperation({
    summary: "Retrieve an audit log.",
  })
  @ApiParam({
    name: "id",
    description: "Audit log identifier.",
  })
  @ApiSuccessResponse(
    AuditLogResponseDto,
  )
  @ApiNotFoundResponse({
    description: "Audit log not found.",
  })
  async findById(
    @Param("id", ParseUUIDPipe)
    id: string,
  ): Promise<AuditLogResponseDto | null> {
    const auditLog =
      await this.auditLogs.findById(
        id,
      );

    return auditLog
      ? this.mapper.toResponse(
        auditLog,
      )
      : null;
  }
}