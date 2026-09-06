import { ApiProperty } from "@nestjs/swagger";
import { MobileNetworkStatus } from "@prisma/client";

export class MobileNetworkPrefixResponseDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  readonly id!: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  readonly mobileNetworkId!: string;

  @ApiProperty({ example: "447" })
  readonly prefix!: string;

  @ApiProperty({ example: "GB" })
  readonly countryCode!: string;

  @ApiProperty({ example: true })
  readonly enabled!: boolean;

  @ApiProperty({ example: "2026-08-13T10:00:00.000Z" })
  readonly createdAt!: Date;

  @ApiProperty({ example: "2026-08-13T10:00:00.000Z" })
  readonly updatedAt!: Date;
}

export class MobileNetworkResponseDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  readonly id!: string;

  @ApiProperty({ example: "MNO-001" })
  readonly publicId!: string;

  @ApiProperty({ example: "Vodafone UK" })
  readonly name!: string;

  @ApiProperty({ example: "VOD" })
  readonly code!: string;

  @ApiProperty({ example: "GB" })
  readonly countryCode!: string;

  @ApiProperty({ enum: MobileNetworkStatus, example: MobileNetworkStatus.ACTIVE })
  readonly status!: MobileNetworkStatus;

  @ApiProperty({ type: [MobileNetworkPrefixResponseDto] })
  readonly prefixes!: MobileNetworkPrefixResponseDto[];

  @ApiProperty({ example: "2026-08-13T10:00:00.000Z" })
  readonly createdAt!: Date;

  @ApiProperty({ example: "2026-08-13T10:00:00.000Z" })
  readonly updatedAt!: Date;
}
