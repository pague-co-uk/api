import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import {
  LedgerReferenceType,
  LedgerTransactionType,
} from "@prisma/client";

import { initTelemetry } from "@pague-co-uk/sms-gateway-telemetry";

import { FloatLedgerService } from "./float-ledger.service.js";

describe("FloatLedgerService", () => {
  let service: FloatLedgerService;

  const ledger = {
    withTransaction: jest.fn(),
    withDatabase: jest.fn(),

    create: jest.fn(),
    findById: jest.fn(),
    findByPublicId: jest.fn(),
    findByClient: jest.fn(),
    findByReference: jest.fn(),
    sumCreditsByClient: jest.fn(),
    countByClient: jest.fn(),
  };

  const random = {
    bytes: jest.fn(),
  };

  const clock = {
    now: jest.fn(),
  };

  const clientId = "client-1";
  const userId = "user-1";
  const ledgerEntryId = "ledger-entry-1";
  const publicId = "FL-001";

  const now =
    new Date("2026-08-14T10:00:00.000Z");

  const baseEntry = {
    id: ledgerEntryId,
    publicId,
    clientId,
    createdById: userId,

    transactionType:
      LedgerTransactionType.TOPUP,

    credits: 1000,

    referenceType:
      LedgerReferenceType.ADMIN,

    referenceId: null,

    description: "Test transaction",

    createdAt: now,
  };

  beforeAll(() => {
    initTelemetry({
      enabled: false,

      service: {
        name: "control-plane-api-test",
        version: "test",
      },

      collector: {
        tracesEndpoint:
          "http://localhost:4318/v1/traces",

        metricsEndpoint:
          "http://localhost:4318/v1/metrics",

        logsEndpoint:
          "http://localhost:4318/v1/logs",
      },

      metrics: {
        exportIntervalMillis: 60_000,
      },

      registerShutdownHooks: false,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();

    random.bytes.mockReturnValue(
      Buffer.from("FL-public-id"),
    );

    clock.now.mockReturnValue(now);

    ledger.withDatabase.mockReturnValue(
      ledger,
    );

    ledger.withTransaction.mockImplementation(
      async (
        callback: (
          tx: unknown,
        ) => Promise<unknown>,
      ) => callback({}),
    );

    ledger.findByReference.mockResolvedValue(
      null,
    );

    ledger.sumCreditsByClient.mockResolvedValue(
      10_000,
    );

    ledger.create.mockResolvedValue(
      baseEntry,
    );

    service =
      new FloatLedgerService(
        ledger as any,
        random as any,
        clock as any,
      );
  });

  // -------------------------------------------------------------------------
  // topUp
  // -------------------------------------------------------------------------

  describe("topUp", () => {
    it("should create a TOPUP ledger entry", async () => {
      const result =
        await service.topUp(
          clientId,
          5_000,
          userId,
          "topup-1",
          "Initial float top-up",
        );

      expect(
        ledger.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          publicId:
            expect.any(String),

          client: {
            connect: {
              id: clientId,
            },
          },

          createdBy: {
            connect: {
              id: userId,
            },
          },

          transactionType:
            LedgerTransactionType.TOPUP,

          credits: 5_000,

          referenceType:
            LedgerReferenceType.ADMIN,

          referenceId: "topup-1",

          description:
            "Initial float top-up",
        }),
      );

      expect(result).toEqual(
        baseEntry,
      );
    });

    it("should create a TOPUP without createdById", async () => {
      await service.topUp(
        clientId,
        5_000,
      );

      expect(
        ledger.create,
      ).toHaveBeenCalledWith(
        expect.not.objectContaining({
          createdBy: expect.anything(),
        }),
      );
    });

    it("should reject zero credits", async () => {
      await expect(
        service.topUp(
          clientId,
          0,
        ),
      ).rejects.toThrow(
        "Credits must be a positive integer.",
      );

      expect(
        ledger.create,
      ).not.toHaveBeenCalled();
    });

    it("should reject negative credits", async () => {
      await expect(
        service.topUp(
          clientId,
          -100,
        ),
      ).rejects.toThrow(
        "Credits must be a positive integer.",
      );

      expect(
        ledger.create,
      ).not.toHaveBeenCalled();
    });

    it("should reject fractional credits", async () => {
      await expect(
        service.topUp(
          clientId,
          100.5,
        ),
      ).rejects.toThrow(
        "Credits must be a positive integer.",
      );

      expect(
        ledger.create,
      ).not.toHaveBeenCalled();
    });

    it("should propagate repository errors", async () => {
      ledger.create.mockRejectedValueOnce(
        new Error(
          "Database unavailable",
        ),
      );

      await expect(
        service.topUp(
          clientId,
          1_000,
        ),
      ).rejects.toThrow(
        "Database unavailable",
      );
    });
  });

  // -------------------------------------------------------------------------
  // debit
  // -------------------------------------------------------------------------

  describe("debit", () => {
    it("should create a negative DEBIT ledger entry", async () => {
      const debit = {
        ...baseEntry,
        transactionType:
          LedgerTransactionType.DEBIT,
        credits: -2_500,
        referenceType:
          LedgerReferenceType.MESSAGE,
        referenceId: "message-1",
      };

      const transactionLedger = {
        ...ledger,
        findByReference:
          jest.fn().mockResolvedValue(null),

        create:
          jest.fn().mockResolvedValue(debit),

        sumCreditsByClient:
          jest.fn().mockResolvedValue(10_000),
      };

      ledger.withDatabase.mockReturnValue(
        transactionLedger,
      );

      const result =
        await service.debit(
          clientId,
          2_500,
          LedgerReferenceType.MESSAGE,
          "message-1",
          "SMS charge",
        );

      expect(
        ledger.withTransaction,
      ).toHaveBeenCalledTimes(1);

      expect(
        ledger.withDatabase,
      ).toHaveBeenCalledTimes(1);

      expect(
        transactionLedger.findByReference,
      ).toHaveBeenCalledWith(
        clientId,
        LedgerReferenceType.MESSAGE,
        "message-1",
        LedgerTransactionType.DEBIT,
      );

      expect(
        transactionLedger.sumCreditsByClient,
      ).toHaveBeenCalledWith(
        clientId,
      );

      expect(
        transactionLedger.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          client: {
            connect: {
              id: clientId,
            },
          },

          transactionType:
            LedgerTransactionType.DEBIT,

          credits: -2_500,

          referenceType:
            LedgerReferenceType.MESSAGE,

          referenceId:
            "message-1",

          description:
            "SMS charge",
        }),
      );

      expect(result).toEqual(
        debit,
      );
    });

    it("should return an existing DEBIT without creating another entry", async () => {
      const existingDebit = {
        ...baseEntry,
        transactionType:
          LedgerTransactionType.DEBIT,
        credits: -2_500,
        referenceType:
          LedgerReferenceType.MESSAGE,
        referenceId: "message-1",
      };

      const transactionLedger = {
        ...ledger,

        findByReference:
          jest.fn().mockResolvedValue(
            existingDebit,
          ),

        create:
          jest.fn(),

        sumCreditsByClient:
          jest.fn(),
      };

      ledger.withDatabase.mockReturnValue(
        transactionLedger,
      );

      const result =
        await service.debit(
          clientId,
          2_500,
          LedgerReferenceType.MESSAGE,
          "message-1",
          "SMS charge",
        );

      expect(
        transactionLedger.findByReference,
      ).toHaveBeenCalledWith(
        clientId,
        LedgerReferenceType.MESSAGE,
        "message-1",
        LedgerTransactionType.DEBIT,
      );

      expect(
        transactionLedger.sumCreditsByClient,
      ).not.toHaveBeenCalled();

      expect(
        transactionLedger.create,
      ).not.toHaveBeenCalled();

      expect(result).toEqual(
        existingDebit,
      );
    });

    it("should allow a debit when sufficient balance exists", async () => {
      ledger.sumCreditsByClient.mockResolvedValue(
        5_000,
      );

      ledger.create.mockResolvedValue({
        ...baseEntry,
        transactionType:
          LedgerTransactionType.DEBIT,
        credits: -5_000,
      });

      await expect(
        service.debit(
          clientId,
          5_000,
          LedgerReferenceType.MESSAGE,
          "message-1",
        ),
      ).resolves.toBeDefined();

      expect(
        ledger.create,
      ).toHaveBeenCalled();
    });

    it("should reject a debit when the balance is insufficient", async () => {
      ledger.sumCreditsByClient.mockResolvedValue(
        1_000,
      );

      await expect(
        service.debit(
          clientId,
          1_001,
          LedgerReferenceType.MESSAGE,
          "message-1",
        ),
      ).rejects.toThrow(
        "Insufficient float balance.",
      );

      expect(
        ledger.create,
      ).not.toHaveBeenCalled();
    });

    it("should allow a debit equal to the current balance", async () => {
      ledger.sumCreditsByClient.mockResolvedValue(
        1_000,
      );

      await service.debit(
        clientId,
        1_000,
        LedgerReferenceType.MESSAGE,
        "message-1",
      );

      expect(
        ledger.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          credits: -1_000,
        }),
      );
    });

    it("should reject zero credits", async () => {
      await expect(
        service.debit(
          clientId,
          0,
          LedgerReferenceType.MESSAGE,
          "message-1",
        ),
      ).rejects.toThrow(
        "Credits must be a positive integer.",
      );

      expect(
        ledger.withTransaction,
      ).not.toHaveBeenCalled();
    });

    it("should reject negative credits", async () => {
      await expect(
        service.debit(
          clientId,
          -100,
          LedgerReferenceType.MESSAGE,
          "message-1",
        ),
      ).rejects.toThrow(
        "Credits must be a positive integer.",
      );

      expect(
        ledger.withTransaction,
      ).not.toHaveBeenCalled();
    });

    it("should propagate transaction errors", async () => {
      ledger.withTransaction.mockRejectedValueOnce(
        new Error(
          "Transaction failed",
        ),
      );

      await expect(
        service.debit(
          clientId,
          1_000,
          LedgerReferenceType.MESSAGE,
          "message-1",
        ),
      ).rejects.toThrow(
        "Transaction failed",
      );
    });

    it("should not create an entry when the balance check fails", async () => {
      const transactionLedger = {
        ...ledger,

        findByReference:
          jest.fn().mockResolvedValue(null),

        sumCreditsByClient:
          jest.fn().mockResolvedValue(500),

        create:
          jest.fn(),
      };

      ledger.withDatabase.mockReturnValue(
        transactionLedger,
      );

      await expect(
        service.debit(
          clientId,
          501,
          LedgerReferenceType.MESSAGE,
          "message-1",
        ),
      ).rejects.toThrow(
        "Insufficient float balance.",
      );

      expect(
        transactionLedger.findByReference,
      ).toHaveBeenCalled();

      expect(
        transactionLedger.create,
      ).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // refund
  // -------------------------------------------------------------------------

  describe("refund", () => {
    it("should create a positive REFUND ledger entry", async () => {
      const refund = {
        ...baseEntry,
        transactionType:
          LedgerTransactionType.REFUND,
        credits: 2_500,
        referenceType:
          LedgerReferenceType.MESSAGE,
        referenceId: "message-1",
      };

      const transactionLedger = {
        ...ledger,

        findByReference:
          jest.fn().mockResolvedValue(null),

        create:
          jest.fn().mockResolvedValue(refund),
      };

      ledger.withDatabase.mockReturnValue(
        transactionLedger,
      );

      const result =
        await service.refund(
          clientId,
          2_500,
          LedgerReferenceType.MESSAGE,
          "message-1",
          "Message refund",
        );

      expect(
        ledger.withTransaction,
      ).toHaveBeenCalledTimes(1);

      expect(
        ledger.withDatabase,
      ).toHaveBeenCalledTimes(1);

      expect(
        transactionLedger.findByReference,
      ).toHaveBeenCalledWith(
        clientId,
        LedgerReferenceType.MESSAGE,
        "message-1",
        LedgerTransactionType.REFUND,
      );

      expect(
        transactionLedger.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionType:
            LedgerTransactionType.REFUND,

          credits: 2_500,

          referenceType:
            LedgerReferenceType.MESSAGE,

          referenceId:
            "message-1",

          description:
            "Message refund",
        }),
      );

      expect(result).toEqual(
        refund,
      );
    });

    it("should return an existing REFUND without creating another entry", async () => {
      const existingRefund = {
        ...baseEntry,
        transactionType:
          LedgerTransactionType.REFUND,
        credits: 2_500,
        referenceType:
          LedgerReferenceType.MESSAGE,
        referenceId: "message-1",
      };

      const transactionLedger = {
        ...ledger,

        findByReference:
          jest.fn().mockResolvedValue(
            existingRefund,
          ),

        create:
          jest.fn(),
      };

      ledger.withDatabase.mockReturnValue(
        transactionLedger,
      );

      const result =
        await service.refund(
          clientId,
          2_500,
          LedgerReferenceType.MESSAGE,
          "message-1",
          "Message refund",
        );

      expect(
        transactionLedger.findByReference,
      ).toHaveBeenCalledWith(
        clientId,
        LedgerReferenceType.MESSAGE,
        "message-1",
        LedgerTransactionType.REFUND,
      );

      expect(
        transactionLedger.create,
      ).not.toHaveBeenCalled();

      expect(result).toEqual(
        existingRefund,
      );
    });

    it("should reject zero credits", async () => {
      await expect(
        service.refund(
          clientId,
          0,
          LedgerReferenceType.MESSAGE,
          "message-1",
        ),
      ).rejects.toThrow(
        "Credits must be a positive integer.",
      );

      expect(
        ledger.create,
      ).not.toHaveBeenCalled();

      expect(
        ledger.withTransaction,
      ).not.toHaveBeenCalled();
    });

    it("should reject negative credits", async () => {
      await expect(
        service.refund(
          clientId,
          -100,
          LedgerReferenceType.MESSAGE,
          "message-1",
        ),
      ).rejects.toThrow(
        "Credits must be a positive integer.",
      );

      expect(
        ledger.create,
      ).not.toHaveBeenCalled();

      expect(
        ledger.withTransaction,
      ).not.toHaveBeenCalled();
    });

    it("should propagate transaction errors", async () => {
      ledger.withTransaction.mockRejectedValueOnce(
        new Error(
          "Transaction failed",
        ),
      );

      await expect(
        service.refund(
          clientId,
          1_000,
          LedgerReferenceType.MESSAGE,
          "message-1",
        ),
      ).rejects.toThrow(
        "Transaction failed",
      );
    });
  });

  // -------------------------------------------------------------------------
  // adjust
  // -------------------------------------------------------------------------

  describe("adjust", () => {
    it("should create a positive adjustment", async () => {
      const adjustment = {
        ...baseEntry,
        transactionType:
          LedgerTransactionType.ADJUSTMENT,
        credits: 500,
      };

      ledger.create.mockResolvedValue(
        adjustment,
      );

      const result =
        await service.adjust(
          clientId,
          500,
          userId,
          "Manual correction",
          "adjustment-1",
        );

      expect(
        ledger.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionType:
            LedgerTransactionType.ADJUSTMENT,

          credits: 500,

          createdBy: {
            connect: {
              id: userId,
            },
          },

          referenceType:
            LedgerReferenceType.ADMIN,

          referenceId:
            "adjustment-1",

          description:
            "Manual correction",
        }),
      );

      expect(result).toEqual(
        adjustment,
      );
    });

    it("should create a negative adjustment", async () => {
      const adjustment = {
        ...baseEntry,
        transactionType:
          LedgerTransactionType.ADJUSTMENT,
        credits: -500,
      };

      ledger.create.mockResolvedValue(
        adjustment,
      );

      await service.adjust(
        clientId,
        -500,
        userId,
        "Manual correction",
      );

      expect(
        ledger.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionType:
            LedgerTransactionType.ADJUSTMENT,

          credits: -500,
        }),
      );
    });

    it("should reject a zero adjustment", async () => {
      await expect(
        service.adjust(
          clientId,
          0,
          userId,
          "Manual correction",
        ),
      ).rejects.toThrow(
        "Adjustment credits cannot be zero.",
      );

      expect(
        ledger.create,
      ).not.toHaveBeenCalled();
    });

    it("should propagate repository errors", async () => {
      ledger.create.mockRejectedValueOnce(
        new Error(
          "Database unavailable",
        ),
      );

      await expect(
        service.adjust(
          clientId,
          500,
          userId,
          "Manual correction",
        ),
      ).rejects.toThrow(
        "Database unavailable",
      );
    });
  });

  // -------------------------------------------------------------------------
  // getBalance
  // -------------------------------------------------------------------------

  describe("getBalance", () => {
    it("should return the client's current balance", async () => {
      ledger.sumCreditsByClient.mockResolvedValue(
        12_500,
      );

      const result =
        await service.getBalance(
          clientId,
        );

      expect(
        ledger.sumCreditsByClient,
      ).toHaveBeenCalledWith(
        clientId,
      );

      expect(result).toBe(
        12_500,
      );
    });

    it("should return zero when the client has no ledger entries", async () => {
      ledger.sumCreditsByClient.mockResolvedValue(
        0,
      );

      await expect(
        service.getBalance(
          clientId,
        ),
      ).resolves.toBe(0);
    });

    it("should propagate repository errors", async () => {
      ledger.sumCreditsByClient.mockRejectedValueOnce(
        new Error(
          "Database unavailable",
        ),
      );

      await expect(
        service.getBalance(
          clientId,
        ),
      ).rejects.toThrow(
        "Database unavailable",
      );
    });
  });

  // -------------------------------------------------------------------------
  // list
  // -------------------------------------------------------------------------

  describe("list", () => {
    it("should return ledger entries for a client", async () => {
      const entries = [
        baseEntry,
      ];

      ledger.findByClient.mockResolvedValue(
        entries,
      );

      const result =
        await service.list(
          clientId,
        );

      expect(
        ledger.findByClient,
      ).toHaveBeenCalledWith(
        clientId,
        undefined,
      );

      expect(result).toEqual(
        entries,
      );
    });

    it("should pass pagination options to the repository", async () => {
      ledger.findByClient.mockResolvedValue(
        [],
      );

      await service.list(
        clientId,
        {
          limit: 25,
          offset: 50,
        },
      );

      expect(
        ledger.findByClient,
      ).toHaveBeenCalledWith(
        clientId,
        {
          limit: 25,
          offset: 50,
        },
      );
    });
  });

  // -------------------------------------------------------------------------
  // findById
  // -------------------------------------------------------------------------

  describe("findById", () => {
    it("should find an entry by ID", async () => {
      ledger.findById.mockResolvedValue(
        baseEntry,
      );

      const result =
        await service.findById(
          clientId,
          ledgerEntryId,
        );

      expect(
        ledger.findById,
      ).toHaveBeenCalledWith(
        clientId,
        ledgerEntryId,
      );

      expect(result).toEqual(
        baseEntry,
      );
    });

    it("should return null when the entry does not exist", async () => {
      ledger.findById.mockResolvedValue(
        null,
      );

      await expect(
        service.findById(
          clientId,
          "missing",
        ),
      ).resolves.toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // findByPublicId
  // -------------------------------------------------------------------------

  describe("findByPublicId", () => {
    it("should find an entry by public ID", async () => {
      ledger.findByPublicId.mockResolvedValue(
        baseEntry,
      );

      const result =
        await service.findByPublicId(
          clientId,
          publicId,
        );

      expect(
        ledger.findByPublicId,
      ).toHaveBeenCalledWith(
        clientId,
        publicId,
      );

      expect(result).toEqual(
        baseEntry,
      );
    });

    it("should return null when the entry does not exist", async () => {
      ledger.findByPublicId.mockResolvedValue(
        null,
      );

      await expect(
        service.findByPublicId(
          clientId,
          "missing",
        ),
      ).resolves.toBeNull();
    });
  });
});