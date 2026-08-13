import { Injectable } from "@nestjs/common";
import type { SenderId } from "@prisma/client";

import { SenderIdResponseDto } from "./dto/sender-id.response.dto.js";

@Injectable()
export class SenderIdMapper {
  toResponse(
    senderId: SenderId,
  ): SenderIdResponseDto {
    return {
      id: senderId.id,
      publicId: senderId.publicId,
      clientId: senderId.clientId,
      sender: senderId.sender,
      status: senderId.status,
      isDefault: senderId.isDefault,
      createdAt: senderId.createdAt,
      updatedAt: senderId.updatedAt,
    };
  }

  toResponses(
    senderIds: readonly SenderId[],
  ): SenderIdResponseDto[] {
    return senderIds.map(
      (senderId) =>
        this.toResponse(senderId),
    );
  }
}