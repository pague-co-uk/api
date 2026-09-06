import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsOptional,
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
  @IsOptional()
  readonly sender?: string;
}