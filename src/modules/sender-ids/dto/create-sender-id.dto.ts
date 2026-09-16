import { ApiProperty } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsString,
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
    description: "SMS Sender ID/originator.",
    example: "VIBRANT",
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  readonly sender!: string;
}