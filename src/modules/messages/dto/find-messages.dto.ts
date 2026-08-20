import {
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from "class-validator";

import { MessageStatus } from "@prisma/client";

export class FindMessagesDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @IsEnum(MessageStatus)
  status?: MessageStatus;
}