import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AuditLogResponseDto {
  @ApiProperty({
    description: "Audit log identifier.",
    format: "uuid",
  })
  id!: string;

  @ApiPropertyOptional({
    description: "Client associated with the audit event.",
    format: "uuid",
    nullable: true,
  })
  clientId!: string | null;

  @ApiPropertyOptional({
    description: "User responsible for the audit event.",
    format: "uuid",
    nullable: true,
  })
  userId!: string | null;

  @ApiProperty({
    description: "Type of entity affected.",
    example: "client",
  })
  entityType!: string;

  @ApiProperty({
    description: "Identifier of the affected entity.",
    format: "uuid",
  })
  entityId!: string;

  @ApiProperty({
    description: "Action performed.",
    example: "clients.create",
  })
  action!: string;

  @ApiPropertyOptional({
    description: "Entity state before the operation.",
    nullable: true,
  })
  oldValues!: unknown | null;

  @ApiPropertyOptional({
    description: "Entity state after the operation.",
    nullable: true,
  })
  newValues!: unknown | null;

  @ApiPropertyOptional({
    description: "IP address from which the operation originated.",
    nullable: true,
  })
  ipAddress!: string | null;

  @ApiPropertyOptional({
    description: "User agent associated with the operation.",
    nullable: true,
  })
  userAgent!: string | null;

  @ApiProperty({
    description: "When the audit event was created.",
    format: "date-time",
  })
  createdAt!: Date;
}