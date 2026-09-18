import {
  ApiProperty,
} from "@nestjs/swagger";

import {
  MobileNetworkStatus,
} from "@prisma/client";

export class MobileNetworkCountryResponseDto {

  @ApiProperty({
    example: "MW",
    description:
      "ISO 3166-1 alpha-2 country code.",
  })
  readonly code!: string;

  @ApiProperty({
    example: "Malawi",
  })
  readonly name!: string;

}

export class MobileNetworkResponseDto {

  @ApiProperty({
    example:
      "550e8400-e29b-41d4-a716-446655440000",
  })
  readonly id!: string;

  @ApiProperty({
    example: "MNO-001",
  })
  readonly publicId!: string;

  @ApiProperty({
    example: "Airtel Malawi",
  })
  readonly name!: string;

  @ApiProperty({
    example: "AIRTEL-MW",
  })
  readonly code!: string;

  @ApiProperty({
    example: "MW",
    description:
      "ISO 3166-1 alpha-2 country code.",
  })
  readonly countryCode!: string;

  @ApiProperty({
    type: MobileNetworkCountryResponseDto,
  })
  readonly country!: MobileNetworkCountryResponseDto;

  @ApiProperty({
    description:
      "Regular expression describing the numbering range allocated to this mobile network.",
    example:
      "^265(?:88|89|90)",
    nullable: true,
  })
  readonly routingRegex!: string | null;

  @ApiProperty({
    enum: MobileNetworkStatus,
    example:
      MobileNetworkStatus.ACTIVE,
  })
  readonly status!: MobileNetworkStatus;

  @ApiProperty({
    example:
      "2026-08-13T10:00:00.000Z",
  })
  readonly createdAt!: Date;

  @ApiProperty({
    example:
      "2026-08-13T10:00:00.000Z",
  })
  readonly updatedAt!: Date;

}