import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { initTelemetry } from "@pague-co-uk/sms-gateway-telemetry";

import type { Permission, Role } from "@prisma/client";

import { RoleService } from "./roles.service.js";

import type { PermissionRepository } from "../../../repositories/PermissionRepository.js";
import type { RolePermissionRepository } from "../../../repositories/RolePermissionRepository.js";
import type {
  RoleRepository,
  RoleWithPermissions,
} from "../../../repositories/RoleRepository.js";

import type { AuditService } from "../../../audit/services/audit.service.js";

import { PermissionsNotFoundException } from "../../../exceptions/entity/permissions.exceptions.js";
import {
  RoleAlreadyExistsException,
  RoleNotFoundException,
} from "../../../exceptions/entity/roles.exception.js";

describe("RoleService", () => {
  let service: RoleService;

  let roles: {
    create: jest.Mock;
    findById: jest.Mock;
    findByIdWithPermissions: jest.Mock;
    findByName: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    withDatabase: jest.Mock;
    withTransaction: jest.Mock;
  };

  let rolePermissions: {
    withDatabase: jest.Mock;
    deleteByRoleId: jest.Mock;
    createMany: jest.Mock;
  };

  let permissions: {
    findByIds: jest.Mock;
  };

  let audit: {
    record: jest.Mock;
  };

  beforeAll(() => {
    initTelemetry({
      enabled: false,
      service: {
        name: "control-plane-api-test",
        version: "test",
      },
      collector: {
        tracesEndpoint: "http://localhost:4318/v1/traces",
        metricsEndpoint: "http://localhost:4318/v1/metrics",
        logsEndpoint: "http://localhost:4318/v1/logs",
      },
      metrics: {
        exportIntervalMillis: 60_000,
      },
      registerShutdownHooks: false,
    });
  });

  beforeEach(() => {
    roles = {
      create: jest.fn(),
      findById: jest.fn(),
      findByIdWithPermissions: jest.fn(),
      findByName: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      withDatabase: jest.fn(),
      withTransaction: jest.fn(),
    };

    rolePermissions = {
      withDatabase: jest.fn(),
      deleteByRoleId: jest.fn(),
      createMany: jest.fn(),
    };

    permissions = {
      findByIds: jest.fn(),
    };

    audit = {
      record: jest.fn(),
    };

    service = new RoleService(
      roles as unknown as RoleRepository,
      permissions as unknown as PermissionRepository,
      rolePermissions as unknown as RolePermissionRepository,
      audit as unknown as AuditService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Fixtures
  // -------------------------------------------------------------------------

  const role: Role = {
    id: "role-1",
    name: "Administrator",
    description: "System administrator",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  };

  const permission: Permission = {
    id: "permission-1",
    name: "users.read",
    description: "View users.",
    module: "users",
    createdAt: new Date("2026-01-01"),
  };

  const secondPermission: Permission = {
    id: "permission-2",
    name: "users.create",
    description: "Create users.",
    module: "users",
    createdAt: new Date("2026-01-01"),
  };

  const roleWithPermissions =
    (): RoleWithPermissions => ({
      ...role,
      permissions: [
        {
          roleId: role.id,
          permissionId: permission.id,
          assignedAt: new Date("2026-01-01"),
          permission,
        },
      ],
    });

  // -------------------------------------------------------------------------
  // findById
  // -------------------------------------------------------------------------

  describe("findById", () => {
    it("should return the role with permissions", async () => {
      const result = roleWithPermissions();

      roles.findByIdWithPermissions.mockResolvedValue(
        result,
      );

      await expect(
        service.findById("role-1"),
      ).resolves.toEqual(result);

      expect(
        roles.findByIdWithPermissions,
      ).toHaveBeenCalledWith("role-1");
    });

    it("should throw when the role does not exist", async () => {
      roles.findByIdWithPermissions.mockResolvedValue(
        null,
      );

      await expect(
        service.findById("role-1"),
      ).rejects.toBeInstanceOf(
        RoleNotFoundException,
      );

      expect(
        roles.findByIdWithPermissions,
      ).toHaveBeenCalledWith("role-1");
    });
  });

  // -------------------------------------------------------------------------
  // findMany
  // -------------------------------------------------------------------------

  describe("findMany", () => {
    it("should retrieve paginated roles", async () => {
      const page = {
        items: [role],
        page: 1,
        pageSize: 20,
        totalItems: 1,
      };

      roles.findMany.mockResolvedValue(page);

      const query = {
        page: 1,
        pageSize: 20,
        search: "admin",
      };

      await expect(
        service.findMany(query),
      ).resolves.toEqual(page);

      expect(
        roles.findMany,
      ).toHaveBeenCalledWith(query);
    });
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------

  describe("create", () => {
    it("should reject duplicate role names", async () => {
      roles.findByName.mockResolvedValue(
        role,
      );

      await expect(
        service.create({
          name: "Administrator",
          description:
            "System administrator",
        }),
      ).rejects.toBeInstanceOf(
        RoleAlreadyExistsException,
      );

      expect(
        roles.findByName,
      ).toHaveBeenCalledWith(
        "Administrator",
      );

      expect(
        roles.create,
      ).not.toHaveBeenCalled();
    });

    it("should create the role and record an audit event", async () => {
      const createdRole =
        role;

      const createdWithPermissions =
        roleWithPermissions();

      roles.findByName.mockResolvedValue(
        null,
      );

      roles.create.mockResolvedValue(
        createdRole,
      );

      roles.findByIdWithPermissions.mockResolvedValue(
        createdWithPermissions,
      );

      audit.record.mockResolvedValue(
        undefined,
      );

      const result =
        await service.create({
          name: "Administrator",
          description:
            "System administrator",
        });

      expect(
        roles.create,
      ).toHaveBeenCalledWith({
        name: "Administrator",
        description:
          "System administrator",
      });

      expect(
        audit.record,
      ).toHaveBeenCalledWith({
        action: "role.created",
        resourceType: "Role",
        resourceId: "role-1",
        metadata: {
          name: "Administrator",
        },
      });

      expect(result).toEqual(
        createdWithPermissions,
      );
    });
  });

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------

  describe("update", () => {
    it("should reject a duplicate role name", async () => {
      roles.findByIdWithPermissions.mockResolvedValue(
        roleWithPermissions(),
      );

      const conflictingRole: Role = {
        ...role,
        id: "role-2",
        name: "Operations",
      };

      roles.findByName.mockResolvedValue(
        conflictingRole,
      );

      await expect(
        service.update("role-1", {
          name: "Operations",
        }),
      ).rejects.toBeInstanceOf(
        RoleAlreadyExistsException,
      );

      expect(
        roles.update,
      ).not.toHaveBeenCalled();
    });

    it("should allow the existing role to retain its name", async () => {
      const existing =
        roleWithPermissions();

      roles.findByIdWithPermissions.mockResolvedValue(
        existing,
      );

      roles.findByName.mockResolvedValue(
        role,
      );

      roles.update.mockResolvedValue(
        role,
      );

      roles.findByIdWithPermissions
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(existing);

      audit.record.mockResolvedValue(
        undefined,
      );

      const result =
        await service.update(
          "role-1",
          {
            name: "Administrator",
          },
        );

      expect(
        roles.update,
      ).toHaveBeenCalledWith(
        "role-1",
        {
          name: "Administrator",
        },
      );

      expect(result).toEqual(
        existing,
      );
    });

    it("should update the role and record an audit event", async () => {
      const existing =
        roleWithPermissions();

      const updatedRole =
        roleWithPermissions();

      updatedRole.name =
        "Operations";

      roles.findByIdWithPermissions
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(updatedRole);

      roles.findByName.mockResolvedValue(
        null,
      );

      roles.update.mockResolvedValue(
        {
          ...role,
          name: "Operations",
        },
      );

      audit.record.mockResolvedValue(
        undefined,
      );

      const result =
        await service.update(
          "role-1",
          {
            name: "Operations",
            description:
              "Operations administrator",
          },
        );

      expect(
        roles.update,
      ).toHaveBeenCalledWith(
        "role-1",
        {
          name: "Operations",
          description:
            "Operations administrator",
        },
      );

      expect(
        audit.record,
      ).toHaveBeenCalledWith({
        action: "role.updated",
        resourceType: "Role",
        resourceId: "role-1",
        metadata: {
          name: "Operations",
        },
      });

      expect(result).toEqual(
        updatedRole,
      );
    });
  });

  // -------------------------------------------------------------------------
  // delete
  // -------------------------------------------------------------------------

  describe("delete", () => {
    it("should throw when the role does not exist", async () => {
      roles.findByIdWithPermissions.mockResolvedValue(
        null,
      );

      await expect(
        service.delete("role-1"),
      ).rejects.toBeInstanceOf(
        RoleNotFoundException,
      );

      expect(
        roles.withTransaction,
      ).not.toHaveBeenCalled();
    });

    it("should delete the role and its permissions transactionally", async () => {
      const existing =
        roleWithPermissions();

      roles.findByIdWithPermissions.mockResolvedValue(
        existing,
      );

      const txRolePermissions = {
        deleteByRoleId:
          jest.fn().mockResolvedValue({
            count: 1,
          }),
      };

      const txRoles = {
        delete:
          jest.fn().mockResolvedValue(
            role,
          ),
      };

      rolePermissions.withDatabase.mockReturnValue(
        txRolePermissions,
      );

      roles.withTransaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<void>) =>
          callback({}),
      );

      roles.withDatabase = jest
        .fn()
        .mockReturnValue(txRoles);

      audit.record.mockResolvedValue(
        undefined,
      );

      await expect(
        service.delete("role-1"),
      ).resolves.toBeUndefined();

      expect(
        rolePermissions.withDatabase,
      ).toHaveBeenCalled();

      expect(
        txRolePermissions.deleteByRoleId,
      ).toHaveBeenCalledWith(
        "role-1",
      );

      expect(
        txRoles.delete,
      ).toHaveBeenCalledWith(
        "role-1",
      );

      expect(
        audit.record,
      ).toHaveBeenCalledWith({
        action: "role.deleted",
        resourceType: "Role",
        resourceId: "role-1",
        metadata: {
          name: "Administrator",
        },
      });
    });
  });

  // -------------------------------------------------------------------------
  // updatePermissions
  // -------------------------------------------------------------------------

  describe("updatePermissions", () => {
    it("should reject missing permissions", async () => {
      roles.findByIdWithPermissions.mockResolvedValue(
        roleWithPermissions(),
      );

      permissions.findByIds.mockResolvedValue([
        permission,
      ]);

      await expect(
        service.updatePermissions(
          "role-1",
          [
            "permission-1",
            "permission-2",
          ],
        ),
      ).rejects.toBeInstanceOf(
        PermissionsNotFoundException,
      );

      expect(
        permissions.findByIds,
      ).toHaveBeenCalledWith([
        "permission-1",
        "permission-2",
      ]);

      expect(
        roles.withTransaction,
      ).not.toHaveBeenCalled();
    });

    it("should deduplicate permission IDs", async () => {
      roles.findByIdWithPermissions.mockResolvedValue(
        roleWithPermissions(),
      );

      permissions.findByIds.mockResolvedValue([
        permission,
        secondPermission,
      ]);

      const txRolePermissions = {
        deleteByRoleId:
          jest.fn().mockResolvedValue({
            count: 1,
          }),

        createMany:
          jest.fn().mockResolvedValue({
            count: 2,
          }),
      };

      rolePermissions.withDatabase.mockReturnValue(
        txRolePermissions,
      );

      roles.withTransaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<void>) =>
          callback({}),
      );

      const updated =
        roleWithPermissions();

      roles.findByIdWithPermissions
        .mockResolvedValueOnce(
          roleWithPermissions(),
        )
        .mockResolvedValueOnce(
          updated,
        );

      audit.record.mockResolvedValue(
        undefined,
      );

      await service.updatePermissions(
        "role-1",
        [
          "permission-1",
          "permission-1",
          "permission-2",
        ],
      );

      expect(
        permissions.findByIds,
      ).toHaveBeenCalledWith([
        "permission-1",
        "permission-2",
      ]);

      expect(
        txRolePermissions.createMany,
      ).toHaveBeenCalledWith(
        "role-1",
        [
          "permission-1",
          "permission-2",
        ],
      );
    });

    it("should replace role permissions transactionally", async () => {
      roles.findByIdWithPermissions.mockResolvedValue(
        roleWithPermissions(),
      );

      permissions.findByIds.mockResolvedValue([
        permission,
        secondPermission,
      ]);

      const txRolePermissions = {
        deleteByRoleId:
          jest.fn().mockResolvedValue({
            count: 1,
          }),

        createMany:
          jest.fn().mockResolvedValue({
            count: 2,
          }),
      };

      rolePermissions.withDatabase.mockReturnValue(
        txRolePermissions,
      );

      roles.withTransaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<void>) =>
          callback({}),
      );

      const updated =
        roleWithPermissions();

      roles.findByIdWithPermissions
        .mockResolvedValueOnce(
          roleWithPermissions(),
        )
        .mockResolvedValueOnce(
          updated,
        );

      audit.record.mockResolvedValue(
        undefined,
      );

      const result =
        await service.updatePermissions(
          "role-1",
          [
            "permission-1",
            "permission-2",
          ],
        );

      expect(
        txRolePermissions.deleteByRoleId,
      ).toHaveBeenCalledWith(
        "role-1",
      );

      expect(
        txRolePermissions.createMany,
      ).toHaveBeenCalledWith(
        "role-1",
        [
          "permission-1",
          "permission-2",
        ],
      );

      expect(
        audit.record,
      ).toHaveBeenCalledWith({
        action:
          "role.permissions.updated",
        resourceType: "Role",
        resourceId: "role-1",
        metadata: {
          permissionIds: [
            "permission-1",
            "permission-2",
          ],
        },
      });

      expect(result).toEqual(
        updated,
      );
    });

    it("should remove all permissions when an empty list is supplied", async () => {
      roles.findByIdWithPermissions.mockResolvedValue(
        roleWithPermissions(),
      );

      permissions.findByIds.mockResolvedValue(
        [],
      );

      const txRolePermissions = {
        deleteByRoleId:
          jest.fn().mockResolvedValue({
            count: 1,
          }),

        createMany:
          jest.fn(),
      };

      rolePermissions.withDatabase.mockReturnValue(
        txRolePermissions,
      );

      roles.withTransaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<void>) =>
          callback({}),
      );

      const updated =
        roleWithPermissions();

      roles.findByIdWithPermissions
        .mockResolvedValueOnce(
          roleWithPermissions(),
        )
        .mockResolvedValueOnce(
          updated,
        );

      audit.record.mockResolvedValue(
        undefined,
      );

      await service.updatePermissions(
        "role-1",
        [],
      );

      expect(
        permissions.findByIds,
      ).toHaveBeenCalledWith([]);

      expect(
        txRolePermissions.deleteByRoleId,
      ).toHaveBeenCalledWith(
        "role-1",
      );

      expect(
        txRolePermissions.createMany,
      ).not.toHaveBeenCalled();
    });
  });
});
