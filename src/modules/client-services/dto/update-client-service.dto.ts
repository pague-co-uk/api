import {
  IsObject,
  IsOptional,
} from "class-validator";

export class UpdateClientServiceDto {
  @IsOptional()
  @IsObject()
  configuration?: Record<string, unknown>;
}