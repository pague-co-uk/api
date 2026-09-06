import { ApiProperty } from "@nestjs/swagger";
import { RouteStatus } from "@prisma/client";

export class RouteClientResponseDto {
  @ApiProperty({ example: "client-1" })
  readonly id!: string;

  @ApiProperty({ example: "Example Client" })
  readonly companyName!: string;

  @ApiProperty({ example: "Example Client" })
  readonly displayName!: string;
}

export class RouteMobileNetworkResponseDto {
  @ApiProperty({ example: "network-1" })
  readonly id!: string;

  @ApiProperty({ example: "Vodafone" })
  readonly name!: string;

  @ApiProperty({ example: "VOD" })
  readonly code!: string;

  @ApiProperty({ example: "GB" })
  readonly countryCode!: string;

  @ApiProperty({ example: "ACTIVE" })
  readonly status!: string;
}

export class RouteConnectorResponseDto {
  @ApiProperty({ example: "connector-1" })
  readonly id!: string;

  @ApiProperty({ example: "Primary SMPP" })
  readonly name!: string;

  @ApiProperty({ example: "SMPP-1" })
  readonly code!: string;

  @ApiProperty({ example: "OpenSMPP" })
  readonly provider!: string;

  @ApiProperty({ example: "SMPP" })
  readonly transport!: string;

  @ApiProperty({ example: "ACTIVE" })
  readonly status!: string;
}

export class RouteResponseDto {
  @ApiProperty({ example: "route-1" })
  readonly id!: string;

  @ApiProperty({ example: "ROUTE-001" })
  readonly publicId!: string;

  @ApiProperty({ example: "client-1" })
  readonly clientId!: string;

  @ApiProperty({ type: () => RouteClientResponseDto, required: false })
  readonly client?: RouteClientResponseDto;

  @ApiProperty({ example: "network-1" })
  readonly mobileNetworkId!: string;

  @ApiProperty({ type: () => RouteMobileNetworkResponseDto, required: false })
  readonly mobileNetwork?: RouteMobileNetworkResponseDto;

  @ApiProperty({ example: "connector-1" })
  readonly connectorId!: string;

  @ApiProperty({ type: () => RouteConnectorResponseDto, required: false })
  readonly connector?: RouteConnectorResponseDto;

  @ApiProperty({ example: 10 })
  readonly priority!: number;

  @ApiProperty({ enum: RouteStatus, example: RouteStatus.ACTIVE })
  readonly status!: RouteStatus;

  @ApiProperty({ example: "2026-08-13T10:00:00.000Z" })
  readonly createdAt!: Date;

  @ApiProperty({ example: "2026-08-13T10:00:00.000Z" })
  readonly updatedAt!: Date;
}
