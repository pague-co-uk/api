import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from "class-validator";

export class CreateRouteDto {
  @ApiProperty({ description: "Public identifier for the route.", example: "ROUTE-001", maxLength: 20 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  readonly publicId!: string;

  @ApiProperty({ description: "Client identifier to route for.", example: "client-1" })
  @IsString()
  @IsNotEmpty()
  readonly clientId!: string;

  @ApiProperty({ description: "Mobile network identifier.", example: "network-1" })
  @IsString()
  @IsNotEmpty()
  readonly mobileNetworkId!: string;

  @ApiProperty({ description: "Connector identifier.", example: "connector-1" })
  @IsString()
  @IsNotEmpty()
  readonly connectorId!: string;

  @ApiProperty({ description: "Route priority for the client and network.", example: 10, minimum: 1 })
  @IsInt()
  @Min(1)
  readonly priority!: number;
}
