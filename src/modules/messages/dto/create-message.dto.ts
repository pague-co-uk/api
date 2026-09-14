import {
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

import {
  MessageEncoding,
} from "@prisma/client";

export class CreateMessageDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  sender?: string;

  @IsString()
  @MinLength(1)
  destination!: string;

  @IsString()
  @MinLength(1)
  body!: string;

  @IsEnum(MessageEncoding)
  encoding!: MessageEncoding;
}