import {
  MessageEncoding,
  MessageStatus,
} from "@prisma/client";

export class MessageResponseDto {
  id!: string;

  publicId!: string;

  clientId!: string;

  client!: {
    id: string;
    publicId: string;
    companyName: string;
    displayName: string;
  };

  senderIdId!: string | null;

  senderId!: {
    id: string;
    publicId: string;
    sender: string;
  } | null;

  destination!: string;

  body!: string;

  encoding!: MessageEncoding;

  segmentCount!: number;

  currentStatus!: MessageStatus;

  submittedAt!: Date;

  createdAt!: Date;

  updatedAt!: Date;
}