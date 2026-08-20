import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import {
  ApiKeyStatus,
  AuthenticationMethod,
} from "@prisma/client";

import type { ApiKey } from "@prisma/client";

import { initTelemetry } from "@pague-co-uk/sms-gateway-telemetry";

import { ApiKeyCapabilityDefinitions } from "../../../common/authorization/permissions/api-key-capabilities.definitions.js";
import { ApiKeyService } from "./apikey.service.js";
describe("ApiKeyService", () => {
  let service: ApiKeyService;

  beforeAll(() => {
    initTelemetry({
      enabled: false,

      service: {
        name: "control-plane-api-test",
        version: "test",
      },

      collector: {
        tracesEndpoint:
          "http://localhost:4318/v1/traces",

        metricsEndpoint:
          "http://localhost:4318/v1/metrics",

        logsEndpoint:
          "http://localhost:4318/v1/logs",
      },

      metrics: {
        exportIntervalMillis: 60_000,
      },

      registerShutdownHooks: false,
    });
  });

  const hasher = {
    hash: jest.fn(),
    verify: jest.fn(),
  };

  const random = {
    bytes: jest.fn(),
  };

  const clock = {
    now: jest.fn(),
  };

  const apiKeys = {
    withTransaction: jest.fn(),
    withDatabase: jest.fn(),

    create: jest.fn(),
    createCapabilities: jest.fn(),

    findByPrefix: jest.fn(),
    findByPrefixWithCapabilities: jest.fn(),
    findByClient: jest.fn(),
    findById: jest.fn(),

    updateLastUsed: jest.fn(),
    updateSecret: jest.fn(),
    revoke: jest.fn(),
  };

  const apiKeyCapabilities = {
    withDatabase: jest.fn(),
    findByNames: jest.fn(),
    upsert: jest.fn(),
  };

  const authenticationEvents = {
    withDatabase: jest.fn(),

    recordApiKeyCreated:
      jest.fn(),

    recordApiKeyRevoked:
      jest.fn(),

    recordApiKeyRotated:
      jest.fn(),
  };

  const now =
    new Date("2026-08-13T10:00:00.000Z");

  const clientId = "client-1";
  const userId = "user-1";

  const baseApiKey: ApiKey = {
    id: "api-key-1",
    publicId: "AK-001",
    clientId,
    name: "Production",
    prefix: "abcdef1234567890",
    secretHash: "hashed-secret",
    status: ApiKeyStatus.ACTIVE,
    lastUsedAt: null,
    expiresAt: null,
    revokedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const createTransactionMocks = () => {
    apiKeys.withDatabase.mockReturnValue(
      apiKeys,
    );

    apiKeyCapabilities.withDatabase.mockReturnValue(
      apiKeyCapabilities,
    );

    authenticationEvents.withDatabase.mockReturnValue(
      authenticationEvents,
    );

    apiKeys.withTransaction.mockImplementation(
      async (
        callback: (
          tx: unknown,
        ) => Promise<unknown>,
      ) => callback({}),
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();

    clock.now.mockReturnValue(now);

    hasher.hash.mockReturnValue(
      "hashed-secret",
    );

    hasher.verify.mockReturnValue(
      true,
    );

    random.bytes.mockImplementation(
      (size: number) => {
        if (size === 10) {
          return Buffer.from(
            "public-id",
          );
        }

        if (size === 8) {
          return Buffer.from(
            "prefix01",
          );
        }

        if (size === 32) {
          return Buffer.from(
            "secret-value",
          );
        }

        throw new Error(
          `Unexpected random byte size: ${size}`,
        );
      },
    );

    apiKeyCapabilities.findByNames.mockResolvedValue(
      [],
    );

    apiKeys.createCapabilities.mockResolvedValue({
      count: 0,
    });

    createTransactionMocks();

    service =
      new ApiKeyService(
        hasher as any,
        random as any,
        clock as any,
        apiKeys as any,
        authenticationEvents as any,
        apiKeyCapabilities as any,
      );
  });

  // -------------------------------------------------------------------------
  // synchronizeRegistry
  // -------------------------------------------------------------------------

  describe("synchronizeRegistry", () => {
    it("should synchronize all API key capabilities", async () => {
      apiKeyCapabilities.upsert.mockResolvedValue(
        {},
      );

      await service.synchronizeRegistry();

      const entries =
        Object.entries(
          ApiKeyCapabilityDefinitions,
        );

      expect(
        apiKeyCapabilities.upsert,
      ).toHaveBeenCalledTimes(
        entries.length,
      );

      for (
        const [
          name,
          definition,
        ] of entries
      ) {
        expect(
          apiKeyCapabilities.upsert,
        ).toHaveBeenCalledWith({
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
    });

    it("should synchronize the registry idempotently", async () => {
      apiKeyCapabilities.upsert.mockResolvedValue(
        {},
      );

      await service.synchronizeRegistry();
      await service.synchronizeRegistry();

      const capabilityCount =
        Object.keys(
          ApiKeyCapabilityDefinitions,
        ).length;

      expect(
        apiKeyCapabilities.upsert,
      ).toHaveBeenCalledTimes(
        capabilityCount * 2,
      );
    });

    it("should propagate repository errors", async () => {
      const error =
        new Error(
          "Database unavailable",
        );

      apiKeyCapabilities.upsert.mockRejectedValueOnce(
        error,
      );

      await expect(
        service.synchronizeRegistry(),
      ).rejects.toThrow(
        "Database unavailable",
      );
    });

    it("should stop synchronization when an upsert fails", async () => {
      const entries =
        Object.entries(
          ApiKeyCapabilityDefinitions,
        );

      const error =
        new Error(
          "Database unavailable",
        );

      apiKeyCapabilities.upsert
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(error);

      await expect(
        service.synchronizeRegistry(),
      ).rejects.toThrow(
        "Database unavailable",
      );

      expect(
        apiKeyCapabilities.upsert,
      ).toHaveBeenCalledTimes(
        Math.min(2, entries.length),
      );
    });
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------

  describe("create", () => {
    it("should create an API key", async () => {
      const requestedCapabilities = [
        "messages.send",
      ];

      const capabilityRecords = [
        {
          id: "capability-1",
          name: "messages.send",
          module: "messages",
          description:
            "Send SMS messages.",
          createdAt: now,
          updatedAt: now,
        },
      ];

      apiKeyCapabilities.findByNames.mockResolvedValue(
        capabilityRecords,
      );

      apiKeys.createCapabilities.mockResolvedValue({
        count: 1,
      });

      const created = {
        ...baseApiKey,
        publicId: "cHVibGljLWlk",
        prefix: "7072656669783031",
      };

      apiKeys.create.mockResolvedValue(
        created,
      );

      const result =
        await service.create(
          clientId,
          "Production",
          requestedCapabilities,
          userId,
          AuthenticationMethod.SESSION,
        );

      expect(
        apiKeyCapabilities.findByNames,
      ).toHaveBeenCalledWith(
        requestedCapabilities,
      );

      expect(
        apiKeys.create,
      ).toHaveBeenCalledWith({
        publicId: "cHVibGljLWlk",

        client: {
          connect: {
            id: clientId,
          },
        },

        name: "Production",

        prefix: "7072656669783031",

        secretHash: "hashed-secret",

        status:
          ApiKeyStatus.ACTIVE,

        expiresAt: undefined,
      });

      expect(
        apiKeys.createCapabilities,
      ).toHaveBeenCalledWith(
        created.id,
        ["capability-1"],
      );

      expect(
        hasher.hash,
      ).toHaveBeenCalledWith(
        "c2VjcmV0LXZhbHVl",
      );

      expect(result).toEqual({
        apiKeyId: created.id,

        publicId:
          created.publicId,

        apiKey:
          "pk_live_7072656669783031.c2VjcmV0LXZhbHVl",

        prefix:
          created.prefix,

        expiresAt:
          created.expiresAt,
      });
    });

    it("should create an API key with an expiry date", async () => {
      const expiresAt =
        new Date(
          "2027-01-01T00:00:00.000Z",
        );

      const requestedCapabilities = [
        "messages.send",
      ];

      apiKeyCapabilities.findByNames.mockResolvedValue([
        {
          id: "capability-1",
          name: "messages.send",
          module: "messages",
          description:
            "Send SMS messages.",
          createdAt: now,
          updatedAt: now,
        },
      ]);

      apiKeys.createCapabilities.mockResolvedValue({
        count: 1,
      });

      apiKeys.create.mockResolvedValue({
        ...baseApiKey,
        expiresAt,
      });

      await service.create(
        clientId,
        "Production",
        requestedCapabilities,
        userId,
        AuthenticationMethod.SESSION,
        expiresAt,
      );

      expect(
        apiKeys.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          expiresAt,
        }),
      );
    });

    it("should record the API key creation event inside the transaction", async () => {
      const requestedCapabilities = [
        "messages.send",
      ];

      apiKeyCapabilities.findByNames.mockResolvedValue([
        {
          id: "capability-1",
          name: "messages.send",
          module: "messages",
          description:
            "Send SMS messages.",
          createdAt: now,
          updatedAt: now,
        },
      ]);

      apiKeys.createCapabilities.mockResolvedValue({
        count: 1,
      });

      apiKeys.create.mockResolvedValue(
        baseApiKey,
      );

      await service.create(
        clientId,
        "Production",
        requestedCapabilities,
        userId,
        AuthenticationMethod.SESSION,
        null,
        "127.0.0.1",
        "Jest",
      );

      expect(
        authenticationEvents.recordApiKeyCreated,
      ).toHaveBeenCalledWith(
        clientId,
        userId,
        "127.0.0.1",
        "Jest",
        AuthenticationMethod.SESSION,
      );
    });

    it("should assign the requested capabilities inside the transaction", async () => {
      const requestedCapabilities = [
        "messages.send",
        "messages.status.read",
      ];

      apiKeyCapabilities.findByNames.mockResolvedValue([
        {
          id: "capability-1",
          name: "messages.send",
          module: "messages",
          description:
            "Send SMS messages.",
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "capability-2",
          name: "messages.status.read",
          module: "messages",
          description:
            "Read message status.",
          createdAt: now,
          updatedAt: now,
        },
      ]);

      apiKeys.createCapabilities.mockResolvedValue({
        count: 2,
      });

      apiKeys.create.mockResolvedValue(
        baseApiKey,
      );

      await service.create(
        clientId,
        "Production",
        requestedCapabilities,
        userId,
        AuthenticationMethod.SESSION,
      );

      expect(
        apiKeys.createCapabilities,
      ).toHaveBeenCalledWith(
        baseApiKey.id,
        [
          "capability-1",
          "capability-2",
        ],
      );
    });

    it("should reject an unknown capability", async () => {
      const requestedCapabilities = [
        "messages.send",
        "messages.fake",
      ];

      apiKeyCapabilities.findByNames.mockResolvedValue([
        {
          id: "capability-1",
          name: "messages.send",
          module: "messages",
          description:
            "Send SMS messages.",
          createdAt: now,
          updatedAt: now,
        },
      ]);

      await expect(
        service.create(
          clientId,
          "Production",
          requestedCapabilities,
          userId,
          AuthenticationMethod.SESSION,
        ),
      ).rejects.toThrow(
        "Unknown API key capability: messages.fake",
      );

      expect(
        apiKeys.create,
      ).not.toHaveBeenCalled();

      expect(
        apiKeys.createCapabilities,
      ).not.toHaveBeenCalled();

      expect(
        authenticationEvents.recordApiKeyCreated,
      ).not.toHaveBeenCalled();
    });

    it("should reject duplicate capabilities", async () => {
      const requestedCapabilities = [
        "messages.send",
        "messages.send",
      ];

      await expect(
        service.create(
          clientId,
          "Production",
          requestedCapabilities,
          userId,
          AuthenticationMethod.SESSION,
        ),
      ).rejects.toThrow(
        "Duplicate API key capabilities are not allowed.",
      );

      expect(
        apiKeyCapabilities.findByNames,
      ).not.toHaveBeenCalled();

      expect(
        apiKeys.create,
      ).not.toHaveBeenCalled();

      expect(
        apiKeys.createCapabilities,
      ).not.toHaveBeenCalled();
    });

    it("should use the API key repository transaction", async () => {
      const requestedCapabilities = [
        "messages.send",
      ];

      apiKeyCapabilities.findByNames.mockResolvedValue([
        {
          id: "capability-1",
          name: "messages.send",
          module: "messages",
          description:
            "Send SMS messages.",
          createdAt: now,
          updatedAt: now,
        },
      ]);

      apiKeys.createCapabilities.mockResolvedValue({
        count: 1,
      });

      apiKeys.create.mockResolvedValue(
        baseApiKey,
      );

      await service.create(
        clientId,
        "Production",
        requestedCapabilities,
        userId,
        AuthenticationMethod.SESSION,
      );

      expect(
        apiKeys.withTransaction,
      ).toHaveBeenCalledTimes(1);

      expect(
        apiKeys.withDatabase,
      ).toHaveBeenCalledTimes(1);

      expect(
        apiKeyCapabilities.withDatabase,
      ).toHaveBeenCalledTimes(1);

      expect(
        authenticationEvents.withDatabase,
      ).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // validate
  // -------------------------------------------------------------------------

  describe("validate", () => {
    const storedKey = {
      ...baseApiKey,
      prefix: "abcdef1234567890",
      secretHash: "hashed-secret",
      capabilities: [
        {
          capability: {
            name: "messages.send",
          },
        },
        {
          capability: {
            name: "messages.status.read",
          },
        },
      ],
    };

    it("should validate a valid API key and return its capabilities", async () => {
      const updated = {
        ...storedKey,
        lastUsedAt: now,
      };

      apiKeys.findByPrefixWithCapabilities.mockResolvedValue(
        storedKey,
      );

      apiKeys.updateLastUsed.mockResolvedValue(
        updated,
      );

      hasher.verify.mockReturnValue(
        true,
      );

      const result =
        await service.validate(
          "pk_live_abcdef1234567890.secret",
        );

      expect(
        apiKeys.findByPrefixWithCapabilities,
      ).toHaveBeenCalledWith(
        "abcdef1234567890",
      );

      expect(
        apiKeys.findByPrefix,
      ).not.toHaveBeenCalled();

      expect(
        hasher.verify,
      ).toHaveBeenCalledWith(
        "secret",
        "hashed-secret",
      );

      expect(
        apiKeys.updateLastUsed,
      ).toHaveBeenCalledWith(
        storedKey.id,
        now,
      );

      expect(result).toEqual({
        id: storedKey.id,
        publicId: storedKey.publicId,
        clientId: storedKey.clientId,
        name: storedKey.name,
        status: storedKey.status,
        expiresAt: storedKey.expiresAt,
        lastUsedAt: updated.lastUsedAt,
        capabilities: [
          "messages.send",
          "messages.status.read",
        ],
      });
    });

    it("should return an empty capability list when the API key has no capabilities", async () => {
      const keyWithoutCapabilities = {
        ...baseApiKey,
        prefix: "abcdef1234567890",
        secretHash: "hashed-secret",
        capabilities: [],
      };

      const updated = {
        ...keyWithoutCapabilities,
        lastUsedAt: now,
      };

      apiKeys.findByPrefixWithCapabilities.mockResolvedValue(
        keyWithoutCapabilities,
      );

      apiKeys.updateLastUsed.mockResolvedValue(
        updated,
      );

      hasher.verify.mockReturnValue(
        true,
      );

      const result =
        await service.validate(
          "pk_live_abcdef1234567890.secret",
        );

      expect(result).toEqual({
        id: keyWithoutCapabilities.id,
        publicId:
          keyWithoutCapabilities.publicId,
        clientId:
          keyWithoutCapabilities.clientId,
        name: keyWithoutCapabilities.name,
        status:
          keyWithoutCapabilities.status,
        expiresAt:
          keyWithoutCapabilities.expiresAt,
        lastUsedAt:
          updated.lastUsedAt,
        capabilities: [],
      });
    });

    it("should reject a malformed API key", async () => {
      await expect(
        service.validate("invalid"),
      ).rejects.toThrow();

      expect(
        apiKeys.findByPrefixWithCapabilities,
      ).not.toHaveBeenCalled();
    });

    it("should reject an API key with an invalid secret", async () => {
      apiKeys.findByPrefixWithCapabilities.mockResolvedValue(
        storedKey,
      );

      hasher.verify.mockReturnValue(
        false,
      );

      await expect(
        service.validate(
          "pk_live_abcdef1234567890.secret",
        ),
      ).rejects.toThrow(
        "Invalid API key.",
      );

      expect(
        apiKeys.updateLastUsed,
      ).not.toHaveBeenCalled();
    });

    it("should reject a missing API key", async () => {
      apiKeys.findByPrefixWithCapabilities.mockResolvedValue(
        null,
      );

      await expect(
        service.validate(
          "pk_live_abcdef1234567890.secret",
        ),
      ).rejects.toThrow(
        "API key not found.",
      );

      expect(
        apiKeys.updateLastUsed,
      ).not.toHaveBeenCalled();
    });

    it("should reject an inactive API key", async () => {
      apiKeys.findByPrefixWithCapabilities.mockResolvedValue({
        ...storedKey,
        status: ApiKeyStatus.REVOKED,
      });

      await expect(
        service.validate(
          "pk_live_abcdef1234567890.secret",
        ),
      ).rejects.toThrow(
        "API key is inactive.",
      );

      expect(
        apiKeys.updateLastUsed,
      ).not.toHaveBeenCalled();
    });

    it("should reject a revoked API key", async () => {
      apiKeys.findByPrefixWithCapabilities.mockResolvedValue({
        ...storedKey,
        revokedAt:
          new Date(
            "2026-08-01T00:00:00.000Z",
          ),
      });

      await expect(
        service.validate(
          "pk_live_abcdef1234567890.secret",
        ),
      ).rejects.toThrow(
        "API key has been revoked.",
      );

      expect(
        apiKeys.updateLastUsed,
      ).not.toHaveBeenCalled();
    });

    it("should reject an expired API key", async () => {
      apiKeys.findByPrefixWithCapabilities.mockResolvedValue({
        ...storedKey,
        expiresAt:
          new Date(
            "2026-08-01T00:00:00.000Z",
          ),
      });

      await expect(
        service.validate(
          "pk_live_abcdef1234567890.secret",
        ),
      ).rejects.toThrow(
        "API key has expired.",
      );

      expect(
        apiKeys.updateLastUsed,
      ).not.toHaveBeenCalled();
    });

    it("should accept an API key that expires exactly after the current time", async () => {
      const expiresAt =
        new Date(
          now.getTime() + 1000,
        );

      const key = {
        ...storedKey,
        expiresAt,
      };

      apiKeys.findByPrefixWithCapabilities.mockResolvedValue(
        key,
      );

      apiKeys.updateLastUsed.mockResolvedValue({
        ...key,
        lastUsedAt: now,
      });

      await expect(
        service.validate(
          "pk_live_abcdef1234567890.secret",
        ),
      ).resolves.toBeDefined();

      expect(
        apiKeys.findByPrefixWithCapabilities,
      ).toHaveBeenCalledWith(
        "abcdef1234567890",
      );
    });
  });

  // -------------------------------------------------------------------------
  // list
  // -------------------------------------------------------------------------

  describe("list", () => {
    it("should return API keys for a client", async () => {
      apiKeys.findByClient.mockResolvedValue([
        baseApiKey,
      ]);

      const result =
        await service.list(
          clientId,
        );

      expect(
        apiKeys.findByClient,
      ).toHaveBeenCalledWith(
        clientId,
      );

      expect(result).toEqual([
        baseApiKey,
      ]);
    });
  });

  // -------------------------------------------------------------------------
  // revokeById
  // -------------------------------------------------------------------------

  describe("revokeById", () => {
    it("should revoke an active API key belonging to the client", async () => {
      apiKeys.findById.mockResolvedValue(
        baseApiKey,
      );

      apiKeys.revoke.mockResolvedValue(
        undefined,
      );

      await service.revokeById(
        baseApiKey.id,
        clientId,
        userId,
        AuthenticationMethod.SESSION,
        "127.0.0.1",
        "Jest",
      );

      expect(
        apiKeys.findById,
      ).toHaveBeenCalledWith(
        baseApiKey.id,
      );

      expect(
        apiKeys.revoke,
      ).toHaveBeenCalledWith(
        baseApiKey.id,
        now,
      );

      expect(
        authenticationEvents.recordApiKeyRevoked,
      ).toHaveBeenCalledWith(
        clientId,
        userId,
        AuthenticationMethod.SESSION,
        "127.0.0.1",
        "Jest",
      );
    });

    it("should reject a missing API key", async () => {
      apiKeys.findById.mockResolvedValue(
        null,
      );

      await expect(
        service.revokeById(
          "missing",
          clientId,
          userId,
          AuthenticationMethod.SESSION,
        ),
      ).rejects.toThrow(
        "API key not found.",
      );

      expect(
        apiKeys.revoke,
      ).not.toHaveBeenCalled();
    });

    it("should reject an API key belonging to another client", async () => {
      apiKeys.findById.mockResolvedValue({
        ...baseApiKey,
        clientId: "client-2",
      });

      await expect(
        service.revokeById(
          baseApiKey.id,
          clientId,
          userId,
          AuthenticationMethod.SESSION,
        ),
      ).rejects.toThrow(
        "API key not found.",
      );

      expect(
        apiKeys.revoke,
      ).not.toHaveBeenCalled();
    });

    it("should reject an inactive API key", async () => {
      apiKeys.findById.mockResolvedValue({
        ...baseApiKey,
        status:
          ApiKeyStatus.REVOKED,
      });

      await expect(
        service.revokeById(
          baseApiKey.id,
          clientId,
          userId,
          AuthenticationMethod.SESSION,
        ),
      ).rejects.toThrow(
        "API key is not active.",
      );

      expect(
        apiKeys.revoke,
      ).not.toHaveBeenCalled();
    });

    it("should reject an expired API key", async () => {
      apiKeys.findById.mockResolvedValue({
        ...baseApiKey,
        expiresAt:
          new Date(
            "2026-08-01T00:00:00.000Z",
          ),
      });

      await expect(
        service.revokeById(
          baseApiKey.id,
          clientId,
          userId,
          AuthenticationMethod.SESSION,
        ),
      ).rejects.toThrow(
        "API key is not active.",
      );

      expect(
        apiKeys.revoke,
      ).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // rotate
  // -------------------------------------------------------------------------

  describe("rotate", () => {
    it("should rotate an API key", async () => {
      const current = {
        ...baseApiKey,
        prefix: "abcdef1234567890",
        secretHash: "old-hash",
      };

      const rotated = {
        ...current,
        secretHash: "new-hash",
        lastUsedAt: null,
      };

      apiKeys.findByPrefix.mockResolvedValue(
        current,
      );

      hasher.verify.mockReturnValue(
        true,
      );

      apiKeys.updateSecret.mockResolvedValue(
        rotated,
      );

      const result =
        await service.rotate(
          "pk_live_abcdef1234567890.old-secret",
          clientId,
          userId,
          AuthenticationMethod.SESSION,
          "127.0.0.1",
          "Jest",
        );

      expect(
        apiKeys.findByPrefix,
      ).toHaveBeenCalledWith(
        "abcdef1234567890",
      );

      expect(
        hasher.verify,
      ).toHaveBeenCalledWith(
        "old-secret",
        "old-hash",
      );

      expect(
        apiKeys.updateSecret,
      ).toHaveBeenCalledWith(
        current.id,
        "hashed-secret",
      );

      expect(
        authenticationEvents.recordApiKeyRotated,
      ).toHaveBeenCalledWith(
        clientId,
        userId,
        AuthenticationMethod.SESSION,
        "127.0.0.1",
        "Jest",
      );

      expect(result).toEqual({
        apiKeyId: rotated.id,
        publicId: rotated.publicId,
        apiKey:
          "pk_live_abcdef1234567890.c2VjcmV0LXZhbHVl",
        prefix: rotated.prefix,
        expiresAt: rotated.expiresAt,
      });
    });

    it("should reject rotation of a missing API key", async () => {
      apiKeys.findByPrefix.mockResolvedValue(
        null,
      );

      await expect(
        service.rotate(
          "pk_live_abcdef1234567890.secret",
          clientId,
          userId,
          AuthenticationMethod.SESSION,
        ),
      ).rejects.toThrow(
        "API key not found.",
      );

      expect(
        apiKeys.updateSecret,
      ).not.toHaveBeenCalled();
    });

    it("should reject rotation when the secret is invalid", async () => {
      apiKeys.findByPrefix.mockResolvedValue(
        baseApiKey,
      );

      hasher.verify.mockReturnValue(
        false,
      );

      await expect(
        service.rotate(
          "pk_live_abcdef1234567890.secret",
          clientId,
          userId,
          AuthenticationMethod.SESSION,
        ),
      ).rejects.toThrow(
        "Invalid API key.",
      );

      expect(
        apiKeys.updateSecret,
      ).not.toHaveBeenCalled();
    });

    it("should reject rotation of an inactive API key", async () => {
      apiKeys.findByPrefix.mockResolvedValue({
        ...baseApiKey,
        status:
          ApiKeyStatus.REVOKED,
      });

      await expect(
        service.rotate(
          "pk_live_abcdef1234567890.secret",
          clientId,
          userId,
          AuthenticationMethod.SESSION,
        ),
      ).rejects.toThrow(
        "API key is inactive.",
      );

      expect(
        apiKeys.updateSecret,
      ).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // revoke
  // -------------------------------------------------------------------------

  describe("revoke", () => {
    it("should revoke an API key using the secret", async () => {
      const revoked = {
        ...baseApiKey,
        status:
          ApiKeyStatus.REVOKED,
        revokedAt: now,
      };

      apiKeys.findByPrefix.mockResolvedValue(
        baseApiKey,
      );

      hasher.verify.mockReturnValue(
        true,
      );

      apiKeys.revoke.mockResolvedValue(
        revoked,
      );

      const result =
        await service.revoke(
          "pk_live_abcdef1234567890.secret",
          clientId,
          userId,
          AuthenticationMethod.SESSION,
          "127.0.0.1",
          "Jest",
        );

      expect(
        apiKeys.findByPrefix,
      ).toHaveBeenCalledWith(
        "abcdef1234567890",
      );

      expect(
        hasher.verify,
      ).toHaveBeenCalledWith(
        "secret",
        baseApiKey.secretHash,
      );

      expect(
        apiKeys.revoke,
      ).toHaveBeenCalledWith(
        baseApiKey.id,
        now,
      );

      expect(
        authenticationEvents.recordApiKeyRevoked,
      ).toHaveBeenCalledWith(
        clientId,
        userId,
        AuthenticationMethod.SESSION,
        "127.0.0.1",
        "Jest",
      );

      expect(result).toEqual(
        revoked,
      );
    });

    it("should reject revocation of a missing API key", async () => {
      apiKeys.findByPrefix.mockResolvedValue(
        null,
      );

      await expect(
        service.revoke(
          "pk_live_abcdef1234567890.secret",
          clientId,
          userId,
          AuthenticationMethod.SESSION,
        ),
      ).rejects.toThrow(
        "API key not found.",
      );

      expect(
        apiKeys.revoke,
      ).not.toHaveBeenCalled();
    });

    it("should reject revocation with an invalid secret", async () => {
      apiKeys.findByPrefix.mockResolvedValue(
        baseApiKey,
      );

      hasher.verify.mockReturnValue(
        false,
      );

      await expect(
        service.revoke(
          "pk_live_abcdef1234567890.secret",
          clientId,
          userId,
          AuthenticationMethod.SESSION,
        ),
      ).rejects.toThrow(
        "Invalid API key.",
      );

      expect(
        apiKeys.revoke,
      ).not.toHaveBeenCalled();
    });

    it("should reject revocation of an inactive API key", async () => {
      apiKeys.findByPrefix.mockResolvedValue({
        ...baseApiKey,
        status:
          ApiKeyStatus.DISABLED,
      });

      await expect(
        service.revoke(
          "pk_live_abcdef1234567890.secret",
          clientId,
          userId,
          AuthenticationMethod.SESSION,
        ),
      ).rejects.toThrow(
        "API key is inactive.",
      );

      expect(
        apiKeys.revoke,
      ).not.toHaveBeenCalled();
    });

    it("should reject revocation of an expired API key", async () => {
      apiKeys.findByPrefix.mockResolvedValue({
        ...baseApiKey,
        expiresAt:
          new Date(
            "2026-08-01T00:00:00.000Z",
          ),
      });

      await expect(
        service.revoke(
          "pk_live_abcdef1234567890.secret",
          clientId,
          userId,
          AuthenticationMethod.SESSION,
        ),
      ).rejects.toThrow(
        "API key has expired.",
      );

      expect(
        apiKeys.revoke,
      ).not.toHaveBeenCalled();
    });
  });
});