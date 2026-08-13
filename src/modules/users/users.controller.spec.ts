import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { Reflector } from "@nestjs/core";
import { AUTHORIZE_METADATA } from "../../common/authorization/constants/authorization.constants.js";
import { PaginatedResponse } from "../../common/interfaces/paginated.response.js";

import { CreateUserDto } from "./dto/create-user.dto.js";
import { FindUsersDto } from "./dto/find-users.dto.js";
import { UpdateUserRolesDto } from "./dto/update-user-roles.dto.js";
import { UpdateUserDto } from "./dto/update-user.dto.js";
import { UserMapper } from "./user.mapper.js";
import { UsersController } from "./users.controller.js";
import { UsersService } from "./users.service.js";

describe("UsersController", () => {
  let controller: UsersController;

  let users: {
    findMany: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    activate: jest.Mock;
    deactivate: jest.Mock;
    unlock: jest.Mock;
    updateRoles: jest.Mock;
  };

  let mapper: {
    toResponse: jest.Mock;
    toSummaries: jest.Mock;
  };

  beforeEach(() => {
    users = {
      findMany: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      activate: jest.fn(),
      deactivate: jest.fn(),
      unlock: jest.fn(),
      updateRoles: jest.fn(),
    };

    mapper = {
      toResponse: jest.fn(),
      toSummaries: jest.fn(),
    };

    controller = new UsersController(
      users as unknown as UsersService,
      mapper as unknown as UserMapper,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findMany", () => {
    it("should return a paginated response", async () => {
      const queryOptions = {
        page: 1,
        pageSize: 20,
        search: "john",
      };

      const dto = {
        toQueryOptions: jest.fn().mockReturnValue(queryOptions),
      } as unknown as FindUsersDto;

      const items = [
        { id: "user-1" },
        { id: "user-2" },
      ];

      const page = {
        items,
        page: 1,
        pageSize: 20,
        totalItems: 2,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      };

      const summaries = [
        { id: "user-1", username: "john" },
        { id: "user-2", username: "jane" },
      ];

      users.findMany.mockResolvedValue(page);
      mapper.toSummaries.mockReturnValue(summaries);

      const result = await controller.findMany(dto);

      expect(dto.toQueryOptions).toHaveBeenCalledTimes(1);

      expect(users.findMany).toHaveBeenCalledWith(
        queryOptions,
      );

      expect(mapper.toSummaries).toHaveBeenCalledWith(
        items,
      );

      expect(result).toBeInstanceOf(PaginatedResponse);
    });
  });

  describe("findById", () => {
    it("should retrieve and map a user", async () => {
      const user = {
        id: "user-1",
      };

      const response = {
        id: "user-1",
        username: "john",
      };

      users.findById.mockResolvedValue(user);
      mapper.toResponse.mockReturnValue(response);

      const result = await controller.findById("user-1");

      expect(users.findById).toHaveBeenCalledWith(
        "user-1",
      );

      expect(mapper.toResponse).toHaveBeenCalledWith(
        user,
      );

      expect(result).toBe(response);
    });
  });

  describe("create", () => {
    it("should create and map a user", async () => {
      const dto = {
        username: "john",
        email: "john@example.com",
      } as CreateUserDto;

      const user = {
        id: "user-1",
      };

      const response = {
        id: "user-1",
        username: "john",
      };

      users.create.mockResolvedValue(user);
      mapper.toResponse.mockReturnValue(response);

      const result = await controller.create(dto);

      expect(users.create).toHaveBeenCalledWith(
        dto,
      );

      expect(mapper.toResponse).toHaveBeenCalledWith(
        user,
      );

      expect(result).toBe(response);
    });
  });

  describe("update", () => {
    it("should update and map a user", async () => {
      const dto = {
        firstName: "John",
      } as UpdateUserDto;

      const user = {
        id: "user-1",
      };

      const response = {
        id: "user-1",
        firstName: "John",
      };

      users.update.mockResolvedValue(user);
      mapper.toResponse.mockReturnValue(response);

      const result = await controller.update(
        "user-1",
        dto,
      );

      expect(users.update).toHaveBeenCalledWith(
        "user-1",
        dto,
      );

      expect(mapper.toResponse).toHaveBeenCalledWith(
        user,
      );

      expect(result).toBe(response);
    });
  });

  describe("delete", () => {
    it("should delete the user and return void", async () => {
      users.delete.mockResolvedValue(undefined);

      const result = await controller.delete(
        "user-1",
      );

      expect(users.delete).toHaveBeenCalledWith(
        "user-1",
      );

      expect(result).toBeUndefined();
    });
  });

  describe("activate", () => {
    it("should activate and map the user", async () => {
      const user = {
        id: "user-1",
      };

      const response = {
        id: "user-1",
        active: true,
      };

      users.activate.mockResolvedValue(user);
      mapper.toResponse.mockReturnValue(response);

      const result = await controller.activate(
        "user-1",
      );

      expect(users.activate).toHaveBeenCalledWith(
        "user-1",
      );

      expect(mapper.toResponse).toHaveBeenCalledWith(
        user,
      );

      expect(result).toBe(response);
    });
  });

  describe("deactivate", () => {
    it("should deactivate and map the user", async () => {
      const user = {
        id: "user-1",
      };

      const response = {
        id: "user-1",
        active: false,
      };

      users.deactivate.mockResolvedValue(user);
      mapper.toResponse.mockReturnValue(response);

      const result = await controller.deactivate(
        "user-1",
      );

      expect(users.deactivate).toHaveBeenCalledWith(
        "user-1",
      );

      expect(mapper.toResponse).toHaveBeenCalledWith(
        user,
      );

      expect(result).toBe(response);
    });
  });

  describe("unlock", () => {
    it("should unlock and map the user", async () => {
      const user = {
        id: "user-1",
      };

      const response = {
        id: "user-1",
        locked: false,
      };

      users.unlock.mockResolvedValue(user);
      mapper.toResponse.mockReturnValue(response);

      const result = await controller.unlock(
        "user-1",
      );

      expect(users.unlock).toHaveBeenCalledWith(
        "user-1",
      );

      expect(mapper.toResponse).toHaveBeenCalledWith(
        user,
      );

      expect(result).toBe(response);
    });
  });

  describe("updateRoles", () => {
    it("should replace the user's roles and map the user", async () => {
      const dto = {
        roleIds: [
          "role-1",
          "role-2",
        ],
      } as UpdateUserRolesDto;

      const user = {
        id: "user-1",
      };

      const response = {
        id: "user-1",
        roles: [],
      };

      users.updateRoles.mockResolvedValue(user);
      mapper.toResponse.mockReturnValue(response);

      const result = await controller.updateRoles(
        "user-1",
        dto,
      );

      expect(users.updateRoles).toHaveBeenCalledWith(
        "user-1",
        dto.roleIds,
      );

      expect(mapper.toResponse).toHaveBeenCalledWith(
        user,
      );

      expect(result).toBe(response);
    });
  });

  describe("authorization metadata", () => {
    const reflector = new Reflector();

    const getPermission = (
      method: keyof UsersController,
    ): readonly string[] | undefined => {
      const handler =
        UsersController.prototype[
        method
        ] as unknown as (...args: unknown[]) => unknown;

      return reflector.get<readonly string[]>(
        AUTHORIZE_METADATA,
        handler,
      );
    };

    it("should require users.read for findMany", () => {
      expect(
        getPermission("findMany"),
      ).toEqual(["users.read"]);
    });

    it("should require users.read for findById", () => {
      expect(
        getPermission("findById"),
      ).toEqual(["users.read"]);
    });

    it("should require users.create for create", () => {
      expect(
        getPermission("create"),
      ).toEqual(["users.create"]);
    });

    it("should require users.update for update", () => {
      expect(
        getPermission("update"),
      ).toEqual(["users.update"]);
    });

    it("should require users.delete for delete", () => {
      expect(
        getPermission("delete"),
      ).toEqual(["users.delete"]);
    });

    it("should require users.activate for activate", () => {
      expect(
        getPermission("activate"),
      ).toEqual(["users.activate"]);
    });

    it("should require users.deactivate for deactivate", () => {
      expect(
        getPermission("deactivate"),
      ).toEqual(["users.deactivate"]);
    });

    it("should require users.unlock for unlock", () => {
      expect(
        getPermission("unlock"),
      ).toEqual(["users.unlock"]);
    });

    it("should require users.roles.update for updateRoles", () => {
      expect(
        getPermission("updateRoles"),
      ).toEqual(["users.roles.update"]);
    });
  });
});