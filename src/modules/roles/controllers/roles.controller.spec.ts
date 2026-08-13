import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import { RolesController } from "./roles.controller.js";

import type { RoleMapper } from "../mapper/role.mapper.js";
import type { RoleService } from "../services/roles.service.js";

import { AUTHORIZE_METADATA } from "../../../common/authorization/constants/authorization.constants.js";
import { Permissions } from "../../../common/authorization/permissions/permissions.registry.js";

import type { Role } from "@prisma/client";
import { PaginatedResponse } from "../../../common/interfaces/paginated.response.js";
import type { RoleWithPermissions } from "../../../repositories/RoleRepository.js";

describe("RolesController", () => {
  let controller: RolesController;

  let roles: {
    findMany: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    updatePermissions: jest.Mock;
  };

  let mapper: {
    toSummary: jest.Mock;
    toSummaries: jest.Mock;
    toResponse: jest.Mock;
    toResponses: jest.Mock;
  };

  beforeEach(() => {
    roles = {
      findMany: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updatePermissions: jest.fn(),
    };

    mapper = {
      toSummary: jest.fn(),
      toSummaries: jest.fn(),
      toResponse: jest.fn(),
      toResponses: jest.fn(),
    };

    controller = new RolesController(
      roles as unknown as RoleService,
      mapper as unknown as RoleMapper,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  describe("findMany", () => {
    it("should return a paginated response", async () => {
      const items = [
        {
          id: "role-1",
          name: "Administrator",
          description: "System administrator",
        },
      ] as Role[];

      const page = {
        items,
        page: 1,
        pageSize: 20,
        totalItems: 1,
      };

      const summaries = [
        {
          id: "role-1",
          name: "Administrator",
          description: "System administrator",
        },
      ];

      roles.findMany.mockResolvedValue(page);
      mapper.toSummaries.mockReturnValue(
        summaries,
      );

      const result =
        await controller.findMany({
          page: 1,
          pageSize: 20,
          search: "admin",
        });

      expect(
        roles.findMany,
      ).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
        search: "admin",
      });

      expect(
        mapper.toSummaries,
      ).toHaveBeenCalledWith(items);

      expect(result).toBeInstanceOf(
        PaginatedResponse,
      );

      expect(result.data).toEqual(
        summaries,
      );
    });
  });

  describe("findById", () => {
    it("should retrieve and map a role", async () => {
      const role =
        {} as RoleWithPermissions;

      const response = {
        id: "role-1",
        name: "Administrator",
        description: "System administrator",
        permissions: [],
      };

      roles.findById.mockResolvedValue(role);
      mapper.toResponse.mockReturnValue(
        response,
      );

      const result =
        await controller.findById(
          "role-1",
        );

      expect(
        roles.findById,
      ).toHaveBeenCalledWith(
        "role-1",
      );

      expect(
        mapper.toResponse,
      ).toHaveBeenCalledWith(
        role,
      );

      expect(result).toEqual(
        response,
      );
    });
  });

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  describe("create", () => {
    it("should create and map a role", async () => {
      const dto = {
        name: "Administrator",
        description:
          "System administrator",
      };

      const role =
        {} as RoleWithPermissions;

      const response = {
        id: "role-1",
        name: "Administrator",
        description:
          "System administrator",
        permissions: [],
      };

      roles.create.mockResolvedValue(role);
      mapper.toResponse.mockReturnValue(
        response,
      );

      const result =
        await controller.create(dto);

      expect(
        roles.create,
      ).toHaveBeenCalledWith(
        dto,
      );

      expect(
        mapper.toResponse,
      ).toHaveBeenCalledWith(
        role,
      );

      expect(result).toEqual(
        response,
      );
    });
  });

  describe("update", () => {
    it("should update and map a role", async () => {
      const dto = {
        name: "Operations",
        description:
          "Operations administrator",
      };

      const role =
        {} as RoleWithPermissions;

      const response = {
        id: "role-1",
        name: "Operations",
        description:
          "Operations administrator",
        permissions: [],
      };

      roles.update.mockResolvedValue(role);
      mapper.toResponse.mockReturnValue(
        response,
      );

      const result =
        await controller.update(
          "role-1",
          dto,
        );

      expect(
        roles.update,
      ).toHaveBeenCalledWith(
        "role-1",
        dto,
      );

      expect(
        mapper.toResponse,
      ).toHaveBeenCalledWith(
        role,
      );

      expect(result).toEqual(
        response,
      );
    });
  });

  describe("delete", () => {
    it("should delete the role and return void", async () => {
      roles.delete.mockResolvedValue(
        undefined,
      );

      const result =
        await controller.delete(
          "role-1",
        );

      expect(
        roles.delete,
      ).toHaveBeenCalledWith(
        "role-1",
      );

      expect(result).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Permissions
  // -------------------------------------------------------------------------

  describe("updatePermissions", () => {
    it("should replace the role permissions and map the role", async () => {
      const permissionIds = [
        "permission-1",
        "permission-2",
      ];

      const dto = {
        permissionIds,
      };

      const role =
        {} as RoleWithPermissions;

      const response = {
        id: "role-1",
        name: "Administrator",
        description:
          "System administrator",
        permissions: [],
      };

      roles.updatePermissions.mockResolvedValue(
        role,
      );

      mapper.toResponse.mockReturnValue(
        response,
      );

      const result =
        await controller.updatePermissions(
          "role-1",
          dto,
        );

      expect(
        roles.updatePermissions,
      ).toHaveBeenCalledWith(
        "role-1",
        permissionIds,
      );

      expect(
        mapper.toResponse,
      ).toHaveBeenCalledWith(
        role,
      );

      expect(result).toEqual(
        response,
      );
    });
  });

  // -------------------------------------------------------------------------
  // Authorization metadata
  // -------------------------------------------------------------------------

  describe("authorization metadata", () => {
    const getPermissions = (
      method: keyof RolesController,
    ): readonly string[] | undefined => {
      return Reflect.getMetadata(
        AUTHORIZE_METADATA,
        RolesController.prototype[
        method
        ],
      );
    };

    it("should require roles.read for findMany", () => {
      expect(
        getPermissions("findMany"),
      ).toEqual([
        Permissions.ROLES_READ,
      ]);
    });

    it("should require roles.read for findById", () => {
      expect(
        getPermissions("findById"),
      ).toEqual([
        Permissions.ROLES_READ,
      ]);
    });

    it("should require roles.create for create", () => {
      expect(
        getPermissions("create"),
      ).toEqual([
        Permissions.ROLES_CREATE,
      ]);
    });

    it("should require roles.update for update", () => {
      expect(
        getPermissions("update"),
      ).toEqual([
        Permissions.ROLES_UPDATE,
      ]);
    });

    it("should require roles.delete for delete", () => {
      expect(
        getPermissions("delete"),
      ).toEqual([
        Permissions.ROLES_DELETE,
      ]);
    });

    it("should require roles.update for updatePermissions", () => {
      expect(
        getPermissions(
          "updatePermissions",
        ),
      ).toEqual([
        Permissions.ROLES_UPDATE,
      ]);
    });
  });
});
