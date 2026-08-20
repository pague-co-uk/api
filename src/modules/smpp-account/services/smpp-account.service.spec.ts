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
import { Permissions } from "../../../common/authorization/permissions/permissions.registry.js";

import { SmppAccountService } from "../services/smpp-account.service.js";
import { SmppAccountMapper } from "../smpp-account.mapper.js";

import { SmppAccountController } from "../controller/smpp-account.controller.js";
import { ChangeSmppPasswordDto } from "../dto/change-smpp-password.dto.js";
import type { CreateSmppAccountDto } from "../dto/create-smpp-account.dto.js";
import type { UpdateSmppAccountDto } from "../dto/update-smpp-account.dto.js";

describe("SmppAccountController", () => {
  let controller: SmppAccountController;

  let accounts: {
    findByClient: jest.Mock;
    findById: jest.Mock;
    findByPublicId: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    changePassword: jest.Mock;
    activate: jest.Mock;
    disable: jest.Mock;
  };

  let mapper: {
    toResponse: jest.Mock;
    toResponses: jest.Mock;
  };

  const clientId = "client-1";
  const accountId = "smpp-account-1";
  const publicId = "SMPP-001";

  const account = {
    id: accountId,
    publicId,
    clientId,

    systemId: "client-system",

    passwordHash:
      "hashed-password",

    status: "ACTIVE",

    maxConcurrentBinds: 1,
    enquireLinkInterval: 30,

    createdAt:
      new Date("2026-08-15T10:00:00.000Z"),

    updatedAt:
      new Date("2026-08-15T10:00:00.000Z"),
  };

  const response = {
    id: accountId,
    publicId,
    clientId,

    systemId: "client-system",

    status: "ACTIVE",

    maxConcurrentBinds: 1,
    enquireLinkInterval: 30,

    createdAt:
      account.createdAt,

    updatedAt:
      account.updatedAt,
  };

  beforeEach(() => {
    accounts = {
      findByClient: jest.fn(),
      findById: jest.fn(),
      findByPublicId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      changePassword: jest.fn(),
      activate: jest.fn(),
      disable: jest.fn(),
    };

    mapper = {
      toResponse: jest.fn(),
      toResponses: jest.fn(),
    };

    controller =
      new SmppAccountController(
        accounts as unknown as SmppAccountService,
        mapper as unknown as SmppAccountMapper,
      );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // findByClient
  // -------------------------------------------------------------------------

  describe("findByClient", () => {
    it("should retrieve and map SMPP accounts for a client", async () => {
      const entries = [
        account,
        {
          ...account,
          id: "smpp-account-2",
          publicId: "SMPP-002",
        },
      ];

      const responses = [
        response,
        {
          ...response,
          id: "smpp-account-2",
          publicId: "SMPP-002",
        },
      ];

      accounts.findByClient.mockResolvedValue(
        entries,
      );

      mapper.toResponses.mockReturnValue(
        responses,
      );

      const result =
        await controller.findByClient(
          clientId,
        );

      expect(
        accounts.findByClient,
      ).toHaveBeenCalledWith(
        clientId,
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

    it("should return an empty array when the client has no accounts", async () => {
      accounts.findByClient.mockResolvedValue(
        [],
      );

      mapper.toResponses.mockReturnValue(
        [],
      );

      const result =
        await controller.findByClient(
          clientId,
        );

      expect(
        accounts.findByClient,
      ).toHaveBeenCalledWith(
        clientId,
      );

      expect(
        mapper.toResponses,
      ).toHaveBeenCalledWith(
        [],
      );

      expect(result).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // findById
  // -------------------------------------------------------------------------

  describe("findById", () => {
    it("should retrieve and map an SMPP account", async () => {
      accounts.findById.mockResolvedValue(
        account,
      );

      mapper.toResponse.mockReturnValue(
        response,
      );

      const result =
        await controller.findById(
          clientId,
          accountId,
        );

      expect(
        accounts.findById,
      ).toHaveBeenCalledWith(
        clientId,
        accountId,
      );

      expect(
        mapper.toResponse,
      ).toHaveBeenCalledWith(
        account,
      );

      expect(result).toBe(
        response,
      );
    });
  });

  // -------------------------------------------------------------------------
  // findByPublicId
  // -------------------------------------------------------------------------

  describe("findByPublicId", () => {
    it("should retrieve and map an SMPP account by public ID", async () => {
      accounts.findByPublicId.mockResolvedValue(
        account,
      );

      mapper.toResponse.mockReturnValue(
        response,
      );

      const result =
        await controller.findByPublicId(
          clientId,
          publicId,
        );

      expect(
        accounts.findByPublicId,
      ).toHaveBeenCalledWith(
        clientId,
        publicId,
      );

      expect(
        mapper.toResponse,
      ).toHaveBeenCalledWith(
        account,
      );

      expect(result).toBe(
        response,
      );
    });
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------

  describe("create", () => {
    it("should create and map an SMPP account", async () => {
      const dto = {
        systemId: "client-system",
        password: "secret-password",
        maxConcurrentBinds: 5,
        enquireLinkInterval: 60,
      } as CreateSmppAccountDto;

      accounts.create.mockResolvedValue(
        account,
      );

      mapper.toResponse.mockReturnValue(
        response,
      );

      const result =
        await controller.create(
          clientId,
          dto,
        );

      expect(
        accounts.create,
      ).toHaveBeenCalledWith(
        clientId,
        dto,
      );

      expect(
        mapper.toResponse,
      ).toHaveBeenCalledWith(
        account,
      );

      expect(result).toBe(
        response,
      );
    });
  });

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------

  describe("update", () => {
    it("should update and map an SMPP account", async () => {
      const dto = {
        maxConcurrentBinds: 10,
        enquireLinkInterval: 45,
      } as UpdateSmppAccountDto;

      const updated = {
        ...account,
        maxConcurrentBinds: 10,
        enquireLinkInterval: 45,
      };

      const updatedResponse = {
        ...response,
        maxConcurrentBinds: 10,
        enquireLinkInterval: 45,
      };

      accounts.update.mockResolvedValue(
        updated,
      );

      mapper.toResponse.mockReturnValue(
        updatedResponse,
      );

      const result =
        await controller.update(
          clientId,
          accountId,
          dto,
        );

      expect(
        accounts.update,
      ).toHaveBeenCalledWith(
        clientId,
        accountId,
        dto,
      );

      expect(
        mapper.toResponse,
      ).toHaveBeenCalledWith(
        updated,
      );

      expect(result).toBe(
        updatedResponse,
      );
    });
  });

  // -------------------------------------------------------------------------
  // changePassword
  // -------------------------------------------------------------------------

  describe("changePassword", () => {
    it("should change the password and map the account", async () => {
      const dto = {
        password: "new-password",
      } as ChangeSmppPasswordDto;

      accounts.changePassword.mockResolvedValue(
        account,
      );

      mapper.toResponse.mockReturnValue(
        response,
      );

      const result =
        await controller.changePassword(
          clientId,
          accountId,
          dto,
        );

      expect(
        accounts.changePassword,
      ).toHaveBeenCalledWith(
        clientId,
        accountId,
        "new-password",
      );

      expect(
        mapper.toResponse,
      ).toHaveBeenCalledWith(
        account,
      );

      expect(result).toBe(
        response,
      );
    });
  });

  // -------------------------------------------------------------------------
  // activate
  // -------------------------------------------------------------------------

  describe("activate", () => {
    it("should activate and map the SMPP account", async () => {
      const activated = {
        ...account,
        status: "ACTIVE",
      };

      accounts.activate.mockResolvedValue(
        activated,
      );

      mapper.toResponse.mockReturnValue(
        response,
      );

      const result =
        await controller.activate(
          clientId,
          accountId,
        );

      expect(
        accounts.activate,
      ).toHaveBeenCalledWith(
        clientId,
        accountId,
      );

      expect(
        mapper.toResponse,
      ).toHaveBeenCalledWith(
        activated,
      );

      expect(result).toBe(
        response,
      );
    });
  });

  // -------------------------------------------------------------------------
  // disable
  // -------------------------------------------------------------------------

  describe("disable", () => {
    it("should disable and map the SMPP account", async () => {
      const disabled = {
        ...account,
        status: "DISABLED",
      };

      const disabledResponse = {
        ...response,
        status: "DISABLED",
      };

      accounts.disable.mockResolvedValue(
        disabled,
      );

      mapper.toResponse.mockReturnValue(
        disabledResponse,
      );

      const result =
        await controller.disable(
          clientId,
          accountId,
        );

      expect(
        accounts.disable,
      ).toHaveBeenCalledWith(
        clientId,
        accountId,
      );

      expect(
        mapper.toResponse,
      ).toHaveBeenCalledWith(
        disabled,
      );

      expect(result).toBe(
        disabledResponse,
      );
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
        keyof SmppAccountController,
    ): readonly string[] | undefined => {
      const handler =
        SmppAccountController
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

    it("should require smpp_accounts.read for findByClient", () => {
      expect(
        getPermission(
          "findByClient",
        ),
      ).toEqual([
        Permissions.SMPP_ACCOUNTS_READ,
      ]);
    });

    it("should require smpp_accounts.read for findById", () => {
      expect(
        getPermission(
          "findById",
        ),
      ).toEqual([
        Permissions.SMPP_ACCOUNTS_READ,
      ]);
    });

    it("should require smpp_accounts.read for findByPublicId", () => {
      expect(
        getPermission(
          "findByPublicId",
        ),
      ).toEqual([
        Permissions.SMPP_ACCOUNTS_READ,
      ]);
    });

    it("should require smpp_accounts.create for create", () => {
      expect(
        getPermission(
          "create",
        ),
      ).toEqual([
        Permissions.SMPP_ACCOUNTS_CREATE,
      ]);
    });

    it("should require smpp_accounts.update for update", () => {
      expect(
        getPermission(
          "update",
        ),
      ).toEqual([
        Permissions.SMPP_ACCOUNTS_UPDATE,
      ]);
    });

    it("should require smpp_accounts.password.update for changePassword", () => {
      expect(
        getPermission(
          "changePassword",
        ),
      ).toEqual([
        Permissions.SMPP_ACCOUNTS_PASSWORD_UPDATE,
      ]);
    });

    it("should require smpp_accounts.activate for activate", () => {
      expect(
        getPermission(
          "activate",
        ),
      ).toEqual([
        Permissions.SMPP_ACCOUNTS_ACTIVATE,
      ]);
    });

    it("should require smpp_accounts.disable for disable", () => {
      expect(
        getPermission(
          "disable",
        ),
      ).toEqual([
        Permissions.SMPP_ACCOUNTS_DISABLE,
      ]);
    });
  });
});