import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import { AuditLogRepository } from "../../../repositories/auditLogRepository.js";
import { AuditLogService } from "./audit-log.service.js";

describe("AuditLogService", () => {
  let service: AuditLogService;

  const auditLogs = {
    create: jest.fn(),

    findById: jest.fn(),

    findByEntity: jest.fn(),

    findByClient: jest.fn(),

    findByUser: jest.fn(),

    findByAction: jest.fn(),
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

  beforeEach(() => {
    jest.clearAllMocks();

    service =
      new AuditLogService(
        auditLogs as unknown as AuditLogRepository,
      );
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------

  describe("create", () => {
    it("should create an audit log", async () => {
      auditLogs.create.mockResolvedValue(
        auditLog,
      );

      const result =
        await service.create({
          clientId: "client-1",
          userId: "user-1",

          entityType: "client",
          entityId: "client-1",

          action: "clients.create",

          oldValues: null,

          newValues: {
            name: "Test Client",
          },

          ipAddress:
            "127.0.0.1",

          userAgent:
            "Jest",
        });

      expect(
        auditLogs.create,
      ).toHaveBeenCalledWith({
        client: {
          connect: {
            id: "client-1",
          },
        },

        user: {
          connect: {
            id: "user-1",
          },
        },

        entityType:
          "client",

        entityId:
          "client-1",

        action:
          "clients.create",

        oldValues:
          null,

        newValues: {
          name: "Test Client",
        },

        ipAddress:
          "127.0.0.1",

        userAgent:
          "Jest",
      });

      expect(result).toEqual(
        auditLog,
      );
    });

    it("should create an audit log without client or user", async () => {
      auditLogs.create.mockResolvedValue(
        auditLog,
      );

      await service.create({
        entityType: "system",
        entityId: "system-1",
        action: "system.import",
      });

      expect(
        auditLogs.create,
      ).toHaveBeenCalledWith({
        entityType:
          "system",

        entityId:
          "system-1",

        action:
          "system.import",
      });
    });

    it("should preserve JSON values", async () => {
      auditLogs.create.mockResolvedValue(
        auditLog,
      );

      const oldValues = {
        status: "ACTIVE",
        name: "Old Name",
      };

      const newValues = {
        status: "DISABLED",
        name: "New Name",
      };

      await service.create({
        entityType: "client",
        entityId: "client-1",
        action: "clients.disable",
        oldValues,
        newValues,
      });

      expect(
        auditLogs.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          oldValues,
          newValues,
        }),
      );
    });

    it("should omit optional fields when they are undefined", async () => {
      auditLogs.create.mockResolvedValue(
        auditLog,
      );

      await service.create({
        entityType: "client",
        entityId: "client-1",
        action: "clients.create",
      });

      expect(
        auditLogs.create,
      ).toHaveBeenCalledWith({
        entityType:
          "client",

        entityId:
          "client-1",

        action:
          "clients.create",
      });
    });

    it("should propagate repository errors", async () => {
      auditLogs.create.mockRejectedValue(
        new Error(
          "Database unavailable",
        ),
      );

      await expect(
        service.create({
          entityType: "client",
          entityId: "client-1",
          action: "clients.create",
        }),
      ).rejects.toThrow(
        "Database unavailable",
      );
    });
  });

  // -------------------------------------------------------------------------
  // findById
  // -------------------------------------------------------------------------

  describe("findById", () => {
    it("should find an audit log by ID", async () => {
      auditLogs.findById.mockResolvedValue(
        auditLog,
      );

      const result =
        await service.findById(
          "audit-1",
        );

      expect(
        auditLogs.findById,
      ).toHaveBeenCalledWith(
        "audit-1",
      );

      expect(result).toEqual(
        auditLog,
      );
    });

    it("should return null when the audit log does not exist", async () => {
      auditLogs.findById.mockResolvedValue(
        null,
      );

      await expect(
        service.findById(
          "missing",
        ),
      ).resolves.toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // findByEntity
  // -------------------------------------------------------------------------

  describe("findByEntity", () => {
    it("should find audit logs for an entity", async () => {
      const entries = [
        auditLog,
      ];

      auditLogs.findByEntity.mockResolvedValue(
        entries,
      );

      const result =
        await service.findByEntity(
          "client",
          "client-1",
        );

      expect(
        auditLogs.findByEntity,
      ).toHaveBeenCalledWith(
        "client",
        "client-1",
      );

      expect(result).toEqual(
        entries,
      );
    });
  });

  // -------------------------------------------------------------------------
  // findByClient
  // -------------------------------------------------------------------------

  describe("findByClient", () => {
    it("should find audit logs for a client", async () => {
      const entries = [
        auditLog,
      ];

      auditLogs.findByClient.mockResolvedValue(
        entries,
      );

      const result =
        await service.findByClient(
          "client-1",
        );

      expect(
        auditLogs.findByClient,
      ).toHaveBeenCalledWith(
        "client-1",
        undefined,
      );

      expect(result).toEqual(
        entries,
      );
    });

    it("should pass pagination options", async () => {
      auditLogs.findByClient.mockResolvedValue(
        [],
      );

      await service.findByClient(
        "client-1",
        {
          limit: 25,
          offset: 50,
        },
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
    it("should find audit logs for a user", async () => {
      const entries = [
        auditLog,
      ];

      auditLogs.findByUser.mockResolvedValue(
        entries,
      );

      const result =
        await service.findByUser(
          "user-1",
        );

      expect(
        auditLogs.findByUser,
      ).toHaveBeenCalledWith(
        "user-1",
        undefined,
      );

      expect(result).toEqual(
        entries,
      );
    });

    it("should pass pagination options", async () => {
      auditLogs.findByUser.mockResolvedValue(
        [],
      );

      await service.findByUser(
        "user-1",
        {
          limit: 10,
          offset: 20,
        },
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
    it("should find audit logs by action", async () => {
      const entries = [
        auditLog,
      ];

      auditLogs.findByAction.mockResolvedValue(
        entries,
      );

      const result =
        await service.findByAction(
          "clients.create",
        );

      expect(
        auditLogs.findByAction,
      ).toHaveBeenCalledWith(
        "clients.create",
        undefined,
      );

      expect(result).toEqual(
        entries,
      );
    });

    it("should pass pagination options", async () => {
      auditLogs.findByAction.mockResolvedValue(
        [],
      );

      await service.findByAction(
        "clients.create",
        {
          limit: 50,
          offset: 100,
        },
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
});