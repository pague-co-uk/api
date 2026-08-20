import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import { Reflector } from "@nestjs/core";

import {
  AUTHORIZE_METADATA,
} from "../../../common/authorization/constants/authorization.constants.js";
import {
  Permissions,
} from "../../../common/authorization/permissions/permissions.registry.js";

import { AuditLogMapper } from "../audit-log.mapper.js";
import { AuditLogService } from "../services/audit-log.service.js";

import { AuditLogController } from "./audit-log.controller.js";

describe("AuditLogController", () => {
  let controller: AuditLogController;

  let auditLogs: {
    findById: jest.Mock;
    findByEntity: jest.Mock;
    findByClient: jest.Mock;
    findByUser: jest.Mock;
    findByAction: jest.Mock;
  };

  let mapper: {
    toResponse: jest.Mock;
    toResponses: jest.Mock;
  };

  const auditLog = {
    id: "audit-1",

    clientId: "client-1",

    userId: "user-1",

    entityType: "client",

    entityId: "client-1",

    action: "clients.create",

    oldValues: null,

    newValues: {
      name: "Test Client",
    },

    ipAddress: "127.0.0.1",

    userAgent: "Jest",

    createdAt:
      new Date(
        "2026-08-15T10:00:00.000Z",
      ),
  };

  const response = {
    id: "audit-1",

    clientId: "client-1",

    userId: "user-1",

    entityType: "client",

    entityId: "client-1",

    action: "clients.create",

    oldValues: null,

    newValues: {
      name: "Test Client",
    },

    ipAddress: "127.0.0.1",

    userAgent: "Jest",

    createdAt:
      auditLog.createdAt,
  };

  beforeEach(() => {
    auditLogs = {
      findById: jest.fn(),
      findByEntity: jest.fn(),
      findByClient: jest.fn(),
      findByUser: jest.fn(),
      findByAction: jest.fn(),
    };

    mapper = {
      toResponse: jest.fn(),
      toResponses: jest.fn(),
    };

    controller =
      new AuditLogController(
        auditLogs as unknown as AuditLogService,
        mapper as unknown as AuditLogMapper,
      );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // findByEntity
  // -------------------------------------------------------------------------

  describe("findByEntity", () => {
    it("should retrieve and map audit logs for an entity", async () => {
      const entries = [
        auditLog,
        {
          ...auditLog,
          id: "audit-2",
          action: "clients.update",
        },
      ];

      const responses = [
        response,
        {
          ...response,
          id: "audit-2",
          action: "clients.update",
        },
      ];

      auditLogs.findByEntity.mockResolvedValue(
        entries,
      );

      mapper.toResponses.mockReturnValue(
        responses,
      );

      const result =
        await controller.findByEntity(
          "client",
          "client-1",
        );

      expect(
        auditLogs.findByEntity,
      ).toHaveBeenCalledWith(
        "client",
        "client-1",
      );

      expect(
        mapper.toResponses,
      ).toHaveBeenCalledWith(
        entries,
      );

      expect(result).toBe(
        responses,
      );
    });

    it("should return an empty array when no audit logs exist", async () => {
      auditLogs.findByEntity.mockResolvedValue(
        [],
      );

      mapper.toResponses.mockReturnValue(
        [],
      );

      const result =
        await controller.findByEntity(
          "client",
          "client-1",
        );

      expect(result).toEqual([]);

      expect(
        mapper.toResponses,
      ).toHaveBeenCalledWith([]);
    });
  });

  // -------------------------------------------------------------------------
  // findByClient
  // -------------------------------------------------------------------------

  describe("findByClient", () => {
    it("should retrieve and map audit logs for a client", async () => {
      const entries = [
        auditLog,
      ];

      const responses = [
        response,
      ];

      auditLogs.findByClient.mockResolvedValue(
        entries,
      );

      mapper.toResponses.mockReturnValue(
        responses,
      );

      const result =
        await controller.findByClient(
          "client-1",
        );

      expect(
        auditLogs.findByClient,
      ).toHaveBeenCalledWith(
        "client-1",
        {
          limit: undefined,
          offset: undefined,
        },
      );

      expect(
        mapper.toResponses,
      ).toHaveBeenCalledWith(
        entries,
      );

      expect(result).toBe(
        responses,
      );
    });

    it("should pass pagination options", async () => {
      auditLogs.findByClient.mockResolvedValue(
        [],
      );

      mapper.toResponses.mockReturnValue(
        [],
      );

      await controller.findByClient(
        "client-1",
        25,
        50,
      );

      expect(
        auditLogs.findByClient,
      ).toHaveBeenCalledWith(
        "client-1",
        {
          limit: 25,
          offset: 50,
        },
      );
    });
  });

  // -------------------------------------------------------------------------
  // findByUser
  // -------------------------------------------------------------------------

  describe("findByUser", () => {
    it("should retrieve and map audit logs for a user", async () => {
      const entries = [
        auditLog,
      ];

      auditLogs.findByUser.mockResolvedValue(
        entries,
      );

      mapper.toResponses.mockReturnValue(
        [response],
      );

      const result =
        await controller.findByUser(
          "user-1",
        );

      expect(
        auditLogs.findByUser,
      ).toHaveBeenCalledWith(
        "user-1",
        {
          limit: undefined,
          offset: undefined,
        },
      );

      expect(
        mapper.toResponses,
      ).toHaveBeenCalledWith(
        entries,
      );

      expect(result).toEqual([
        response,
      ]);
    });

    it("should pass pagination options", async () => {
      auditLogs.findByUser.mockResolvedValue(
        [],
      );

      mapper.toResponses.mockReturnValue(
        [],
      );

      await controller.findByUser(
        "user-1",
        10,
        20,
      );

      expect(
        auditLogs.findByUser,
      ).toHaveBeenCalledWith(
        "user-1",
        {
          limit: 10,
          offset: 20,
        },
      );
    });
  });

  // -------------------------------------------------------------------------
  // findByAction
  // -------------------------------------------------------------------------

  describe("findByAction", () => {
    it("should retrieve and map audit logs by action", async () => {
      const entries = [
        auditLog,
      ];

      auditLogs.findByAction.mockResolvedValue(
        entries,
      );

      mapper.toResponses.mockReturnValue(
        [response],
      );

      const result =
        await controller.findByAction(
          "clients.create",
        );

      expect(
        auditLogs.findByAction,
      ).toHaveBeenCalledWith(
        "clients.create",
        {
          limit: undefined,
          offset: undefined,
        },
      );

      expect(
        mapper.toResponses,
      ).toHaveBeenCalledWith(
        entries,
      );

      expect(result).toEqual([
        response,
      ]);
    });

    it("should pass pagination options", async () => {
      auditLogs.findByAction.mockResolvedValue(
        [],
      );

      mapper.toResponses.mockReturnValue(
        [],
      );

      await controller.findByAction(
        "clients.create",
        50,
        100,
      );

      expect(
        auditLogs.findByAction,
      ).toHaveBeenCalledWith(
        "clients.create",
        {
          limit: 50,
          offset: 100,
        },
      );
    });
  });

  // -------------------------------------------------------------------------
  // findById
  // -------------------------------------------------------------------------

  describe("findById", () => {
    it("should retrieve and map an audit log", async () => {
      auditLogs.findById.mockResolvedValue(
        auditLog,
      );

      mapper.toResponse.mockReturnValue(
        response,
      );

      const result =
        await controller.findById(
          "audit-1",
        );

      expect(
        auditLogs.findById,
      ).toHaveBeenCalledWith(
        "audit-1",
      );

      expect(
        mapper.toResponse,
      ).toHaveBeenCalledWith(
        auditLog,
      );

      expect(result).toBe(
        response,
      );
    });

    it("should return null when the audit log does not exist", async () => {
      auditLogs.findById.mockResolvedValue(
        null,
      );

      const result =
        await controller.findById(
          "missing",
        );

      expect(result).toBeNull();

      expect(
        mapper.toResponse,
      ).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // authorization metadata
  // -------------------------------------------------------------------------

  describe("authorization metadata", () => {
    const reflector =
      new Reflector();

    const getPermission = (
      method:
        keyof AuditLogController,
    ): readonly string[] | undefined => {
      const handler =
        AuditLogController
          .prototype[
        method
        ] as unknown as (
          ...args: unknown[]
        ) => unknown;

      return reflector.get<
        readonly string[]
      >(
        AUTHORIZE_METADATA,
        handler,
      );
    };

    it("should require audit_logs.read for findByEntity", () => {
      expect(
        getPermission(
          "findByEntity",
        ),
      ).toEqual([
        Permissions.AUDIT_LOGS_READ,
      ]);
    });

    it("should require audit_logs.read for findByClient", () => {
      expect(
        getPermission(
          "findByClient",
        ),
      ).toEqual([
        Permissions.AUDIT_LOGS_READ,
      ]);
    });

    it("should require audit_logs.read for findByUser", () => {
      expect(
        getPermission(
          "findByUser",
        ),
      ).toEqual([
        Permissions.AUDIT_LOGS_READ,
      ]);
    });

    it("should require audit_logs.read for findByAction", () => {
      expect(
        getPermission(
          "findByAction",
        ),
      ).toEqual([
        Permissions.AUDIT_LOGS_READ,
      ]);
    });

    it("should require audit_logs.read for findById", () => {
      expect(
        getPermission(
          "findById",
        ),
      ).toEqual([
        Permissions.AUDIT_LOGS_READ,
      ]);
    });
  });
});