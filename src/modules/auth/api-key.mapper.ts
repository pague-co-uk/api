import { Injectable } from "@nestjs/common";

import type { ApiKey } from "@prisma/client";

import {
  ApiKeyResponseDto,
} from "./dto/api-key.response.dto.js";

// ============================================================================
// Types
// ============================================================================

export type ApiKeyWithClient =
  ApiKey & {
    client: {
      id: string;
      publicId: string;
      companyName: string;
      displayName: string;
    };
  };

export type ApiKeyWithOptionalClient =
  ApiKey & {
    client?: {
      id: string;
      publicId: string;
      companyName: string;
      displayName: string;
    };
  };

// ============================================================================
// Mapper
// ============================================================================

@Injectable()
export class ApiKeyMapper {

  toResponse(
    apiKey: ApiKeyWithOptionalClient,
  ): ApiKeyResponseDto {

    return {
      id: apiKey.id,

      publicId:
        apiKey.publicId,

      clientId:
        apiKey.clientId,

      ...(apiKey.client
        ? {
          client: {
            id:
              apiKey.client.id,

            publicId:
              apiKey.client.publicId,

            companyName:
              apiKey.client.companyName,

            displayName:
              apiKey.client.displayName,
          },
        }
        : {}),

      name:
        apiKey.name,

      prefix:
        apiKey.prefix,

      status:
        apiKey.status,

      lastUsedAt:
        apiKey.lastUsedAt,

      expiresAt:
        apiKey.expiresAt,

      revokedAt:
        apiKey.revokedAt,

      createdAt:
        apiKey.createdAt,

      updatedAt:
        apiKey.updatedAt,
    };
  }

  toResponses(
    apiKeys: readonly ApiKeyWithOptionalClient[],
  ): ApiKeyResponseDto[] {

    return apiKeys.map(
      (apiKey) =>
        this.toResponse(apiKey),
    );
  }
}