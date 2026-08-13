import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import "reflect-metadata";
import { PermissionsController } from "./permissions.controller.js";

import { AUTHORIZE_METADATA } from "../../../common/authorization/constants/authorization.constants.js";

import type { Permission } from "@prisma/client";

import type { Page } from "../../../common/query/page.interface.js";
import { PermissionMapper } from "../permission.mapper.js";
import { PermissionService } from "../services/permission.service.js";

describe("PermissionsController", () => {
  let controller: PermissionsController;

  let permissions: {
    findMany: jest.Mock;
    findById: jest.Mock;
  };

  let mapper: {
    toResponse: jest.Mock;
    toResponses: jest.Mock;
  };

  const permission: Permission = {
    id: "11111111-1111-1111-1111-111111111111",
    name: "permissions.read",
    description: "Read permissions.",
    module: "permissions",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  };

  const permissionResponse = {
    id: permission.id,
    name: permission.name,
    description: permission.description,
    module: permission.module,
  };

  beforeEach(() => {
    permissions = {
      findMany: jest.fn(),
      findById: jest.fn(),
    };

    mapper = {
      toResponse: jest.fn(),
      toResponses: jest.fn(),
    };

    controller = new PermissionsController(
      permissions as unknown as PermissionService,
      mapper as unknown as PermissionMapper,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findMany", () => {
    it("should retrieve and map permissions", async () => {
      const page: Page<Permission> = {
        items: [permission],
        page: 1,
        pageSize: 20,
        totalItems: 1,
      };

      permissions.findMany.mockResolvedValue(page);

      mapper.toResponses.mockReturnValue([
        permissionResponse,
      ]);

      const result =
        await controller.findMany({
          page: 1,
          pageSize: 20,
          module: "permissions",
          search: "read",
        });

      expect(
        permissions.findMany,
      ).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
        module: "permissions",
        search: "read",
      });

      expect(
        mapper.toResponses,
      ).toHaveBeenCalledWith([
        permission,
      ]);

      expect(result).toBeDefined();
    });

    it("should pass pagination defaults through to the service", async () => {
      const page: Page<Permission> = {
        items: [],
        page: 1,
        pageSize: 20,
        totalItems: 0,
      };

      permissions.findMany.mockResolvedValue(page);
      mapper.toResponses.mockReturnValue([]);

      await controller.findMany({});

      expect(
        permissions.findMany,
      ).toHaveBeenCalledWith({
        page: undefined,
        pageSize: undefined,
        module: undefined,
        search: undefined,
      });
    });
  });

  describe("findById", () => {
    it("should retrieve and map a permission", async () => {
      permissions.findById.mockResolvedValue(
        permission,
      );

      mapper.toResponse.mockReturnValue(
        permissionResponse,
      );

      const result =
        await controller.findById(
          permission.id,
        );

      expect(
        permissions.findById,
      ).toHaveBeenCalledWith(
        permission.id,
      );

      expect(
        mapper.toResponse,
      ).toHaveBeenCalledWith(
        permission,
      );

      expect(result).toEqual(
        permissionResponse,
      );
    });
  });

  describe("authorization metadata", () => {
    it("should require permissions.read for findMany", () => {
      const metadata =
        Reflect.getMetadata(
          AUTHORIZE_METADATA,
          PermissionsController.prototype.findMany,
        );

      expect(metadata).toEqual([
        "permissions.read",
      ]);
    });

    it("should require permissions.read for findById", () => {
      const metadata =
        Reflect.getMetadata(
          AUTHORIZE_METADATA,
          PermissionsController.prototype.findById,
        );

      expect(metadata).toEqual([
        "permissions.read",
      ]);
    });
  });
});