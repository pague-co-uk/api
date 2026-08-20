import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength
} from "class-validator";

import {
  MessageEncoding,
} from "@prisma/client";

export class CreateMessageDto {
  @IsOptional()
  @IsUUID()
  senderIdId?: string;

  @IsString()
  @MinLength(1)
  destination!: string;

  @IsString()
  @MinLength(1)
  body!: string;

  @IsEnum(MessageEncoding)
  encoding!: MessageEncoding;
}