import {
  MessageEncoding,
  MessageRouteAttemptStatus,
  MessageStatus,
  RouteStatus,
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

  statusEvents!: {
    id: string;
    messageId: string;
    attemptId: string | null;
    status: MessageStatus;
    source: string;
    description: string | null;
    rawData: unknown;
    createdAt: Date;
  }[];

  routeAttempts!: {
    id: string;
    attemptNumber: number;
    priority: number;
    status: MessageRouteAttemptStatus;

    route: {
      id: string;
      publicId: string;

      mobileNetwork: {
        id: string;
        name: string;
      };

      connectorId: string;
      status: RouteStatus;
    };

    connector: {
      id: string;
      publicId: string;
    };

    providerMessageId: string | null;
    errorCode: string | null;
    errorMessage: string | null;

    dispatchedAt: Date | null;
    startedAt: Date | null;
    submittedAt: Date | null;
    failedAt: Date | null;
    completedAt: Date | null;

    createdAt: Date;
    updatedAt: Date;

    statusEvents: {
      id: string;
      messageId: string;
      attemptId: string | null;
      status: MessageStatus;
      source: string;
      description: string | null;
      rawData: unknown;
      createdAt: Date;
    }[];
  }[];
}