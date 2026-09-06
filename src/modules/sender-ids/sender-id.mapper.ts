import { Injectable } from "@nestjs/common";

import type { SenderId } from "@prisma/client";

import { SenderIdResponseDto } from "./dto/sender-id.response.dto.js";

type SenderIdWithClient = SenderId & {
  client: {
    id: string;
    companyName: string;
    displayName: string;
  };
};

@Injectable()
export class SenderIdMapper {

  toResponse(
    senderId: SenderIdWithClient,
  ): SenderIdResponseDto {

    return {

      id: senderId.id,

      publicId: senderId.publicId,

      clientId: senderId.clientId,

      client: {

        id: senderId.client.id,

        companyName:
          senderId.client.companyName,

        displayName:
          senderId.client.displayName,

      },

      sender: senderId.sender,

      status: senderId.status,

      isDefault: senderId.isDefault,

      createdAt: senderId.createdAt,

      updatedAt: senderId.updatedAt,

    };

  }

  toResponses(
    senderIds: readonly SenderIdWithClient[],
  ): SenderIdResponseDto[] {

    return senderIds.map(
      (senderId) =>
        this.toResponse(senderId),
    );

  }

}