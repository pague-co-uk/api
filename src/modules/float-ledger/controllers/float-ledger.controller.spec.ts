import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import { Reflector } from "@nestjs/core";

import { AUTHORIZE_METADATA } from "../../../common/authorization/constants/authorization.constants.js";
import type { AuthenticatedRequest } from "../../../common/authorization/interfaces/index.js";
import { Permissions } from "../../../common/authorization/permissions/permissions.registry.js";

import { FloatLedgerMapper } from "../float-ledger.mapper.js";
import {
  FloatLedgerService,
} from "../services/float-ledger.service.js";

import { FloatLedgerController } from "./float-ledger.controller.js";

describe("FloatLedgerController", () => {
  let controller: FloatLedgerController;

  let ledger: {
    topUp: jest.Mock;
    debit: jest.Mock;
    refund: jest.Mock;
    adjust: jest.Mock;
    getBalance: jest.Mock;
    list: jest.Mock;
    findById: jest.Mock;
    findByPublicId: jest.Mock;
  };

  let mapper: {
    toResponse: jest.Mock;
    toResponses: jest.Mock;
  };

  const clientId = "client-1";
  const userId = "user-1";

  const entry = {
    id: "ledger-entry-1",
    publicId: "FL-001",
    clientId,
    createdById: userId,
    transactionType: "TOPUP",
    credits: 5_000,
    referenceType: "ADMIN",
    referenceId: "topup-1",
    description: "Initial float top-up",
    createdAt: new Date(
      "2026-08-14T10:00:00.000Z",
    ),
  };

  const response = {
    id: "ledger-entry-1",
    publicId: "FL-001",
    clientId,
    transactionType: "TOPUP",
    credits: 5_000,
  };

  const request = {
    user: {
      userId,
    },
  } as unknown as AuthenticatedRequest;

  beforeEach(() => {
    ledger = {
      topUp: jest.fn(),
      debit: jest.fn(),
      refund: jest.fn(),
      adjust: jest.fn(),
      getBalance: jest.fn(),
      list: jest.fn(),
      findById: jest.fn(),
      findByPublicId: jest.fn(),
    };

    mapper = {
      toResponse: jest.fn(),
      toResponses: jest.fn(),
    };

    controller =
      new FloatLedgerController(
        ledger as unknown as FloatLedgerService,
        mapper as unknown as FloatLedgerMapper,
      );
  });

  // -------------------------------------------------------------------------
  // topUp
  // -------------------------------------------------------------------------

  describe("topUp", () => {
    it("should create and map a top-up ledger entry", async () => {
      const dto = {
        credits: 5_000,
        referenceId: "topup-1",
        description: "Initial float top-up",
      };

      ledger.topUp.mockResolvedValue(
        entry,
      );

      mapper.toResponse.mockReturnValue(
        response,
      );

      const result =
        await controller.topUp(
          clientId,
          dto,
          request,
        );

      expect(
        ledger.topUp,
      ).toHaveBeenCalledWith(
        clientId,
        5_000,
        userId,
        "topup-1",
        "Initial float top-up",
      );

      expect(
        mapper.toResponse,
      ).toHaveBeenCalledWith(
        entry,
      );

      expect(result).toBe(response);
    });
  });

  // -------------------------------------------------------------------------
  // debit
  // -------------------------------------------------------------------------

  describe("debit", () => {
    it("should create and map a debit ledger entry", async () => {
      const dto = {
        credits: 2_500,
        referenceType: "MESSAGE",
        referenceId: "message-1",
        description: "SMS charge",
      };

      const debit = {
        ...entry,
        transactionType: "DEBIT",
        credits: -2_500,
        referenceType: "MESSAGE",
        referenceId: "message-1",
        description: "SMS charge",
      };

      ledger.debit.mockResolvedValue(
        debit,
      );

      mapper.toResponse.mockReturnValue(
        response,
      );

      const result =
        await controller.debit(
          clientId,
          dto,
        );

      expect(
        ledger.debit,
      ).toHaveBeenCalledWith(
        clientId,
        2_500,
        "MESSAGE",
        "message-1",
        "SMS charge",
      );

      expect(
        mapper.toResponse,
      ).toHaveBeenCalledWith(
        debit,
      );

      expect(result).toBe(response);
    });
  });

  // -------------------------------------------------------------------------
  // refund
  // -------------------------------------------------------------------------

  describe("refund", () => {
    it("should create and map a refund ledger entry", async () => {
      const dto = {
        credits: 2_500,
        referenceType: "MESSAGE",
        referenceId: "message-1",
        description: "Message refund",
      };

      const refund = {
        ...entry,
        transactionType: "REFUND",
        credits: 2_500,
        referenceType: "MESSAGE",
        referenceId: "message-1",
        description: "Message refund",
      };

      ledger.refund.mockResolvedValue(
        refund,
      );

      mapper.toResponse.mockReturnValue(
        response,
      );

      const result =
        await controller.refund(
          clientId,
          dto,
        );

      expect(
        ledger.refund,
      ).toHaveBeenCalledWith(
        clientId,
        2_500,
        "MESSAGE",
        "message-1",
        "Message refund",
      );

      expect(
        mapper.toResponse,
      ).toHaveBeenCalledWith(
        refund,
      );

      expect(result).toBe(response);
    });
  });

  // -------------------------------------------------------------------------
  // adjust
  // -------------------------------------------------------------------------

  describe("adjust", () => {
    it("should create and map an adjustment ledger entry", async () => {
      const dto = {
        credits: 500,
        description: "Manual correction",
        referenceId: "adjustment-1",
      };

      const adjustment = {
        ...entry,
        transactionType: "ADJUSTMENT",
        credits: 500,
        referenceType: "ADMIN",
        referenceId: "adjustment-1",
        description: "Manual correction",
      };

      ledger.adjust.mockResolvedValue(
        adjustment,
      );

      mapper.toResponse.mockReturnValue(
        response,
      );

      const result =
        await controller.adjust(
          clientId,
          dto,
          request,
        );

      expect(
        ledger.adjust,
      ).toHaveBeenCalledWith(
        clientId,
        500,
        userId,
        "Manual correction",
        "adjustment-1",
      );

      expect(
        mapper.toResponse,
      ).toHaveBeenCalledWith(
        adjustment,
      );

      expect(result).toBe(response);
    });
  });

  // -------------------------------------------------------------------------
  // getBalance
  // -------------------------------------------------------------------------

  describe("getBalance", () => {
    it("should return the client's float balance", async () => {
      ledger.getBalance.mockResolvedValue(
        12_500,
      );

      const result =
        await controller.getBalance(
          clientId,
        );

      expect(
        ledger.getBalance,
      ).toHaveBeenCalledWith(
        clientId,
      );

      expect(result).toBe(
        12_500,
      );
    });
  });

  // -------------------------------------------------------------------------
  // list
  // -------------------------------------------------------------------------

  describe("list", () => {
    it("should retrieve and map ledger entries", async () => {
      const entries = [
        entry,
      ];

      const responses = [
        response,
      ];

      const dto = {
        limit: 25,
        offset: 50,
      };

      ledger.list.mockResolvedValue(
        entries,
      );

      mapper.toResponses.mockReturnValue(
        responses,
      );

      const result =
        await controller.list(
          clientId,
          dto,
        );

      expect(
        ledger.list,
      ).toHaveBeenCalledWith(
        clientId,
        {
          limit: 25,
          offset: 50,
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

    it("should pass undefined pagination values", async () => {
      ledger.list.mockResolvedValue([]);

      mapper.toResponses.mockReturnValue([]);

      await controller.list(
        clientId,
        {},
      );

      expect(
        ledger.list,
      ).toHaveBeenCalledWith(
        clientId,
        {
          limit: undefined,
          offset: undefined,
        },
      );
    });
  });

  // -------------------------------------------------------------------------
  // findById
  // -------------------------------------------------------------------------

  describe("findById", () => {
    it("should retrieve and map an entry", async () => {
      ledger.findById.mockResolvedValue(
        entry,
      );

      mapper.toResponse.mockReturnValue(
        response,
      );

      const result =
        await controller.findById(
          clientId,
          "ledger-entry-1"
        );

      expect(
        ledger.findById,
      ).toHaveBeenCalledWith(
        clientId,
        "ledger-entry-1",
      );

      expect(
        mapper.toResponse,
      ).toHaveBeenCalledWith(
        entry,
      );

      expect(result).toBe(response);
    });

    it("should return null when the entry does not exist", async () => {
      ledger.findById.mockResolvedValue(
        null,
      );

      const result =
        await controller.findById(
          clientId,
          "missing"
        );

      expect(result).toBeNull();

      expect(
        mapper.toResponse,
      ).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // findByPublicId
  // -------------------------------------------------------------------------

  describe("findByPublicId", () => {
    it("should retrieve and map an entry", async () => {
      ledger.findByPublicId.mockResolvedValue(
        entry,
      );

      mapper.toResponse.mockReturnValue(
        response,
      );

      const result =
        await controller.findByPublicId(
          clientId,
          "FL-001"
        );

      expect(
        ledger.findByPublicId,
      ).toHaveBeenCalledWith(
        clientId,
        "FL-001",
      );

      expect(
        mapper.toResponse,
      ).toHaveBeenCalledWith(
        entry,
      );

      expect(result).toBe(response);
    });

    it("should return null when the entry does not exist", async () => {
      ledger.findByPublicId.mockResolvedValue(
        null,
      );

      const result =
        await controller.findByPublicId(
          clientId,
          "missing"
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
        | "topUp"
        | "debit"
        | "refund"
        | "adjust"
        | "getBalance"
        | "list"
        | "findById"
        | "findByPublicId",
    ): readonly string[] | undefined => {
      const handler =
        FloatLedgerController.prototype[
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

    it("should require float.read for getBalance", () => {
      expect(
        getPermission(
          "getBalance",
        ),
      ).toEqual([
        Permissions.FLOAT_READ,
      ]);
    });

    it("should require float.read for list", () => {
      expect(
        getPermission("list"),
      ).toEqual([
        Permissions.FLOAT_READ,
      ]);
    });

    it("should require float.read for findById", () => {
      expect(
        getPermission(
          "findById",
        ),
      ).toEqual([
        Permissions.FLOAT_READ,
      ]);
    });

    it("should require float.read for findByPublicId", () => {
      expect(
        getPermission(
          "findByPublicId",
        ),
      ).toEqual([
        Permissions.FLOAT_READ,
      ]);
    });

    it("should require float.top_up for topUp", () => {
      expect(
        getPermission("topUp"),
      ).toEqual([
        Permissions.FLOAT_TOP_UP,
      ]);
    });

    it("should require float.debit for debit", () => {
      expect(
        getPermission("debit"),
      ).toEqual([
        Permissions.FLOAT_DEBIT,
      ]);
    });

    it("should require float.refund for refund", () => {
      expect(
        getPermission("refund"),
      ).toEqual([
        Permissions.FLOAT_REFUND,
      ]);
    });

    it("should require float.adjust for adjust", () => {
      expect(
        getPermission("adjust"),
      ).toEqual([
        Permissions.FLOAT_ADJUST,
      ]);
    });
  });
});