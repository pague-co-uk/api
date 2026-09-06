import { ApiProperty } from "@nestjs/swagger";
import { ConnectorTransport } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateConnectorDto {
  @ApiProperty({ description: "Public identifier for the connector.", example: "CON-001", maxLength: 20 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  readonly publicId!: string;

  @ApiProperty({ description: "Display name of the connector.", example: "Primary SMPP", maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly name!: string;

  @ApiProperty({ description: "Unique short code used for the connector.", example: "SMPP-1", maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  readonly code!: string;

  @ApiProperty({ description: "Provider/vendor name.", example: "OpenSMPP", maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly provider!: string;

  @ApiProperty({ description: "Transport protocol.", enum: ConnectorTransport, example: ConnectorTransport.SMPP })
  @IsEnum(ConnectorTransport)
  readonly transport!: ConnectorTransport;

  @ApiProperty({ description: "Connector configuration payload.", required: false, example: { host: "127.0.0.1", port: 2775 } })
  @IsOptional()
  @IsObject()
  readonly configuration?: Record<string, unknown>;
}
