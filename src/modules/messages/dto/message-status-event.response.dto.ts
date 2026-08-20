import { MessageStatus } from "@prisma/client";

export class MessageStatusEventResponseDto {
  id!: string;

  messageId!: string;
  attemptId!: string | null;

  status!: MessageStatus;

  source!: string;
  description!: string | null;

  rawData!: unknown;

  createdAt!: Date;
}