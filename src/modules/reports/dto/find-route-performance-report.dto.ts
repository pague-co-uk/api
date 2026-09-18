import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from "class-validator";

import {
  MessageRouteAttemptStatus,
} from "@prisma/client";

export class FindRoutePerformanceReportDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsUUID()
  routeId?: string;

  @IsOptional()
  @IsUUID()
  connectorId?: string;

  @IsOptional()
  @IsEnum(MessageRouteAttemptStatus)
  status?: MessageRouteAttemptStatus;

  @IsOptional()
  @IsUUID()
  clientId?: string;
}