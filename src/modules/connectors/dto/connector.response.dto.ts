import { ApiProperty } from "@nestjs/swagger";
import { ConnectorStatus, ConnectorTransport } from "@prisma/client";

export class ConnectorResponseDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  readonly id!: string;

  @ApiProperty({ example: "CON-001" })
  readonly publicId!: string;

  @ApiProperty({ example: "Primary SMPP" })
  readonly name!: string;

  @ApiProperty({ example: "SMPP-1" })
  readonly code!: string;

  @ApiProperty({ example: "OpenSMPP" })
  readonly provider!: string;

  @ApiProperty({ enum: ConnectorTransport, example: ConnectorTransport.SMPP })
  readonly transport!: ConnectorTransport;

  @ApiProperty({ enum: ConnectorStatus, example: ConnectorStatus.ACTIVE })
  readonly status!: ConnectorStatus;

  @ApiProperty({ example: { host: "127.0.0.1", port: 2775 }, required: false })
  readonly configuration?: Record<string, unknown>;

  @ApiProperty({ example: "2026-08-13T10:00:00.000Z" })
  readonly createdAt!: Date;

  @ApiProperty({ example: "2026-08-13T10:00:00.000Z" })
  readonly updatedAt!: Date;
}
