import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

import {
  MessageEncoding,
} from "@prisma/client";

export class CreateApiMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  destination!: string;

  @IsString()
  @IsNotEmpty()
  body!: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  sender?: string;

  @IsEnum(MessageEncoding)
  @IsOptional()
  encoding: MessageEncoding =
    MessageEncoding.GSM7;
}