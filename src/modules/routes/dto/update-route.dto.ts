import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class UpdateRouteDto {
  @ApiPropertyOptional({ description: "Client identifier to route for.", example: "client-1" })
  @IsOptional()
  @IsString()
  readonly clientId?: string;

  @ApiPropertyOptional({ description: "Mobile network identifier.", example: "network-1" })
  @IsOptional()
  @IsString()
  readonly mobileNetworkId?: string;

  @ApiPropertyOptional({ description: "Connector identifier.", example: "connector-1" })
  @IsOptional()
  @IsString()
  readonly connectorId?: string;

  @ApiPropertyOptional({ description: "Route priority for the client and network.", example: 10, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  readonly priority?: number;
}
