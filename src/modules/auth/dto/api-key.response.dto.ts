import {
  ApiProperty,
  ApiPropertyOptional,
} from "@nestjs/swagger";
import {
  ApiKeyStatus,
} from "@prisma/client";

export class ApiKeyResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  publicId!: string;

  @ApiProperty()
  clientId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  prefix!: string;

  @ApiProperty({
    enum: ApiKeyStatus,
  })
  status!: ApiKeyStatus;

  @ApiPropertyOptional({
    nullable: true,
  })
  lastUsedAt!: Date | null;

  @ApiPropertyOptional({
    nullable: true,
  })
  expiresAt!: Date | null;

  @ApiPropertyOptional({
    nullable: true,
  })
  revokedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}