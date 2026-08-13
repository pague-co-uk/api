import { ApiProperty } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

export class CreateSenderIdDto {
  @ApiProperty({
    description: "Public identifier for the Sender ID.",
    example: "SID-001",
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  readonly publicId!: string;

  @ApiProperty({
    description: "Client that owns the Sender ID.",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID()
  readonly clientId!: string;

  @ApiProperty({
    description: "SMS Sender ID/originator.",
    example: "VIBRANT",
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  readonly sender!: string;
}