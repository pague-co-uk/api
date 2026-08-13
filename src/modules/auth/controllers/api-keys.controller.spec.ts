import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import {
  ForbiddenException,
} from "@nestjs/common";

import {
  ApiKeyStatus,
  AuthenticationMethod,
} from "@prisma/client";

import { ApiKeysController } from "./api-keys.controller.js";


describe("ApiKeysController", () => {
  let controller: ApiKeysController;

  const apiKeys = {
    list: jest.fn(),
    create: jest.fn(),
    revokeById: jest.fn(),
  };

  const mapper = {
    toResponses: jest.fn(),
  };

  const authorization = {
    canAccessClient: jest.fn(),
  };

  const user = {
    sessionId: "session-1",
    userId: "user-1",
    clientId: "client-1",

    username: "testuser",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",

    active: true,
    locked: false,
    mfaEnabled: true,

    roles: [],
  };

  const authentication = {
    method: AuthenticationMethod.SESSION,
    ipAddress: "127.0.0.1",
    userAgent: "Jest",
  };

  const apiKey = {
    id: "api-key-1",
    publicId: "AK-001",
    clientId: "client-1",
    name: "Production",
    prefix: "abc123",
    secretHash: "secret-hash",
    status: ApiKeyStatus.ACTIVE,
    lastUsedAt: null,
    expiresAt: null,
    revokedAt: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  };

  const response = {
    id: "api-key-1",
    publicId: "AK-001",
    clientId: "client-1",
    name: "Production",
    prefix: "abc123",
    status: ApiKeyStatus.ACTIVE,
    lastUsedAt: null,
    expiresAt: null,
    revokedAt: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    controller = new ApiKeysController(
      apiKeys as any,
      mapper as any,
      authorization as any,
    );
  });

  describe("findMany", () => {
    it("should retrieve API keys for the user's own client", async () => {
      authorization.canAccessClient.mockReturnValue(
        true,
      );

      apiKeys.list.mockResolvedValue([
        apiKey,
      ]);

      mapper.toResponses.mockReturnValue([
        response,
      ]);

      const result =
        await controller.findMany(
          "client-1",
          user,
        );

      expect(
        authorization.canAccessClient,
      ).toHaveBeenCalledWith(
        user,
        "client-1",
      );

      expect(
        apiKeys.list,
      ).toHaveBeenCalledWith(
        "client-1",
      );

      expect(
        mapper.toResponses,
      ).toHaveBeenCalledWith([
        apiKey,
      ]);

      expect(result).toEqual([
        response,
      ]);
    });

    it("should allow a Pague Super User to retrieve another client's API keys", async () => {
      const pagueUser = {
        ...user,
        clientId: "pague-client",
      };

      authorization.canAccessClient.mockReturnValue(
        true,
      );

      apiKeys.list.mockResolvedValue([
        apiKey,
      ]);

      mapper.toResponses.mockReturnValue([
        response,
      ]);

      const result =
        await controller.findMany(
          "client-1",
          pagueUser,
        );

      expect(
        authorization.canAccessClient,
      ).toHaveBeenCalledWith(
        pagueUser,
        "client-1",
      );

      expect(
        apiKeys.list,
      ).toHaveBeenCalledWith(
        "client-1",
      );

      expect(result).toEqual([
        response,
      ]);
    });

    it("should reject a client user accessing another client", async () => {
      authorization.canAccessClient.mockReturnValue(
        false,
      );

      await expect(
        controller.findMany(
          "client-2",
          user,
        ),
      ).rejects.toThrow(
        ForbiddenException,
      );

      expect(
        apiKeys.list,
      ).not.toHaveBeenCalled();

      expect(
        mapper.toResponses,
      ).not.toHaveBeenCalled();
    });
  });

  describe("create", () => {
    const dto = {
      name: "Production",
      expiresAt: "2027-01-01T00:00:00.000Z",
    };

    const created = {
      apiKeyId: "api-key-1",
      publicId: "AK-001",
      apiKey:
        "pk_live_abc123.secret-value",
      prefix: "abc123",
      expiresAt: new Date(
        "2027-01-01T00:00:00.000Z",
      ),
    };

    it("should create an API key for the user's own client", async () => {
      authorization.canAccessClient.mockReturnValue(
        true,
      );

      apiKeys.create.mockResolvedValue(
        created,
      );

      const result =
        await controller.create(
          "client-1",
          dto,
          user,
          authentication,
        );

      expect(
        authorization.canAccessClient,
      ).toHaveBeenCalledWith(
        user,
        "client-1",
      );

      expect(
        apiKeys.create,
      ).toHaveBeenCalledWith(
        "client-1",
        "Production",
        "user-1",
        AuthenticationMethod.SESSION,
        new Date(
          "2027-01-01T00:00:00.000Z",
        ),
        "127.0.0.1",
        "Jest",
      );

      expect(result).toEqual(
        created,
      );
    });

    it("should allow a Pague Super User to create a key for another client", async () => {
      const pagueUser = {
        ...user,
        clientId: "pague-client",
      };

      authorization.canAccessClient.mockReturnValue(
        true,
      );

      apiKeys.create.mockResolvedValue(
        created,
      );

      await controller.create(
        "client-1",
        dto,
        pagueUser,
        authentication,
      );

      expect(
        authorization.canAccessClient,
      ).toHaveBeenCalledWith(
        pagueUser,
        "client-1",
      );

      expect(
        apiKeys.create,
      ).toHaveBeenCalledWith(
        "client-1",
        "Production",
        "user-1",
        AuthenticationMethod.SESSION,
        new Date(
          "2027-01-01T00:00:00.000Z",
        ),
        "127.0.0.1",
        "Jest",
      );
    });

    it("should reject a client user creating a key for another client", async () => {
      authorization.canAccessClient.mockReturnValue(
        false,
      );

      await expect(
        controller.create(
          "client-2",
          dto,
          user,
          authentication,
        ),
      ).rejects.toThrow(
        ForbiddenException,
      );

      expect(
        apiKeys.create,
      ).not.toHaveBeenCalled();
    });
  });

  describe("revoke", () => {
    it("should revoke a key belonging to the user's client", async () => {
      authorization.canAccessClient.mockReturnValue(
        true,
      );

      apiKeys.revokeById.mockResolvedValue(
        undefined,
      );

      await controller.revoke(
        "client-1",
        "api-key-1",
        user,
        authentication,
      );

      expect(
        authorization.canAccessClient,
      ).toHaveBeenCalledWith(
        user,
        "client-1",
      );

      expect(
        apiKeys.revokeById,
      ).toHaveBeenCalledWith(
        "api-key-1",
        "client-1",
        "user-1",
        AuthenticationMethod.SESSION,
        "127.0.0.1",
        "Jest",
      );
    });

    it("should allow a Pague Super User to revoke another client's key", async () => {
      const pagueUser = {
        ...user,
        clientId: "pague-client",
      };

      authorization.canAccessClient.mockReturnValue(
        true,
      );

      await controller.revoke(
        "client-1",
        "api-key-1",
        pagueUser,
        authentication,
      );

      expect(
        apiKeys.revokeById,
      ).toHaveBeenCalledWith(
        "api-key-1",
        "client-1",
        "user-1",
        AuthenticationMethod.SESSION,
        "127.0.0.1",
        "Jest",
      );
    });

    it("should reject a client user revoking another client's key", async () => {
      authorization.canAccessClient.mockReturnValue(
        false,
      );

      await expect(
        controller.revoke(
          "client-2",
          "api-key-1",
          user,
          authentication,
        ),
      ).rejects.toThrow(
        ForbiddenException,
      );

      expect(
        apiKeys.revokeById,
      ).not.toHaveBeenCalled();
    });
  });
});