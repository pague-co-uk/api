import {
  IsInt,
  IsOptional,
  Max,
  Min,
} from "class-validator";

export class UpdateSmppAccountDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  maxConcurrentBinds?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(3600)
  enquireLinkInterval?: number;
}