import { Injectable } from "@nestjs/common";
import {
  ApiKey,
  ApiKeyStatus,
  AuthenticationMethod,
} from "@prisma/client";

import {
  createCounterMetric,
  getComponentLogger,
  recordException,
  withSpan,
} from "@pague-co-uk/sms-gateway-telemetry";

import { ClockService } from "../../../common/services/clock.service.js";
import { RandomGenerator } from "../../../common/services/random.service.js";
import { SecretHasher } from "../../../common/services/secretHasher.service.js";

import type { Page } from "../../../common/query/page.interface.js";

import { InvalidApiKeyException } from "../../../exceptions/auth/invalid-apikey.exception.js";

import { ApiKeyCapabilityDefinitions } from "../../../common/authorization/permissions/api-key-capabilities.definitions.js";
import { ApiKeyCapability } from "../../../common/authorization/permissions/api-key-capabilities.registry.js";

import { ApiKeyCapabilityRepository } from "../../../repositories/ApiKeyCapabilityRepository.js";
import { ApiKeyRepository } from "../../../repositories/ApiKeyRepository.js";

import { AuthenticationEventService } from "./authentication-event.service.js";

@Injectable()
export class ApiKeyService {
  private readonly logger =
    getComponentLogger(ApiKeyService.name);

  constructor(
    private readonly hasher: SecretHasher,
    private readonly random: RandomGenerator,
    private readonly clock: ClockService,
    private readonly apiKeys: ApiKeyRepository,
    private readonly authenticationEvents: AuthenticationEventService,
    private readonly apiKeyCapabilities: ApiKeyCapabilityRepository,
  ) { }

  async create(
    clientId: string,
    name: string,
    capabilities: readonly ApiKeyCapability[],
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
        const uniqueCapabilities =
          new Set(capabilities);

        if (
          uniqueCapabilities.size !==
          capabilities.length
        ) {
          throw new InvalidApiKeyException(
            "Duplicate API key capabilities are not allowed.",
          );
        }

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

        try {
          const created =
            await this.apiKeys.withTransaction(
              async (tx) => {
                const apiKeys =
                  this.apiKeys.withDatabase(tx);

                const capabilityRepository =
                  this.apiKeyCapabilities.withDatabase(
                    tx,
                  );

                const events =
                  this.authenticationEvents.withDatabase(
                    tx,
                  );

                const capabilityRecords =
                  await capabilityRepository.findByNames(
                    capabilities,
                  );

                if (
                  capabilityRecords.length !==
                  capabilities.length
                ) {
                  const found =
                    new Set(
                      capabilityRecords.map(
                        ({ name }) => name,
                      ),
                    );

                  const missing =
                    capabilities.filter(
                      (capability) =>
                        !found.has(capability),
                    );

                  throw new InvalidApiKeyException(
                    `Unknown API key capability: ${missing.join(", ")}`,
                  );
                }

                const created =
                  await apiKeys.create({
                    publicId,
                    client: {
                      connect: {
                        id: clientId,
                      },
                    },
                    name,
                    prefix,
                    secretHash,
                    status:
                      ApiKeyStatus.ACTIVE,
                    expiresAt,
                  });

                await apiKeys.createCapabilities(
                  created.id,
                  capabilityRecords.map(
                    ({ id }) => id,
                  ),
                );

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
            "api_key.id": created.id,
            "api_key.public_id": created.publicId,
            "api_key.prefix": created.prefix,
            "client.id": clientId,
            "api_key.capability_count":
              capabilities.length,
          });

          this.logger.info(
            {
              apiKeyId: created.id,
              publicId: created.publicId,
              clientId,
              prefix: created.prefix,
              capabilityCount:
                capabilities.length,
            },
            "API key created.",
          );

          return {
            apiKeyId: created.id,
            publicId: created.publicId,
            apiKey,
            prefix: created.prefix,
            expiresAt: created.expiresAt,
          };
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              clientId,
              capabilityCount:
                capabilities.length,
            },
            "Failed to create API key.",
          );

