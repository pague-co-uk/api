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

import { initTelemetry } from "@pague-co-uk/sms-gateway-telemetry";
import { SenderIdMapper } from "../sender-id.mapper.js";
import { SenderIdService } from "../services/sender-id.service.js";
import { SenderIdsController } from "./sender-ids.controller.js";

describe("SenderIdsController", () => {
  let controller: SenderIdsController;

  let senderIds: {
    findMany: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    approve: jest.Mock;
    reject: jest.Mock;
    disable: jest.Mock;
    setDefault: jest.Mock;
  };

  let mapper: {
    toResponse: jest.Mock;
    toResponses: jest.Mock;
  };

  const senderId: SenderId = {
    id: "sender-id-1",
    publicId: "SID-001",
    clientId: "client-1",
    sender: "VIBRANT",
    status: SenderIdStatus.APPROVED,
    isDefault: false,
    createdAt: new Date(
      "2026-01-01T00:00:00.000Z",
    ),
    updatedAt: new Date(
      "2026-01-01T00:00:00.000Z",
    ),
  };

  const response = {
    id: senderId.id,
    publicId: senderId.publicId,
    clientId: senderId.clientId,
    sender: senderId.sender,
    status: senderId.status,
    isDefault: senderId.isDefault,
    createdAt: senderId.createdAt,
    updatedAt: senderId.updatedAt,
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
      findMany: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      approve: jest.fn(),
      reject: jest.fn(),
      disable: jest.fn(),
      setDefault: jest.fn(),
    };

    mapper = {
      toResponse: jest.fn(),
      toResponses: jest.fn(),
    };

    controller = new SenderIdsController(
      senderIds as unknown as SenderIdService,
      mapper as unknown as SenderIdMapper,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // findMany
  // -------------------------------------------------------------------------

  describe("findMany", () => {
    it("should retrieve and map a paginated list of Sender IDs", async () => {
      const items = [senderId];

      const page = {
        items,
        page: 1,
        pageSize: 20,
        totalItems: 1,
      };

      const responses = [response];

      senderIds.findMany.mockResolvedValue(page);

      mapper.toResponses.mockReturnValue(
        responses,
      );

      const dto = {
        page: 1,
        pageSize: 20,
        clientId: "client-1",
        status: SenderIdStatus.APPROVED,
        sender: "VIBRANT",
        search: "VIB",
        isDefault: false,
      };

      const result =
        await controller.findMany(dto);

      expect(
        senderIds.findMany,
      ).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
        clientId: "client-1",
        status: SenderIdStatus.APPROVED,
        sender: "VIBRANT",
        search: "VIB",
        isDefault: false,
      });

      expect(
        mapper.toResponses,
      ).toHaveBeenCalledWith(items);

      expect(result.data).toEqual(
        responses,
      );

      expect(result.pagination).toEqual({
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      });
    });

    it("should apply default pagination values", async () => {
      const page = {
        items: [],
        page: 1,
        pageSize: 20,
        totalItems: 0,
      };

      senderIds.findMany.mockResolvedValue(
        page,
      );

      mapper.toResponses.mockReturnValue(
        [],
      );

      const result =
        await controller.findMany({});

      expect(
        senderIds.findMany,
      ).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
        clientId: undefined,
        status: undefined,
        sender: undefined,
        search: undefined,
        isDefault: undefined,
      });

      expect(result.data).toEqual([]);

      expect(result.pagination).toEqual({
        page: 1,
        pageSize: 20,
        totalItems: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false,
      });
    });
  });

  // -------------------------------------------------------------------------
  // findById
  // -------------------------------------------------------------------------

  describe("findById", () => {
    it("should retrieve and map a Sender ID", async () => {
      senderIds.findById.mockResolvedValue(
        senderId,
      );

      mapper.toResponse.mockReturnValue(
        response,
      );

      const result =
        await controller.findById(
          "sender-id-1",
        );

      expect(
        senderIds.findById,
      ).toHaveBeenCalledWith(
        "sender-id-1",
      );

      expect(
        mapper.toResponse,
      ).toHaveBeenCalledWith(
        senderId,
      );

      expect(result).toEqual(
        response,
      );
    });
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------

  describe("create", () => {
    it("should create and map a Sender ID", async () => {
      const dto = {
        publicId: "SID-001",
        clientId: "client-1",
        sender: "VIBRANT",
      };

      senderIds.create.mockResolvedValue(
        senderId,
      );

      mapper.toResponse.mockReturnValue(
        response,
      );

      const result =
        await controller.create(dto);

      expect(
        senderIds.create,
      ).toHaveBeenCalledWith(dto);

      expect(
        mapper.toResponse,
      ).toHaveBeenCalledWith(
        senderId,
      );

      expect(result).toEqual(
        response,
      );
    });
  });

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------

  describe("update", () => {
    it("should update and map a Sender ID", async () => {
      const dto = {
        sender: "VIBRANT2",
      };

      const updated = {
        ...senderId,
        sender: "VIBRANT2",
      };

      const updatedResponse = {
        ...response,
        sender: "VIBRANT2",
      };

      senderIds.update.mockResolvedValue(
        updated,
      );

      mapper.toResponse.mockReturnValue(
        updatedResponse,
      );

      const result =
        await controller.update(
          "sender-id-1",
          dto,
        );

      expect(
        senderIds.update,
      ).toHaveBeenCalledWith(
        "sender-id-1",
        dto,
      );

      expect(
        mapper.toResponse,
      ).toHaveBeenCalledWith(
        updated,
      );

      expect(result).toEqual(
        updatedResponse,
      );
    });
  });

  // -------------------------------------------------------------------------
  // delete
  // -------------------------------------------------------------------------

  describe("delete", () => {
    it("should delete the Sender ID and return void", async () => {
      senderIds.delete.mockResolvedValue(
        undefined,
      );

      const result =
        await controller.delete(
          "sender-id-1",
        );

      expect(
        senderIds.delete,
      ).toHaveBeenCalledWith(
        "sender-id-1",
      );

      expect(result).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // approve
  // -------------------------------------------------------------------------

  describe("approve", () => {
    it("should approve and map the Sender ID", async () => {
      const approved = {
        ...senderId,
        status: SenderIdStatus.APPROVED,
      };

      senderIds.approve.mockResolvedValue(
        approved,
      );

      mapper.toResponse.mockReturnValue(
        response,
      );

      const result =
        await controller.approve(
          "sender-id-1",
        );

      expect(
        senderIds.approve,
      ).toHaveBeenCalledWith(
        "sender-id-1",
      );

      expect(
        mapper.toResponse,
      ).toHaveBeenCalledWith(
        approved,
      );

      expect(result).toEqual(
        response,
      );
    });
  });

  // -------------------------------------------------------------------------
  // reject
  // -------------------------------------------------------------------------

  describe("reject", () => {
    it("should reject and map the Sender ID", async () => {
      const rejected = {
        ...senderId,
        status: SenderIdStatus.REJECTED,
        isDefault: false,
      };

      const rejectedResponse = {
        ...response,
        status: SenderIdStatus.REJECTED,
        isDefault: false,
      };

      senderIds.reject.mockResolvedValue(
        rejected,
      );

      mapper.toResponse.mockReturnValue(
        rejectedResponse,
      );

      const result =
        await controller.reject(
          "sender-id-1",
        );

      expect(
        senderIds.reject,
      ).toHaveBeenCalledWith(
        "sender-id-1",
      );

      expect(
        mapper.toResponse,
      ).toHaveBeenCalledWith(
        rejected,
      );

      expect(result).toEqual(
        rejectedResponse,
      );
    });
  });

  // -------------------------------------------------------------------------
  // disable
  // -------------------------------------------------------------------------

  describe("disable", () => {
    it("should disable and map the Sender ID", async () => {
      const disabled = {
        ...senderId,
        status: SenderIdStatus.DISABLED,
        isDefault: false,
      };

      const disabledResponse = {
        ...response,
        status: SenderIdStatus.DISABLED,
        isDefault: false,
      };

      senderIds.disable.mockResolvedValue(
        disabled,
      );

      mapper.toResponse.mockReturnValue(
        disabledResponse,
      );

      const result =
        await controller.disable(
          "sender-id-1",
        );

      expect(
        senderIds.disable,
      ).toHaveBeenCalledWith(
        "sender-id-1",
      );

      expect(
        mapper.toResponse,
      ).toHaveBeenCalledWith(
        disabled,
      );

      expect(result).toEqual(
        disabledResponse,
      );
    });
  });

  // -------------------------------------------------------------------------
  // setDefault
  // -------------------------------------------------------------------------

  describe("setDefault", () => {
    it("should set the Sender ID as default and map it", async () => {
      const defaultSender = {
        ...senderId,
        isDefault: true,
      };

      const defaultResponse = {
        ...response,
        isDefault: true,
      };

      senderIds.setDefault.mockResolvedValue(
        defaultSender,
      );

      mapper.toResponse.mockReturnValue(
        defaultResponse,
      );

      const result =
        await controller.setDefault(
          "sender-id-1",
        );

      expect(
        senderIds.setDefault,
      ).toHaveBeenCalledWith(
        "sender-id-1",
      );

      expect(
        mapper.toResponse,
      ).toHaveBeenCalledWith(
        defaultSender,
      );

      expect(result).toEqual(
        defaultResponse,
      );
    });
  });
});