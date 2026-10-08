import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

import { ClientServiceStatus } from "@prisma/client";
import { Type } from "class-transformer";

export class FindClientServicesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ClientServiceStatus)
  status?: ClientServiceStatus;

  @IsOptional()
  @IsString()
  sort?: string;
}