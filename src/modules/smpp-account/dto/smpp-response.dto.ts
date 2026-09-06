import {
  ApiProperty,
  ApiPropertyOptional,
} from "@nestjs/swagger";
import { SmppAccountStatus } from "@prisma/client";

export class SmppAccountResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  publicId!: string;

  @ApiPropertyOptional()
  clientId?: string;

  @ApiPropertyOptional({
    type: "object",
    nullable: true,
    properties: {
      id: { type: "string" },
      publicId: { type: "string" },
      companyName: { type: "string" },
      displayName: { type: "string" },
    },
  })
  client?: {
    id: string;
    publicId: string;
    companyName: string;
    displayName: string;
  };

  @ApiProperty()
  systemId!: string;

  @ApiProperty({ enum: SmppAccountStatus })
  status!: SmppAccountStatus;

  @ApiProperty()
  maxConcurrentBinds!: number;

  @ApiProperty()
  enquireLinkInterval!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}