import { ApiProperty } from "@nestjs/swagger";
import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

import type { ApiKeyCapability } from "../../../common/authorization/permissions/api-key-capabilities.registry.js";

export class CreateApiKeyDto {
  @ApiProperty({
    description: "API key name.",
    example: "Production",
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description: "Optional API key expiration date.",
    example: "2027-01-01T00:00:00.000Z",
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiProperty({
    type: [String],
    description:
      "Capabilities granted to the API key.",
    example: [
      "messages.send",
    ],
  })
  @IsArray()
  @IsString({
    each: true,
  })
  capabilities!: readonly ApiKeyCapability[];
}