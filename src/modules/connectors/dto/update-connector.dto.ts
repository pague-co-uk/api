import { ApiPropertyOptional } from "@nestjs/swagger";
import { ConnectorTransport } from "@prisma/client";
import { IsEnum, IsObject, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateConnectorDto {
  @ApiPropertyOptional({ description: "Display name of the connector.", example: "Primary SMPP", maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly name?: string;

  @ApiPropertyOptional({ description: "Unique short code used for the connector.", example: "SMPP-1", maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  readonly code?: string;

  @ApiPropertyOptional({ description: "Provider/vendor name.", example: "OpenSMPP", maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly provider?: string;

  @ApiPropertyOptional({ description: "Transport protocol.", enum: ConnectorTransport, example: ConnectorTransport.SMPP })
  @IsOptional()
  @IsEnum(ConnectorTransport)
  readonly transport?: ConnectorTransport;

  @ApiPropertyOptional({ description: "Connector configuration payload.", example: { host: "127.0.0.1", port: 2775 } })
  @IsOptional()
  @IsObject()
  readonly configuration?: Record<string, unknown>;
}
