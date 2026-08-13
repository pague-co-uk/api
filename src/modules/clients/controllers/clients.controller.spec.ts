import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { ClientStatus } from "@prisma/client";

import type { ClientMapper } from "../client.mapper.js";
import type { ClientService } from "../services/clients.service.js";

import { initTelemetry } from "@pague-co-uk/sms-gateway-telemetry";
import { ClientsController } from "./clients.controller.js";

describe("ClientsController", () => {
  let controller: ClientsController;

  let clients: {
    findMany: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    activate: jest.Mock;
    suspend: jest.Mock;
    disable: jest.Mock;
  };

  let mapper: {
    toResponse: jest.Mock;
    toSummary: jest.Mock;
    toSummaries: jest.Mock;
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
    clients = {
      findMany: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      activate: jest.fn(),
      suspend: jest.fn(),
      disable: jest.fn(),
    };

    mapper = {
      toResponse: jest.fn(),
      toSummary: jest.fn(),
      toSummaries: jest.fn(),
    };

    controller = new ClientsController(
      clients as unknown as ClientService,
      mapper as unknown as ClientMapper,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // findMany
  // -------------------------------------------------------------------------

  describe("findMany", () => {
    it("should retrieve and map a paginated list of clients", async () => {
      const items = [
        {
          id: "client-1",
          publicId: "CLT-001",
        },
      ];

      const page = {
        items,
        page: 1,
        pageSize: 20,
        totalItems: 1,
      };

      const summaries = [
        {
          clientCode: "CLT-001",
          companyName:
            "Vibrant Systems Limited",
        },
      ];

      clients.findMany.mockResolvedValue(page);

      mapper.toSummaries.mockReturnValue(
        summaries,
      );

      const dto = {
        page: 1,
        pageSize: 20,
        search: "Vibrant",
        status: ClientStatus.ACTIVE,
      };

      const result =
        await controller.findMany(dto);

      expect(
        clients.findMany,
      ).toHaveBeenCalledWith({
        page: dto.page,
        pageSize: dto.pageSize,
        search: dto.search,
        status: dto.status,
      });

      expect(
        mapper.toSummaries,
      ).toHaveBeenCalledWith(items);

      expect(result.data).toEqual(
        summaries,
      );

      expect(result.pagination).toEqual(
        expect.objectContaining({
          page: 1,
          pageSize: 20,
          totalItems: 1,
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // findById
  // -------------------------------------------------------------------------

  describe("findById", () => {
    it("should retrieve and map a client", async () => {
      const client = {
        id: "client-1",
        publicId: "CLT-001",
      };

      const response = {
        clientCode: "CLT-001",
      };

      clients.findById.mockResolvedValue(
        client,
      );

      mapper.toResponse.mockReturnValue(
        response,
      );

      const result =
        await controller.findById(
          "client-1",
        );

      expect(
        clients.findById,
      ).toHaveBeenCalledWith(
        "client-1",
      );

      expect(
        mapper.toResponse,
      ).toHaveBeenCalledWith(
        client,
      );

      expect(result).toEqual(response);
    });
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------

  describe("create", () => {
    it("should create and map a client", async () => {
      const dto = {
        clientCode: "CLT-001",
        companyName: "Vibrant Systems Limited",
        displayName: "Vibrant Systems",
        email: "admin@vibrantsystems.com",
      };

      const client = {
        id: "client-1",
        publicId: "CLT-001",
      };

      const response = {
        clientCode: "CLT-001",
      };

      clients.create.mockResolvedValue(
        client,
      );

      mapper.toResponse.mockReturnValue(
        response,
      );

      const result =
        await controller.create(dto);

      expect(
        clients.create,
      ).toHaveBeenCalledWith(dto);

      expect(
        mapper.toResponse,
      ).toHaveBeenCalledWith(
        client,
      );

      expect(result).toEqual(response);
    });
  });

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------

  describe("update", () => {
    it("should update and map a client", async () => {
      const dto = {
        companyName: "Updated Company",
      };

      const client = {
        id: "client-1",
        publicId: "CLT-001",
      };

      const response = {
        clientCode: "CLT-001",
        companyName: "Updated Company",
      };

      clients.update.mockResolvedValue(
        client,
      );

      mapper.toResponse.mockReturnValue(
        response,
      );

      const result =
        await controller.update(
          "client-1",
          dto,
        );

      expect(
        clients.update,
      ).toHaveBeenCalledWith(
        "client-1",
        dto,
      );

      expect(
        mapper.toResponse,
      ).toHaveBeenCalledWith(
        client,
      );

      expect(result).toEqual(response);
    });
  });

  // -------------------------------------------------------------------------
  // delete
  // -------------------------------------------------------------------------

  describe("delete", () => {
    it("should delete the client and return void", async () => {
      clients.delete.mockResolvedValue(
        undefined,
      );

      const result =
        await controller.delete(
          "client-1",
        );

      expect(
        clients.delete,
      ).toHaveBeenCalledWith(
        "client-1",
      );

      expect(result).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // activate
  // -------------------------------------------------------------------------

  describe("activate", () => {
    it("should activate and map the client", async () => {
      const client = {
        id: "client-1",
        publicId: "CLT-001",
      };

      const response = {
        clientCode: "CLT-001",
        status: ClientStatus.ACTIVE,
      };

      clients.activate.mockResolvedValue(
        client,
      );

      mapper.toResponse.mockReturnValue(
        response,
      );

      const result =
        await controller.activate(
          "client-1",
        );

      expect(
        clients.activate,
      ).toHaveBeenCalledWith(
        "client-1",
      );

      expect(
        mapper.toResponse,
      ).toHaveBeenCalledWith(
        client,
      );

      expect(result).toEqual(response);
    });
  });

  // -------------------------------------------------------------------------
  // suspend
  // -------------------------------------------------------------------------

  describe("suspend", () => {
    it("should suspend and map the client", async () => {
      const client = {
        id: "client-1",
        publicId: "CLT-001",
      };

      const response = {
        clientCode: "CLT-001",
        status: ClientStatus.SUSPENDED,
      };

      clients.suspend.mockResolvedValue(
        client,
      );

      mapper.toResponse.mockReturnValue(
        response,
      );

      const result =
        await controller.suspend(
          "client-1",
        );

      expect(
        clients.suspend,
      ).toHaveBeenCalledWith(
        "client-1",
      );

      expect(
        mapper.toResponse,
      ).toHaveBeenCalledWith(
        client,
      );

      expect(result).toEqual(response);
    });
  });

  // -------------------------------------------------------------------------
  // disable
  // -------------------------------------------------------------------------

  describe("disable", () => {
    it("should disable and map the client", async () => {
      const client = {
        id: "client-1",
        publicId: "CLT-001",
      };

      const response = {
        clientCode: "CLT-001",
        status: ClientStatus.DISABLED,
      };

      clients.disable.mockResolvedValue(
        client,
      );

      mapper.toResponse.mockReturnValue(
        response,
      );

      const result =
        await controller.disable(
          "client-1",
        );

      expect(
        clients.disable,
      ).toHaveBeenCalledWith(
        "client-1",
      );

      expect(
        mapper.toResponse,
      ).toHaveBeenCalledWith(
        client,
      );

      expect(result).toEqual(response);
    });
  });
});