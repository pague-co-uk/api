import { Injectable } from "@nestjs/common";
import { ApiKey } from "@prisma/client";

import { ApiKeyResponseDto } from "./dto/api-key.response.dto.js";

@Injectable()
export class ApiKeyMapper {
  toResponse(
    apiKey: ApiKey,
  ): ApiKeyResponseDto {
    return {
      id: apiKey.id,
      publicId: apiKey.publicId,
      clientId: apiKey.clientId,
      name: apiKey.name,
      prefix: apiKey.prefix,
      status: apiKey.status,
      lastUsedAt: apiKey.lastUsedAt,
      expiresAt: apiKey.expiresAt,
      revokedAt: apiKey.revokedAt,
      createdAt: apiKey.createdAt,
      updatedAt: apiKey.updatedAt,
    };
  }

  toResponses(
    apiKeys: readonly ApiKey[],
  ): ApiKeyResponseDto[] {
    return apiKeys.map(
      (apiKey) =>
        this.toResponse(apiKey),
    );
  }
}