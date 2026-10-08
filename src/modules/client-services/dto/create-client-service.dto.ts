import {
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateClientServiceDto {
  @IsString()
  @MaxLength(50)
  serviceCode!: string;

  @IsOptional()
  @IsObject()
  configuration?: Record<string, unknown>;
}