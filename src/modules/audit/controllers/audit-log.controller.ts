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
import { PaginatedResponse } from "../../../common/interfaces/paginated.response.js";
import { ApiPaginatedResponse } from "../../../decorators/api-paginated-response.decorator.js";
import { ApiSuccessResponse } from "../../../decorators/api-success-response.decorator.js";

import { AuditLogMapper } from "../audit-log.mapper.js";
import { AuditLogResponseDto } from "../dto/audit-log.response.dto.js";
import { FindAuditLogsDto } from "../dto/find-audit-logs.dto.js";
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
  @ApiPaginatedResponse(
    AuditLogResponseDto,
  )
  async findByEntity(
    @Param("entityType")
    entityType: string,

    @Param("entityId", ParseUUIDPipe)
    entityId: string,

    @Query()
    dto: FindAuditLogsDto,
  ): Promise<
    PaginatedResponse<AuditLogResponseDto>
  > {
    const page =
      await this.auditLogs.findByEntity(
        entityType,
        entityId,
        {
          page: dto.page,
          pageSize: dto.pageSize,
        },
      );

    return new PaginatedResponse(
      this.mapper.toResponses(
        page.items,
      ),
      page,
    );
  }

  @Get()
  @Authorize(Permissions.AUDIT_LOGS_READ)
  @ApiPaginatedResponse(AuditLogResponseDto)
  async findMany(
    @Query() query: FindAuditLogsDto,
  ) {
    const page =
      await this.auditLogs.findMany(
        query,
      );

    return new PaginatedResponse(
      this.mapper.toResponses(
        page.items,
      ),
      page,
    );
  }
  // -------------------------------------------------------------------------
  // Find by client
  // -------------------------------------------------------------------------

  @Get("client/:clientId")
  @Authorize(Permissions.AUDIT_LOGS_READ)
  @ApiOperation({
    summary: "Retrieve audit logs for a client.",
  })
  @ApiParam({
    name: "clientId",
    description: "Client identifier.",
  })
  @ApiPaginatedResponse(
    AuditLogResponseDto,
  )
  async findByClient(
    @Param("clientId", ParseUUIDPipe)
    clientId: string,

    @Query()
    dto: FindAuditLogsDto,
  ): Promise<
    PaginatedResponse<AuditLogResponseDto>
  > {
    const page =
      await this.auditLogs.findByClient(
        clientId,
        {
          page: dto.page,
          pageSize: dto.pageSize,
        },
      );

    return new PaginatedResponse(
      this.mapper.toResponses(
        page.items,
      ),
      page,
    );
  }

  // -------------------------------------------------------------------------
  // Find by user
  // -------------------------------------------------------------------------

  @Get("user/:userId")
  @Authorize(Permissions.AUDIT_LOGS_READ)
  @ApiOperation({
    summary: "Retrieve audit logs for a user.",
  })
  @ApiParam({
    name: "userId",
    description: "User identifier.",
  })
  @ApiPaginatedResponse(
    AuditLogResponseDto,
  )
  async findByUser(
    @Param("userId", ParseUUIDPipe)
    userId: string,

    @Query()
    dto: FindAuditLogsDto,
  ): Promise<
    PaginatedResponse<AuditLogResponseDto>
  > {
    const page =
      await this.auditLogs.findByUser(
        userId,
        {
          page: dto.page,
          pageSize: dto.pageSize,
        },
      );

    return new PaginatedResponse(
      this.mapper.toResponses(
        page.items,
      ),
      page,
    );
  }

  // -------------------------------------------------------------------------
  // Find by action
  // -------------------------------------------------------------------------

  @Get("action/:action")
  @Authorize(Permissions.AUDIT_LOGS_READ)
  @ApiOperation({
    summary: "Retrieve audit logs by action.",
  })
  @ApiParam({
    name: "action",
    description: "Audit action.",
  })
  @ApiPaginatedResponse(
    AuditLogResponseDto,
  )
  async findByAction(
    @Param("action")
    action: string,

    @Query()
    dto: FindAuditLogsDto,
  ): Promise<
    PaginatedResponse<AuditLogResponseDto>
  > {
    const page =
      await this.auditLogs.findByAction(
        action,
        {
          page: dto.page,
          pageSize: dto.pageSize,
        },
      );

    return new PaginatedResponse(
      this.mapper.toResponses(
        page.items,
      ),
      page,
    );
  }

  // -------------------------------------------------------------------------
  // Find by ID
  // -------------------------------------------------------------------------

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
  ): Promise<
    AuditLogResponseDto | null
  > {
    const auditLog =
      await this.auditLogs.findById(id);

    return auditLog
      ? this.mapper.toResponse(
        auditLog,
      )
      : null;
  }
}