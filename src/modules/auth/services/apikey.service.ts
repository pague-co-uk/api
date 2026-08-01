import { Injectable } from "@nestjs/common";
import {
  ApiKey,
  ApiKeyStatus,
  AuthenticationMethod,
} from "@prisma/client";

import { ClockService } from "src/common/services/clock.service.js";
import { RandomGenerator } from "src/common/services/random.service.js";
import { SecretHasher } from "src/common/services/secretHasher.service.js";

import { InvalidApiKeyException } from "src/exceptions/auth/invalid-apikey.exception.js";

import { getComponentLogger, getMeter, recordException, withSpan } from "@pague-co-uk/sms-gateway-telemetry";
import { ApiKeyRepository } from "../repositories/ApiKeyRepository.js";
import { AuthenticationEventService } from "./authentication-event.service.js";

@Injectable()
export class ApiKeyService {

  private readonly logger =
    getComponentLogger(
      ApiKeyService.name,
    );

  constructor(
    private readonly hasher: SecretHasher,
    private readonly random: RandomGenerator,
    private readonly clock: ClockService,
    private readonly apiKeys: ApiKeyRepository,
    private readonly authenticationEvents: AuthenticationEventService,
  ) { }

  async create(
    clientId: string,
    name: string,
    createdByUserId: string,
    authenticationMethod: AuthenticationMethod,
    expiresAt?: Date | null,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<{
    apiKeyId: string;
    publicId: string;
    apiKey: string;
    prefix: string;
    expiresAt: Date | null;
  }> {
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
          this.hashSecret(secret);

        const created =
          await this.apiKeys.withTransaction(
            async (tx) => {
              const apiKeys =
                this.apiKeys.withDatabase(tx);

              const events =
                this.authenticationEvents.withDatabase(
                  tx,
                );

              const created =
                await apiKeys.create({
                  publicId,
                  client: {
                    connect: {
                      id: clientId,
                    },
                  },
                  name:
                    name,
                  prefix,
                  secretHash,
                  status:
                    ApiKeyStatus.ACTIVE,
                  expiresAt:
                    expiresAt,
                });

              await events.recordApiKeyCreated(
                clientId,
                createdByUserId,
                ipAddress,
                userAgent,
                authenticationMethod,
              );

              return created;
            },
          );

        span.setAttributes({
          "api_key.id":
            created.id,
          "api_key.public_id":
            created.publicId,
          "api_key.prefix":
            created.prefix,
          "client.id":
            clientId,
        });

        this.logger.info(
          {
            apiKeyId:
              created.id,
            publicId:
              created.publicId,
            clientId:
              clientId,
            prefix:
              created.prefix,
          },
          "API key created.",
        );

        return {
          apiKeyId:
            created.id,
          publicId:
            created.publicId,
          apiKey,
          prefix:
            created.prefix,
          expiresAt:
            created.expiresAt,
        };
      },
    );
  }

  async validate(
    apiKey: string,
  ): Promise<{
    id: string;
    publicId: string;
    clientId: string;
    name: string;
    status: ApiKeyStatus;
    expiresAt: Date | null;
    lastUsedAt: Date | null;
  }> {
    return withSpan(
      "ApiKeyService.validate",
      async (span) => {
        const parsed =
          this.parseApiKey(apiKey);

        span.setAttribute(
          "api_key.prefix",
          parsed.prefix,
        );

        this.logger.debug(
          {
            prefix:
              parsed.prefix,
          },
          "Validating API key.",
        );

        try {
          const validated =
            await this.apiKeys.withTransaction(
              async (tx) => {
                const apiKeys =
                  this.apiKeys.withDatabase(tx);

                const key =
                  this.ensureUsable(
                    await apiKeys.findByPrefix(
                      parsed.prefix,
                    ),
                  );

                await this.verifySecret(
                  parsed.secret,
                  key,
                );

                const updated =
                  await apiKeys.updateLastUsed(
                    key.id,
                    this.clock.now(),
                  );

                return updated;
              },
            );

          this.apiKeysValidatedCounter.add(
            1,
            {
              client_id:
                validated.clientId,
            },
          );

          span.setAttributes({
            "api_key.id":
              validated.id,
            "api_key.public_id":
              validated.publicId,
            "client.id":
              validated.clientId,
          });

          this.logger.info(
            {
              apiKeyId:
                validated.id,
              publicId:
                validated.publicId,
              clientId:
                validated.clientId,
            },
            "API key validated.",
          );

          return this.toValidatedApiKey(
            validated,
          );
        } catch (error) {
          recordException(error);

          this.logger.warn(
            {
              error,
              prefix:
                parsed.prefix,
            },
            "API key validation failed.",
          );

          throw error;
        }
      },
    );
  }

  async rotate(
    apiKey: string,
    clientId: string,
    userId: string,
    authenticationMethod: AuthenticationMethod,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<{
    apiKeyId: string;
    publicId: string;
    apiKey: string;
    prefix: string;
    expiresAt: Date | null;
  }> {
    return withSpan(
      "ApiKeyService.rotate",
      async (span) => {
        const parsed =
          this.parseApiKey(
            apiKey,
          );

        span.setAttribute(
          "api_key.prefix",
          parsed.prefix,
        );

        this.logger.debug(
          {
            prefix:
              parsed.prefix,
            clientId:
              clientId,
          },
          "Rotating API key.",
        );

        try {
          const newSecret =
            this.generateSecret();

          const newSecretHash =
            this.hashSecret(
              newSecret,
            );

          const {
            previousApiKey,
            rotatedApiKey,
          } =
            await this.apiKeys.withTransaction(
              async (tx) => {
                const apiKeys =
                  this.apiKeys.withDatabase(
                    tx,
                  );

                const events =
                  this.authenticationEvents.withDatabase(
                    tx,
                  );

                const current =
                  this.ensureUsable(
                    await apiKeys.findByPrefix(
                      parsed.prefix,
                    ),
                  );

                await this.verifySecret(
                  parsed.secret,
                  current,
                );

                const rotated =
                  await apiKeys.updateSecret(
                    current.id,
                    newSecretHash,
                    this.clock.now(),
                  );

                await events.recordApiKeyRotated(
                  clientId,
                  userId,
                  authenticationMethod,
                  ipAddress,
                  userAgent,
                );

                return {
                  previousApiKey:
                    current,
                  rotatedApiKey:
                    rotated,
                };
              },
            );

          const apiKey =
            this.buildApiKey(
              rotatedApiKey.prefix,
              newSecret,
            );

          this.apiKeysRotatedCounter.add(
            1,
            {
              client_id:
                rotatedApiKey.clientId,
            },
          );

          span.setAttributes({
            "api_key.id":
              rotatedApiKey.id,
            "api_key.public_id":
              rotatedApiKey.publicId,
            "client.id":
              rotatedApiKey.clientId,
          });

          span.addEvent(
            "api_key.rotated",
            {
              "api_key.id":
                rotatedApiKey.id,
              "api_key.public_id":
                rotatedApiKey.publicId,
            },
          );

          this.logger.info(
            {
              apiKeyId:
                rotatedApiKey.id,
              publicId:
                rotatedApiKey.publicId,
              clientId:
                rotatedApiKey.clientId,
              prefix:
                rotatedApiKey.prefix,
            },
            "API key rotated.",
          );

          return {
            apiKeyId:
              rotatedApiKey.id,
            publicId:
              rotatedApiKey.publicId,
            apiKey,
            prefix:
              rotatedApiKey.prefix,
            expiresAt:
              rotatedApiKey.expiresAt,
          };
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              error,
              prefix:
                parsed.prefix,
            },
            "Failed to rotate API key.",
          );

          throw error;
        }
      },
    );
  }

  async revoke(
    apiKey: string,
    clientId: string,
    userId: string,
    authenticationMethod: AuthenticationMethod,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<void> {
    return withSpan(
      "ApiKeyService.revoke",
      async (span) => {
        const parsed =
          this.parseApiKey(
            apiKey,
          );

        span.setAttribute(
          "api_key.prefix",
          parsed.prefix,
        );

        this.logger.debug(
          {
            prefix:
              parsed.prefix,
            clientId:
              clientId,
          },
          "Revoking API key.",
        );

        try {
          const revoked =
            await this.apiKeys.withTransaction(
              async (tx) => {
                const apiKeys =
                  this.apiKeys.withDatabase(tx);

                const events =
                  this.authenticationEvents.withDatabase(
                    tx,
                  );

                const current =
                  this.ensureUsable(
                    await apiKeys.findByPrefix(
                      parsed.prefix,
                    ),
                  );

                await this.verifySecret(
                  parsed.secret,
                  current,
                );

                const revoked =
                  await apiKeys.revoke(
                    current.id,
                    this.clock.now(),
                  );

                await events.recordApiKeyRevoked(
                  clientId,
                  userId,
                  authenticationMethod,
                  ipAddress,
                  userAgent,
                );

                return revoked;
              },
            );

          span.setAttributes({
            "api_key.id":
              revoked.id,
            "api_key.public_id":
              revoked.publicId,
            "client.id":
              revoked.clientId,
          });

          span.addEvent(
            "api_key.revoked",
            {
              "api_key.id":
                revoked.id,
              "api_key.public_id":
                revoked.publicId,
            },
          );

          this.logger.info(
            {
              apiKeyId:
                revoked.id,
              publicId:
                revoked.publicId,
              clientId:
                revoked.clientId,
              prefix:
                revoked.prefix,
            },
            "API key revoked.",
          );
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              error,
              prefix:
                parsed.prefix,
            },
            "Failed to revoke API key.",
          );

          throw error;
        }
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
  ): { prefix: string; secret: string } {
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

  private readonly apiKeysValidatedCounter =
    getMeter().createCounter(
      "auth.api_key.validated",
      {
        description:
          "Number of successfully validated API keys.",
      },
    );

  private readonly apiKeysRotatedCounter =
    getMeter().createCounter(
      "auth.api_key.rotated",
      {
        description:
          "Number of rotated API keys.",
      },
    );
  private toValidatedApiKey(
    apiKey: ApiKey,
  ): {
    id: string;
    publicId: string;
    clientId: string;
    name: string;
    status: ApiKeyStatus;
    expiresAt: Date | null;
    lastUsedAt: Date | null;
  } {
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
