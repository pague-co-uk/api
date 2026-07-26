import { Injectable } from "@nestjs/common";
import {
  ApiKey,
  ApiKeyStatus,
  AuthenticationEventType,
} from "@prisma/client";

import { ClockService } from "src/common/clock.service.js";
import { RandomGenerator } from "src/common/random.service.js";
import { SecretHasher } from "src/common/secretHasher.service.js";

import { InvalidApiKeyException } from "src/exceptions/invalid-apikey.exception.js";

import { withSpan } from "@pague-co-uk/sms-gateway-telemetry";
import { CreateApiKeyRequest } from "../dto/create-apikey-request.js";
import { CreateApiKeyResponse } from "../dto/create-apikey-response.js";
import { ParsedApiKey } from "../dto/parsed-apikey.js";
import { ValidatedApiKey } from "../dto/validate-apikey.js";
import { ApiKeyRepository } from "../repositories/ApiKeyRepository.js";
import { AuthenticationEventRepository } from "../repositories/AuthenticationEventRepository.js";

@Injectable()
export class ApiKeyService {
  constructor(
    private readonly hasher: SecretHasher,
    private readonly random: RandomGenerator,
    private readonly clock: ClockService,
    private readonly apiKeys: ApiKeyRepository,
    private readonly authenticationEvents: AuthenticationEventRepository,
  ) { }


  async create(
    request: CreateApiKeyRequest,
  ): Promise<CreateApiKeyResponse> {
    return withSpan(
      "ApiKeyService.create",
      async (span) => {
        const publicId =
          this.generatePublicId();

        const prefix =
          this.generatePrefix();

        const secret =
          this.generateSecret();

        const apiKey =
          this.buildApiKey(
            prefix,
            secret,
          );

        const secretHash =
          await this.hashSecret(
            secret,
          );

        const created =
          await this.apiKeys.withTransaction(
            async (apiKeys) => {
              const created =
                await apiKeys.create({
                  publicId,
                  client: {
                    connect: {
                      id: request.clientId
                    }
                  },
                  name:
                    request.name,
                  prefix,
                  secretHash,
                  status:
                    ApiKeyStatus.ACTIVE,
                  expiresAt:
                    request.expiresAt,
                });

              await this.authenticationEvents
                .withTransaction(
                  apiKeys,
                )
                .record({
                  type:
                    AuthenticationEventType.API_KEY_CREATED,
                  clientId:
                    request.clientId,
                  userId:
                    request.createdByUserId,
                  ipAddress:
                    request.ipAddress,
                  userAgent:
                    request.userAgent,
                  metadata: {
                    apiKeyId:
                      created.id,
                    publicId:
                      created.publicId,
                    prefix,
                  },
                });

              return created;
            },
          );

        this.apiKeysCreatedCounter.add(
          1,
          {
            client_id:
              request.clientId,
          },
        );

        span.setAttributes({
          "api_key.id":
            created.id,
          "api_key.public_id":
            created.publicId,
          "client.id":
            request.clientId,
        });

        this.logger.info(
          {
            apiKeyId:
              created.id,
            publicId:
              created.publicId,
            clientId:
              request.clientId,
            prefix,
          },
          "API key created.",
        );

        return {
          apiKeyId:
            created.id,
          publicId:
            created.publicId,
          apiKey,
          prefix,
          expiresAt:
            created.expiresAt,
        };
      },
    );
  }
  private generateSecret(): string {
    return this.random
      .bytes(32)
      .toString("base64url");
  }

  private generatePrefix(): string {
    return this.random
      .bytes(8)
      .toString("hex");
  }

  private generatePublicId(): string {
    return this.random
      .bytes(10)
      .toString("base64url");
  }

  private buildApiKey(
    prefix: string,
    secret: string,
  ): string {
    return `pk_live_${prefix}.${secret}`;
  }

  private parseApiKey(
    apiKey: string,
  ): ParsedApiKey {
    const parts = apiKey.split(".");

    if (parts.length !== 2) {
      throw new InvalidApiKeyException();
    }

    const [identifier, secret] = parts;

    const prefix = identifier.replace(
      /^pk_(live|test)_/,
      "",
    );

    if (!prefix || !secret) {
      throw new InvalidApiKeyException();
    }

    return {
      prefix,
      secret,
    };
  }

  private hashSecret(
    secret: string,
  ): string {
    return this.hasher.hash(secret);
  }

  private ensureUsable(
    apiKey: ApiKey | null,
  ): ApiKey {
    if (!apiKey) {
      throw new InvalidApiKeyException(
        "API key not found.",
      );
    }

    if (
      apiKey.status !==
      ApiKeyStatus.ACTIVE
    ) {
      throw new InvalidApiKeyException(
        "API key is inactive.",
      );
    }

    if (apiKey.revokedAt) {
      throw new InvalidApiKeyException(
        "API key has been revoked.",
      );
    }

    if (
      apiKey.expiresAt &&
      apiKey.expiresAt <=
      this.clock.now()
    ) {
      throw new InvalidApiKeyException(
        "API key has expired.",
      );
    }

    return apiKey;
  }

  private toValidatedApiKey(
    apiKey: ApiKey,
  ): ValidatedApiKey {
    return {
      id: apiKey.id,
      publicId: apiKey.publicId,
      clientId: apiKey.clientId,
      name: apiKey.name,
      status: apiKey.status,
      expiresAt: apiKey.expiresAt,
      lastUsedAt: apiKey.lastUsedAt,
    };
  }

  private async verifySecret(
    secret: string,
    apiKey: ApiKey,
  ): Promise<void> {
    const secretHash =
      await this.hashSecret(secret);

    if (secretHash !== apiKey.secretHash) {
      throw new InvalidApiKeyException(
        "Invalid API key.",
      );
    }
  }
}