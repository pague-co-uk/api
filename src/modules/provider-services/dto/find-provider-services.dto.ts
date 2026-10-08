import {
  IsBooleanString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

import { Type } from "class-transformer";

export class FindProviderServicesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Max(100)
  @Min(1)
  pageSize = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBooleanString()
  active?: string;

  @IsOptional()
  @IsString()
  providerCode?: string;

  @IsOptional()
  @IsString()
  serviceCode?: string;

  @IsOptional()
  @IsString()
  sort?: string;
}