import { MessageEncoding, MessageStatus } from "@prisma/client";

export class MessageResponseDto {
  id!: string;
  publicId!: string;

  clientId!: string;
  senderIdId!: string | null;

  destination!: string;
  body!: string;

  encoding!: MessageEncoding;
  segmentCount!: number;

  currentStatus!: MessageStatus;

  submittedAt!: Date;
  createdAt!: Date;
  updatedAt!: Date;
}