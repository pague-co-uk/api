import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from "class-validator";

import {
  MessageEncoding,
  MessageStatus,
} from "@prisma/client";

export class FindMessagesDto {
  /** Inclusive date/time. Date-only values use Africa/Blantyre midnight. */
  @IsOptional()
  @IsDateString({ strict: true })
  createdFrom?: string;

  /** Date-only values include that whole day; timestamp values are exclusive. */
  @IsOptional()
  @IsDateString({ strict: true })
  createdTo?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  destination?: string;

  @IsOptional()
  @IsUUID()
  senderIdId?: string;

  @IsOptional()
  @IsEnum(MessageStatus)
  status?: MessageStatus;

  @IsOptional()
  @IsEnum(MessageEncoding)
  encoding?: MessageEncoding;

  @IsOptional()
  @IsDateString()
  submittedFrom?: string;

  @IsOptional()
  @IsDateString()
  submittedTo?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;
}