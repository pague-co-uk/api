import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import {
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthenticationMethod } from "@prisma/client";

import { ApiKeyService } from "../../../modules/auth/services/apikey.service.js";
import { AuthenticationCookieService } from "../../../modules/auth/services/authentication-cookie.service.js";
import { SessionService } from "../../../modules/auth/services/session.service.js";
import type { AuthenticatedRequest } from "../interfaces/index.js";
import { PrincipalService } from "../services/index.js";
import { AuthenticationGuard } from "./authentication.guard.js";

describe("AuthenticationGuard", () => {
  let guard: AuthenticationGuard;

  const reflector = {
    getAllAndOverride: jest.fn(),
  };

  const sessions = {
    validateSession: jest.fn(),
  };

  const principals = {
    load: jest.fn(),
  };

  const cookies = {
    get: jest.fn(),
  };

  const apiKeys = {
    validate: jest.fn(),
  };

  const request = {
    ip: "127.0.0.1",
    get: jest.fn(),
    user: undefined,
    auth: undefined,
  } as unknown as AuthenticatedRequest;

  const httpContext = {
    getRequest: jest.fn(),
  };

  const context = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn(),
  };

  const authenticatedUser = {
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

  const apiKeyValidation = {
    id: "api-key-1",
    publicId: "AK-001",
    clientId: "client-1",
    name: "Production",
    status: "ACTIVE",
    expiresAt: null,
    lastUsedAt: new Date(
      "2026-08-13T10:00:00.000Z",
    ),
    capabilities: [
      "messages.send",
      "messages.status.read",
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    request.ip = "127.0.0.1";
    request.user = undefined;
    request.auth = undefined;

    context.getHandler.mockReturnValue(
      jest.fn(),
    );

    context.getClass.mockReturnValue(
      class TestController { },
    );

    context.switchToHttp.mockReturnValue(
      httpContext,
    );

    httpContext.getRequest.mockReturnValue(
      request,
    );

    reflector.getAllAndOverride.mockReturnValue(
      false,
    );

    cookies.get.mockReturnValue(null);

    request.get.mockImplementation(
      (header: string) => {
        if (
          header.toLowerCase() ===
          "user-agent"
        ) {
          return "Jest";
        }

        return undefined;
      },
    );

    sessions.validateSession.mockReset();
    principals.load.mockReset();
    apiKeys.validate.mockReset();

    guard =
      new AuthenticationGuard(
        reflector as unknown as Reflector,
        sessions as unknown as SessionService,
        principals as unknown as PrincipalService,
        cookies as unknown as AuthenticationCookieService,
        apiKeys as unknown as ApiKeyService,
      );
  });

  // -------------------------------------------------------------------------
  // public routes
  // -------------------------------------------------------------------------

  describe("public routes", () => {
    it("should allow a public route without authentication", async () => {
      reflector.getAllAndOverride.mockReturnValue(
        true,
      );

      const result =
        await guard.canActivate(
          context as unknown as ExecutionContext,
        );

      expect(result).toBe(true);

      expect(
        context.getHandler,
      ).toHaveBeenCalledTimes(1);

      expect(
        context.getClass,
      ).toHaveBeenCalledTimes(1);

      expect(
        context.switchToHttp,
      ).not.toHaveBeenCalled();

      expect(
        cookies.get,
      ).not.toHaveBeenCalled();

      expect(
        apiKeys.validate,
      ).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // session authentication
  // -------------------------------------------------------------------------

  describe("session authentication", () => {
    it("should authenticate a valid session", async () => {
      cookies.get.mockReturnValue(
        "session-token",
      );

      sessions.validateSession.mockResolvedValue({
        valid: true,
        session: {
          id: "session-1",
          userId: "user-1",
        },
      });

      principals.load.mockResolvedValue(
        authenticatedUser,
      );

      const result =
        await guard.canActivate(
          context as unknown as ExecutionContext,
        );

      expect(result).toBe(true);

      expect(
        cookies.get,
      ).toHaveBeenCalledWith(
        request,
        "session",
      );

      expect(
        sessions.validateSession,
      ).toHaveBeenCalledWith(
        "session-token",
      );

      expect(
        principals.load,
      ).toHaveBeenCalledWith(
        "user-1",
        "session-1",
      );

      expect(
        request.user,
      ).toEqual(
        authenticatedUser,
      );

      expect(
        request.auth,
      ).toEqual({
        method:
          AuthenticationMethod.SESSION,

        ipAddress:
          "127.0.0.1",

        userAgent:
          "Jest",
      });

      expect(
        apiKeys.validate,
      ).not.toHaveBeenCalled();
    });

    it("should reject an invalid session", async () => {
      cookies.get.mockReturnValue(
        "invalid-session",
      );

      sessions.validateSession.mockResolvedValue({
        valid: false,
      });

      await expect(
        guard.canActivate(
          context as unknown as ExecutionContext,
        ),
      ).rejects.toThrow(
        new UnauthorizedException(
          "Invalid session.",
        ),
      );

      expect(
        principals.load,
      ).not.toHaveBeenCalled();

      expect(
        apiKeys.validate,
      ).not.toHaveBeenCalled();
    });

    it("should not attempt API-key authentication when a session token exists", async () => {
      cookies.get.mockReturnValue(
        "session-token",
      );

      sessions.validateSession.mockResolvedValue({
        valid: true,
        session: {
          id: "session-1",
          userId: "user-1",
        },
      });

      principals.load.mockResolvedValue(
        authenticatedUser,
      );

      await guard.canActivate(
        context as unknown as ExecutionContext,
      );

      expect(
        apiKeys.validate,
      ).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // API-key authentication
  // -------------------------------------------------------------------------

  describe("API-key authentication", () => {
    const setBearerAuthorization = (
      value: string,
    ) => {
      request.get.mockImplementation(
        (header: string) => {
          switch (
          header.toLowerCase()
          ) {
            case "authorization":
              return `Bearer ${value}`;

            case "user-agent":
              return "Jest";

            default:
              return undefined;
          }
        },
      );
    };

    it("should authenticate a valid API key", async () => {
      cookies.get.mockReturnValue(null);

      setBearerAuthorization(
        "pk_live_abc123.secret",
      );

      apiKeys.validate.mockResolvedValue(
        apiKeyValidation,
      );

      const result =
        await guard.canActivate(
          context as unknown as ExecutionContext,
        );

      expect(result).toBe(true);

      expect(
        apiKeys.validate,
      ).toHaveBeenCalledWith(
        "pk_live_abc123.secret",
      );

      expect(
        request.auth,
      ).toEqual({
        method:
          AuthenticationMethod.API_KEY,

        ipAddress:
          "127.0.0.1",

        userAgent:
          "Jest",

        apiKey: {
          id:
            "api-key-1",

          publicId:
            "AK-001",

          clientId:
            "client-1",

          name:
            "Production",

          capabilities: [
            "messages.send",
            "messages.status.read",
          ],
        },
      });

      expect(
        request.user,
      ).toBeUndefined();

      expect(
        sessions.validateSession,
      ).not.toHaveBeenCalled();

      expect(
        principals.load,
      ).not.toHaveBeenCalled();
    });

    it("should preserve all API-key capabilities in the authentication context", async () => {
      cookies.get.mockReturnValue(null);

      setBearerAuthorization(
        "pk_live_abc123.secret",
      );

      apiKeys.validate.mockResolvedValue({
        ...apiKeyValidation,
        capabilities: [
          "messages.send",
          "messages.status.read",
          "messages.status.write",
        ],
      });

      await guard.canActivate(
        context as unknown as ExecutionContext,
      );

      expect(
        request.auth?.apiKey?.capabilities,
      ).toEqual([
        "messages.send",
        "messages.status.read",
        "messages.status.write",
      ]);
    });

    it("should authenticate an API key with no capabilities", async () => {
      cookies.get.mockReturnValue(null);

      setBearerAuthorization(
        "pk_live_abc123.secret",
      );

      apiKeys.validate.mockResolvedValue({
        ...apiKeyValidation,
        capabilities: [],
      });

      const result =
        await guard.canActivate(
          context as unknown as ExecutionContext,
        );

      expect(result).toBe(true);

      expect(
        request.auth?.apiKey,
      ).toEqual({
        id:
          "api-key-1",

        publicId:
          "AK-001",

        clientId:
          "client-1",

        name:
          "Production",

        capabilities: [],
      });
    });

    it("should reject an invalid API key", async () => {
      cookies.get.mockReturnValue(null);

      setBearerAuthorization(
        "pk_live_invalid.secret",
      );

      apiKeys.validate.mockRejectedValue(
        new UnauthorizedException(
          "Invalid API key.",
        ),
      );

      await expect(
        guard.canActivate(
          context as unknown as ExecutionContext,
        ),
      ).rejects.toThrow(
        "Invalid API key.",
      );

      expect(
        apiKeys.validate,
      ).toHaveBeenCalledWith(
        "pk_live_invalid.secret",
      );
    });
  });

  // -------------------------------------------------------------------------
  // authentication required
  // -------------------------------------------------------------------------

  describe("authentication required", () => {
    it("should reject a request with no session and no API key", async () => {
      cookies.get.mockReturnValue(null);

      request.get.mockImplementation(
        (header: string) => {
          if (
            header.toLowerCase() ===
            "user-agent"
          ) {
            return "Jest";
          }

          return undefined;
        },
      );

      await expect(
        guard.canActivate(
          context as unknown as ExecutionContext,
        ),
      ).rejects.toThrow(
        new UnauthorizedException(
          "Authentication required.",
        ),
      );

      expect(
        apiKeys.validate,
      ).not.toHaveBeenCalled();
    });

    it("should reject an authorization header using a non-Bearer scheme", async () => {
      cookies.get.mockReturnValue(null);

      request.get.mockImplementation(
        (header: string) => {
          if (
            header.toLowerCase() ===
            "authorization"
          ) {
            return "Basic abc123";
          }

          if (
            header.toLowerCase() ===
            "user-agent"
          ) {
            return "Jest";
          }

          return undefined;
        },
      );

      await expect(
        guard.canActivate(
          context as unknown as ExecutionContext,
        ),
      ).rejects.toThrow(
        new UnauthorizedException(
          "Authentication required.",
        ),
      );

      expect(
        apiKeys.validate,
      ).not.toHaveBeenCalled();
    });

    it("should reject a Bearer authorization header without credentials", async () => {
      cookies.get.mockReturnValue(null);

      request.get.mockImplementation(
        (header: string) => {
          if (
            header.toLowerCase() ===
            "authorization"
          ) {
            return "Bearer";
          }

          if (
            header.toLowerCase() ===
            "user-agent"
          ) {
            return "Jest";
          }

          return undefined;
        },
      );

      await expect(
        guard.canActivate(
          context as unknown as ExecutionContext,
        ),
      ).rejects.toThrow(
        new UnauthorizedException(
          "Invalid authorization header.",
        ),
      );

      expect(
        apiKeys.validate,
      ).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // authentication precedence
  // -------------------------------------------------------------------------

  describe("authentication precedence", () => {
    it("should prefer session authentication when both session and API key are supplied", async () => {
      cookies.get.mockReturnValue(
        "session-token",
      );

      request.get.mockImplementation(
        (header: string) => {
          if (
            header.toLowerCase() ===
            "authorization"
          ) {
            return "Bearer pk_live_abc123.secret";
          }

          if (
            header.toLowerCase() ===
            "user-agent"
          ) {
            return "Jest";
          }

          return undefined;
        },
      );

      sessions.validateSession.mockResolvedValue({
        valid: true,
        session: {
          id: "session-1",
          userId: "user-1",
        },
      });

      principals.load.mockResolvedValue(
        authenticatedUser,
      );

      const result =
        await guard.canActivate(
          context as unknown as ExecutionContext,
        );

      expect(result).toBe(true);

      expect(
        request.auth,
      ).toEqual({
        method:
          AuthenticationMethod.SESSION,

        ipAddress:
          "127.0.0.1",

        userAgent:
          "Jest",
      });

      expect(
        request.user,
      ).toEqual(
        authenticatedUser,
      );

      expect(
        apiKeys.validate,
      ).not.toHaveBeenCalled();
    });
  });
});