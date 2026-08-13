import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsString,
  MaxLength,
} from "class-validator";

export class UpdateSenderIdDto {
  @ApiPropertyOptional({
    description: "SMS Sender ID/originator.",
    example: "VIBRANT",
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  readonly sender?: string;
}