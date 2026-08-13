import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import {
  SenderId,
  SenderIdStatus,
} from "@prisma/client";

import { SenderIdService } from "./sender-id.service.js";

import { initTelemetry } from "@pague-co-uk/sms-gateway-telemetry";
import type { AuditService } from "../../../audit/index.js";
import type { ClientRepository } from "../../../repositories/ClientRepository.js";
import type { SenderIdRepository } from "../../../repositories/SenderIdRepository.js";

describe("SenderIdService", () => {
  let service: SenderIdService;

  let senderIds: {
    create: jest.Mock;
    findById: jest.Mock;
    findByPublicId: jest.Mock;
    findMany: jest.Mock;
    existsByClientAndSender: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    clearDefaultByClient: jest.Mock;
    withDatabase: jest.Mock;
    withTransaction: jest.Mock;
  };

  let clients: {
    findById: jest.Mock;
  };

  let audit: {
    record: jest.Mock;
  };

  const senderId: SenderId = {
    id: "sender-id-1",
    publicId: "SID-001",
    clientId: "client-1",
    sender: "VIBRANT",
    status: SenderIdStatus.APPROVED,
    isDefault: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
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
    senderIds = {
      create: jest.fn(),
      findById: jest.fn(),
      findByPublicId: jest.fn(),
      findMany: jest.fn(),
      existsByClientAndSender: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      clearDefaultByClient: jest.fn(),
      withDatabase: jest.fn(),
      withTransaction: jest.fn(),
    };

    clients = {
      findById: jest.fn(),
    };

    audit = {
      record: jest.fn(),
    };

    service = new SenderIdService(
      senderIds as unknown as SenderIdRepository,
      clients as unknown as ClientRepository,
      audit as unknown as AuditService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  describe("findById", () => {
    it("should return the Sender ID", async () => {
      senderIds.findById.mockResolvedValue(
        senderId,
      );

      await expect(
        service.findById("sender-id-1"),
      ).resolves.toEqual(senderId);

      expect(
        senderIds.findById,
      ).toHaveBeenCalledWith(
        "sender-id-1",
      );
    });

    it("should throw when the Sender ID does not exist", async () => {
      senderIds.findById.mockResolvedValue(
        null,
      );

      await expect(
        service.findById("sender-id-1"),
      ).rejects.toThrow(
        "Sender Id 'sender-id-1' not found.",
      );
    });
  });

  describe("findByPublicId", () => {
    it("should return the Sender ID", async () => {
      senderIds.findByPublicId.mockResolvedValue(
        senderId,
      );

      await expect(
        service.findByPublicId("SID-001"),
      ).resolves.toEqual(senderId);

      expect(
        senderIds.findByPublicId,
      ).toHaveBeenCalledWith(
        "SID-001",
      );
    });

    it("should throw when the Sender ID does not exist", async () => {
      senderIds.findByPublicId.mockResolvedValue(
        null,
      );

      await expect(
        service.findByPublicId("SID-001"),
      ).rejects.toThrow(
        "Sender Id 'SID-001' not found.",
      );
    });
  });

  describe("findMany", () => {
    it("should return the paginated Sender IDs", async () => {
      const page = {
        items: [senderId],
        page: 1,
        pageSize: 20,
        totalItems: 1,
      };

      senderIds.findMany.mockResolvedValue(
        page,
      );

      const query = {
        page: 1,
        pageSize: 20,
        clientId: "client-1",
        status: SenderIdStatus.APPROVED,
      };

      await expect(
        service.findMany(query),
      ).resolves.toEqual(page);

      expect(
        senderIds.findMany,
      ).toHaveBeenCalledWith(query);
    });
  });

  // -------------------------------------------------------------------------
  // Create
  // -------------------------------------------------------------------------

  describe("create", () => {
    const dto = {
      publicId: "SID-001",
      clientId: "client-1",
      sender: "VIBRANT",
    };

    it("should create a pending Sender ID", async () => {
      clients.findById.mockResolvedValue({
        id: "client-1",
      });

      senderIds.existsByClientAndSender.mockResolvedValue(
        false,
      );

      const created = {
        ...senderId,
        status: SenderIdStatus.PENDING,
        isDefault: false,
      };

      senderIds.create.mockResolvedValue(
        created,
      );

      const result =
        await service.create(dto);

      expect(
        clients.findById,
      ).toHaveBeenCalledWith(
        "client-1",
      );

      expect(
        senderIds.existsByClientAndSender,
      ).toHaveBeenCalledWith(
        "client-1",
        "VIBRANT",
      );

      expect(
        senderIds.create,
      ).toHaveBeenCalledWith({
        publicId: "SID-001",
        client: {
          connect: {
            id: "client-1",
          },
        },
        sender: "VIBRANT",
        status: SenderIdStatus.PENDING,
        isDefault: false,
      });

      expect(result).toEqual(created);

      expect(
        audit.record,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "sender_id.created",
          clientId: "client-1",
          resourceType: "SenderId",
          resourceId: created.id,
        }),
      );
    });

    it("should reject creation when the client does not exist", async () => {
      clients.findById.mockResolvedValue(
        null,
      );

      await expect(
        service.create(dto),
      ).rejects.toThrow(
        "Client was not found.",
      );

      expect(
        senderIds.create,
      ).not.toHaveBeenCalled();
    });

    it("should reject a duplicate Sender ID for the client", async () => {
      clients.findById.mockResolvedValue({
        id: "client-1",
      });

      senderIds.existsByClientAndSender.mockResolvedValue(
        true,
      );

      await expect(
        service.create(dto),
      ).rejects.toThrow(
        "Sender Id 'VIBRANT' Already Exists.",
      );

      expect(
        senderIds.create,
      ).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Update
  // -------------------------------------------------------------------------

  describe("update", () => {
    it("should update the Sender ID", async () => {
      senderIds.findById.mockResolvedValue(
        senderId,
      );

      senderIds.existsByClientAndSender.mockResolvedValue(
        false,
      );

      const updated = {
        ...senderId,
        sender: "VIBRANT2",
      };

      senderIds.update.mockResolvedValue(
        updated,
      );

      const result =
        await service.update(
          "sender-id-1",
          {
            sender: "VIBRANT2",
          },
        );

      expect(
        senderIds.existsByClientAndSender,
      ).toHaveBeenCalledWith(
        "client-1",
        "VIBRANT2",
      );

      expect(
        senderIds.update,
      ).toHaveBeenCalledWith(
        "sender-id-1",
        {
          sender: "VIBRANT2",
        },
      );

      expect(result).toEqual(updated);
    });

    it("should not check uniqueness when the sender is unchanged", async () => {
      senderIds.findById.mockResolvedValue(
        senderId,
      );

      senderIds.update.mockResolvedValue(
        senderId,
      );

      await service.update(
        "sender-id-1",
        {
          sender: "VIBRANT",
        },
      );

      expect(
        senderIds.existsByClientAndSender,
      ).not.toHaveBeenCalled();
    });

    it("should reject a duplicate sender when changing the sender", async () => {
      senderIds.findById.mockResolvedValue(
        senderId,
      );

      senderIds.existsByClientAndSender.mockResolvedValue(
        true,
      );

      await expect(
        service.update(
          "sender-id-1",
          {
            sender: "OTHER",
          },
        ),
      ).rejects.toThrow(
        "Sender Id 'OTHER' Already Exists.",
      );

      expect(
        senderIds.update,
      ).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------------

  describe("delete", () => {
    it("should delete the Sender ID", async () => {
      senderIds.findById.mockResolvedValue(
        senderId,
      );

      senderIds.delete.mockResolvedValue(
        senderId,
      );

      await expect(
        service.delete("sender-id-1"),
      ).resolves.toBeUndefined();

      expect(
        senderIds.delete,
      ).toHaveBeenCalledWith(
        "sender-id-1",
      );

      expect(
        audit.record,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "sender_id.deleted",
          resourceId: "sender-id-1",
        }),
      );
    });

    it("should not delete a missing Sender ID", async () => {
      senderIds.findById.mockResolvedValue(
        null,
      );

      await expect(
        service.delete("sender-id-1"),
      ).rejects.toThrow(
        "Sender Id 'sender-id-1' not found.",
      );

      expect(
        senderIds.delete,
      ).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Approval
  // -------------------------------------------------------------------------

  describe("approve", () => {
    it("should approve a Sender ID", async () => {
      const pending = {
        ...senderId,
        status: SenderIdStatus.PENDING,
      };

      const approved = {
        ...senderId,
        status: SenderIdStatus.APPROVED,
      };

      senderIds.findById.mockResolvedValue(
        pending,
      );

      senderIds.update.mockResolvedValue(
        approved,
      );

      const result =
        await service.approve(
          "sender-id-1",
        );

      expect(
        senderIds.update,
      ).toHaveBeenCalledWith(
        "sender-id-1",
        {
          status: SenderIdStatus.APPROVED,
        },
      );

      expect(result).toEqual(approved);
    });

    it("should not update an already approved Sender ID", async () => {
      senderIds.findById.mockResolvedValue(
        senderId,
      );

      const result =
        await service.approve(
          "sender-id-1",
        );

      expect(result).toEqual(
        senderId,
      );

      expect(
        senderIds.update,
      ).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Reject
  // -------------------------------------------------------------------------

  describe("reject", () => {
    it("should reject a non-default Sender ID", async () => {
      const pending = {
        ...senderId,
        status: SenderIdStatus.PENDING,
      };

      const rejected = {
        ...senderId,
        status: SenderIdStatus.REJECTED,
        isDefault: false,
      };

      senderIds.findById.mockResolvedValue(
        pending,
      );

      senderIds.update.mockResolvedValue(
        rejected,
      );

      const result =
        await service.reject(
          "sender-id-1",
        );

      expect(
        senderIds.update,
      ).toHaveBeenCalledWith(
        "sender-id-1",
        {
          status: SenderIdStatus.REJECTED,
        },
      );

      expect(result).toEqual(rejected);
    });

    it("should clear the default flag when rejecting the default Sender ID", async () => {
      const defaultSender = {
        ...senderId,
        status: SenderIdStatus.APPROVED,
        isDefault: true,
      };

      const rejected = {
        ...defaultSender,
        status: SenderIdStatus.REJECTED,
        isDefault: false,
      };

      senderIds.findById.mockResolvedValue(
        defaultSender,
      );

      senderIds.update.mockResolvedValue(
        rejected,
      );

      const result =
        await service.reject(
          "sender-id-1",
        );

      expect(
        senderIds.update,
      ).toHaveBeenCalledWith(
        "sender-id-1",
        {
          status: SenderIdStatus.REJECTED,
          isDefault: false,
        },
      );

      expect(result).toEqual(rejected);
    });
  });

  // -------------------------------------------------------------------------
  // Disable
  // -------------------------------------------------------------------------

  describe("disable", () => {
    it("should disable a non-default Sender ID without changing the default flag", async () => {
      const approved = {
        ...senderId,
        status: SenderIdStatus.APPROVED,
        isDefault: false,
      };

      const disabled = {
        ...approved,
        status: SenderIdStatus.DISABLED,
      };

      senderIds.findById.mockResolvedValue(
        approved,
      );

      senderIds.update.mockResolvedValue(
        disabled,
      );

      const result =
        await service.disable(
          "sender-id-1",
        );

      expect(
        senderIds.update,
      ).toHaveBeenCalledWith(
        "sender-id-1",
        {
          status: SenderIdStatus.DISABLED,
        },
      );

      expect(result).toEqual(disabled);
    });

    it("should clear the default flag when disabling the default Sender ID", async () => {
      const defaultSender = {
        ...senderId,
        status: SenderIdStatus.APPROVED,
        isDefault: true,
      };

      const disabled = {
        ...defaultSender,
        status: SenderIdStatus.DISABLED,
        isDefault: false,
      };

      senderIds.findById.mockResolvedValue(
        defaultSender,
      );

      senderIds.update.mockResolvedValue(
        disabled,
      );

      const result =
        await service.disable(
          "sender-id-1",
        );

      expect(
        senderIds.update,
      ).toHaveBeenCalledWith(
        "sender-id-1",
        {
          status: SenderIdStatus.DISABLED,
          isDefault: false,
        },
      );

      expect(result).toEqual(disabled);
    });
  });

  // -------------------------------------------------------------------------
  // Default
  // -------------------------------------------------------------------------

  describe("setDefault", () => {
    it("should set an approved Sender ID as default", async () => {
      senderIds.findById.mockResolvedValue(
        senderId,
      );

      const transactionRepository = {
        clearDefaultByClient: jest.fn().mockResolvedValue(1),
        update: jest.fn().mockResolvedValue({
          ...senderId,
          isDefault: true,
        }),
      };

      senderIds.withDatabase.mockReturnValue(
        transactionRepository,
      );

      senderIds.withTransaction.mockImplementation(
        async (
          callback: (
            tx: unknown,
          ) => Promise<SenderId>,
        ) =>
          callback({}),
      );

      const result =
        await service.setDefault(
          "sender-id-1",
        );

      expect(
        senderIds.clearDefaultByClient,
      ).not.toHaveBeenCalled();

      expect(
        transactionRepository
          .clearDefaultByClient,
      ).toHaveBeenCalledWith(
        "client-1",
      );

      expect(
        transactionRepository.update,
      ).toHaveBeenCalledWith(
        "sender-id-1",
        {
          isDefault: true,
        },
      );

      expect(result.isDefault).toBe(
        true,
      );
    });

    it("should reject a non-approved Sender ID", async () => {
      const pending = {
        ...senderId,
        status: SenderIdStatus.PENDING,
      };

      senderIds.findById.mockResolvedValue(
        pending,
      );

      await expect(
        service.setDefault(
          "sender-id-1",
        ),
      ).rejects.toThrow(
        "Sender Id 'sender-id-1' has not been approved.",
      );

      expect(
        senderIds.withTransaction,
      ).not.toHaveBeenCalled();
    });

    it("should return immediately when already default", async () => {
      const defaultSender = {
        ...senderId,
        isDefault: true,
      };

      senderIds.findById.mockResolvedValue(
        defaultSender,
      );

      const result =
        await service.setDefault(
          "sender-id-1",
        );

      expect(result).toEqual(
        defaultSender,
      );

      expect(
        senderIds.withTransaction,
      ).not.toHaveBeenCalled();
    });
  });

});