          throw error;
        }
      },
    );
  }

  async listPlatform(
    options: {
      readonly page: number;
      readonly pageSize: number;
      readonly clientId?: string;
      readonly status?: ApiKeyStatus;
      readonly search?: string;
    },
  ): Promise<
    Page<
      ApiKey & {
        client: {
          id: string;
          publicId: string;
          companyName: string;
          displayName: string;
        };
      }
    >
  > {
    return withSpan(
      "ApiKeyService.listPlatform",
      async (span) => {
        span.setAttributes({
          "pagination.page":
            options.page,
          "pagination.page_size":
            options.pageSize,
        });

        if (
          options.clientId !==
          undefined
        ) {
          span.setAttribute(
            "client.id",
            options.clientId,
          );
        }

        if (
          options.status !==
          undefined
        ) {
          span.setAttribute(
            "api_key.filter.status",
            options.status,
          );
        }

        if (
          options.search !==
          undefined &&
          options.search.trim()
        ) {
          span.setAttribute(
            "api_key.filter.search",
            options.search.trim(),
          );
        }

        this.logger.debug(
          {
            page:
              options.page,
            pageSize:
              options.pageSize,
            clientId:
              options.clientId,
            status:
              options.status,
            search:
              options.search,
          },
          "Retrieving platform API keys.",
        );

        try {
          const page =
            await this.apiKeys
              .findManyPlatform(
                options,
              );

          span.setAttributes({
            "api_key.count":
              page.items.length,
            "api_key.total":
              page.totalItems,
          });

          this.logger.debug(
            {
              count:
                page.items.length,
              total:
                page.totalItems,
              page:
                page.page,
              pageSize:
                page.pageSize,
              clientId:
                options.clientId,
              status:
                options.status,
            },
            "Platform API keys retrieved successfully.",
          );

          return page;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              page:
                options.page,
              pageSize:
                options.pageSize,
              clientId:
                options.clientId,
              status:
                options.status,
              search:
                options.search,
            },
            "Failed to retrieve platform API keys.",
          );

          throw error;
        }
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
    capabilities: readonly string[];
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
            prefix: parsed.prefix,
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
                    await apiKeys.findByPrefixWithCapabilities(
                      parsed.prefix,
                    ),
                  );

                this.verifySecret(
                  parsed.secret,
                  key,
                );

                const capabilities =
                  key.capabilities.map(
                    ({ capability }) =>
                      capability.name,
                  );

                const updated =
                  await apiKeys.updateLastUsed(
                    key.id,
                    this.clock.now(),
                  );

                return {
                  ...updated,
                  capabilities,
                };
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
            "api_key.id": validated.id,
            "api_key.public_id":
              validated.publicId,
            "client.id":
              validated.clientId,
            "api_key.capability_count":
              validated.capabilities.length,
          });

          this.logger.info(
            {
              apiKeyId: validated.id,
              publicId:
                validated.publicId,
              clientId:
                validated.clientId,
              capabilityCount:
                validated.capabilities.length,
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
              err: error,
              prefix: parsed.prefix,
            },
            "API key validation failed.",
          );

          throw error;
        }
      },
    );
  }

  async list(
    clientId: string,
    options: {
      readonly page: number;
      readonly pageSize: number;
      readonly status?: ApiKeyStatus;
    },
  ): Promise<Page<ApiKey>> {
    return withSpan(
      "ApiKeyService.list",
      async (span) => {
        span.setAttributes({
          "client.id": clientId,
          "pagination.page":
            options.page,
          "pagination.page_size":
            options.pageSize,
        });

        if (options.status !== undefined) {
          span.setAttribute(
            "api_key.filter.status",
            options.status,
          );
        }

        this.logger.debug(
          {
            clientId,
            page: options.page,
            pageSize: options.pageSize,
            status: options.status,
          },
          "Retrieving client API keys.",
        );

        try {
          const page =
            await this.apiKeys.findByClient(
              clientId,
              options,
            );

          span.setAttributes({
            "api_key.count":
              page.items.length,
            "api_key.total":
              page.totalItems,
          });

          this.logger.debug(
            {
              clientId,
              count: page.items.length,
              total: page.totalItems,
              page: page.page,
              pageSize: page.pageSize,
            },
            "Client API keys retrieved successfully.",
          );

          return page;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              clientId,
              page: options.page,
              pageSize:
                options.pageSize,
              status:
                options.status,
            },
            "Failed to retrieve client API keys.",
          );

          throw error;
        }
      },
    );
  }

  async revokeById(
    id: string,
    clientId: string,
    userId: string,
    authenticationMethod: AuthenticationMethod,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<void> {
    return withSpan(
      "ApiKeyService.revokeById",
      async (span) => {
        span.setAttributes({
          "api_key.id": id,
          "client.id": clientId,
        });

        try {
          const apiKey =
            await this.apiKeys.findById(id);

          if (
            !apiKey ||
            apiKey.clientId !== clientId
          ) {
            throw new InvalidApiKeyException(
              "API key not found.",
            );
          }

          if (
            apiKey.status !==
            ApiKeyStatus.ACTIVE ||
            (
              apiKey.expiresAt &&
              apiKey.expiresAt <=
              this.clock.now()
            )
          ) {
            throw new InvalidApiKeyException(
              "API key is not active.",
            );
          }

          await this.apiKeys.revoke(
            id,
            this.clock.now(),
          );

          await this.authenticationEvents
            .recordApiKeyRevoked(
              clientId,
              userId,
              authenticationMethod,
              ipAddress,
              userAgent,
            );

          span.addEvent(
            "api_key.revoked",
            {
              "api_key.id": id,
              "client.id": clientId,
            },
          );

          this.logger.info(
            {
              apiKeyId: id,
              clientId,
            },
            "API key revoked.",
          );
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              apiKeyId: id,
              clientId,
            },
            "Failed to revoke API key.",
          );

          throw error;
        }
      },
    );
  }

  // ==========================================================================
  // Find by ID
  // ==========================================================================

  async findById(
    id: string,
    clientId: string,
  ): Promise<ApiKey | null> {
    return withSpan(
      "ApiKeyService.findById",
      async (span) => {
        span.setAttributes({
          "api_key.id": id,
          "client.id": clientId,
        });

        this.logger.debug(
          {
            apiKeyId: id,
            clientId,
          },
          "Retrieving API key.",
        );

        try {
          const apiKey =
            await this.apiKeys.findById(
              id,
            );

          if (
            !apiKey ||
            apiKey.clientId !==
            clientId
          ) {
            this.logger.debug(
              {
                apiKeyId: id,
                clientId,
              },
              "API key not found for client.",
            );

            return null;
          }

          span.setAttributes({
            "api_key.public_id":
              apiKey.publicId,
            "api_key.prefix":
              apiKey.prefix,
            "api_key.status":
              apiKey.status,
          });

          this.logger.debug(
            {
              apiKeyId:
                apiKey.id,
              publicId:
                apiKey.publicId,
              clientId:
                apiKey.clientId,
              status:
                apiKey.status,
            },
            "API key retrieved successfully.",
          );

          return apiKey;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              apiKeyId: id,
              clientId,
            },
            "Failed to retrieve API key.",
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
          this.parseApiKey(apiKey);

        span.setAttribute(
          "api_key.prefix",
          parsed.prefix,
        );

        this.logger.debug(
          {
            prefix: parsed.prefix,
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

                if (
                  current.clientId !==
                  clientId
                ) {
                  throw new InvalidApiKeyException(
                    "API key not found.",
                  );
                }

                this.verifySecret(
                  parsed.secret,
                  current,
                );

                const rotated =
                  await apiKeys.updateSecret(
                    current.id,
                    newSecretHash,
                  );

                await events.recordApiKeyRotated(
                  clientId,
                  userId,
                  authenticationMethod,
                  ipAddress,
                  userAgent,
                );

                return {
                  rotatedApiKey:
                    rotated,
                };
              },
            );

          const generatedApiKey =
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
            apiKey:
              generatedApiKey,
            prefix:
              rotatedApiKey.prefix,
            expiresAt:
              rotatedApiKey.expiresAt,
          };
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              prefix: parsed.prefix,
              clientId,
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
  ): Promise<ApiKey> {
    return withSpan(
      "ApiKeyService.revoke",
      async (span) => {
        const parsed =
          this.parseApiKey(apiKey);

        span.setAttribute(
          "api_key.prefix",
          parsed.prefix,
        );

        this.logger.debug(
          {
            prefix: parsed.prefix,
            clientId,
          },
          "Revoking API key.",
        );

        try {
          const revoked =
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

                if (
                  current.clientId !==
                  clientId
                ) {
                  throw new InvalidApiKeyException(
                    "API key not found.",
                  );
                }

                this.verifySecret(
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

          return revoked;
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
              prefix: parsed.prefix,
              clientId,
            },
            "Failed to revoke API key.",
          );

          throw error;
        }
      },
    );
  }

  async synchronizeRegistry(): Promise<void> {
    return withSpan(
      "ApiKeyCapabilityService.synchronizeRegistry",
      async (span) => {
        const capabilityCount =
          Object.keys(
            ApiKeyCapabilityDefinitions,
          ).length;

        this.logger.info(
          {
            capabilityCount,
          },
          "Synchronizing API key capability registry.",
        );

        span.setAttribute(
          "api_key_capabilities.registry.count",
          capabilityCount,
        );

        try {
          for (const [
            name,
            definition,
          ] of Object.entries(
            ApiKeyCapabilityDefinitions,
          )) {
            await this.apiKeyCapabilities.upsert({
              where: {
                name,
              },
              create: {
                name,
                module:
                  definition.module,
                description:
                  definition.description,
              },
              update: {
                module:
                  definition.module,
                description:
                  definition.description,
              },
            });
          }

          this.capabilitiesSynchronizedCounter.add(
            1,
          );

          span.addEvent(
            "api_key_capabilities.registry.synchronized",
            {
              "api_key_capabilities.count":
                capabilityCount,
            },
          );

          this.logger.info(
            {
              capabilityCount,
            },
            "API key capability registry synchronized successfully.",
          );
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              err: error,
            },
            "Failed to synchronize API key capability registry.",
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
  ): {
    prefix: string;
    secret: string;
  } {
    const parts = apiKey.split(".");

    if (parts.length !== 2) {
      throw new InvalidApiKeyException();
    }

    const [identifier, secret] =
      parts;

    const prefix =
      identifier.replace(
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

  private ensureUsable<
    T extends ApiKey,
  >(
    apiKey: T | null,
  ): T {
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

  private readonly capabilitiesSynchronizedCounter =
    createCounterMetric({
      name:
        "auth.api_key_capabilities.registry.synchronized",
      description:
        "Number of successful API key capability registry synchronizations.",
    });

  private readonly apiKeysValidatedCounter =
    createCounterMetric({
      name:
        "auth.api_key.validated",
      description:
        "Number of successfully validated API keys.",
    });

  private readonly apiKeysRotatedCounter =
    createCounterMetric({
      name:
        "auth.api_key.rotated",
      description:
        "Number of rotated API keys.",
    });

  private toValidatedApiKey(
    apiKey: ApiKey & {
      capabilities: readonly string[];
    },
  ): {
    id: string;
    publicId: string;
    clientId: string;
    name: string;
    status: ApiKeyStatus;
    expiresAt: Date | null;
    lastUsedAt: Date | null;
    capabilities: readonly string[];
  } {
    return {
      id: apiKey.id,
      publicId: apiKey.publicId,
      clientId: apiKey.clientId,
      name: apiKey.name,
      status: apiKey.status,
      expiresAt:
        apiKey.expiresAt,
      lastUsedAt:
        apiKey.lastUsedAt,
      capabilities:
        apiKey.capabilities,
    };
  }

  private verifySecret(
    secret: string,
    apiKey: ApiKey,
  ): void {
    const valid =
      this.hasher.verify(
        secret,
        apiKey.secretHash,
      );

    if (!valid) {
      throw new InvalidApiKeyException(
        "Invalid API key.",
      );
    }
  }
}