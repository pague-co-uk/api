import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import { initTelemetry } from "@pague-co-uk/sms-gateway-telemetry";

import { MobileNetworkMapper } from "../mobile-network.mapper.js";
import { MobileNetworkService } from "../services/mobile-network.service.js";
import { MobileNetworksController } from "./mobile-networks.controller.js";

describe("MobileNetworksController", () => {
  let controller: MobileNetworksController;

  let mobileNetworks: {
    findManyPrefixes: jest.Mock;
    findPrefixById: jest.Mock;
    createPrefix: jest.Mock;
    updatePrefix: jest.Mock;
    deletePrefix: jest.Mock;
    enablePrefix: jest.Mock;
    disablePrefix: jest.Mock;
  };

  let mapper: {
    toPrefixResponse: jest.Mock;
    toPrefixResponses: jest.Mock;
  };

  const prefix = {
    id: "prefix-1",
    mobileNetworkId: "network-1",
    prefix: "447",
    countryCode: "GB",
    enabled: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };

  const response = {
    id: prefix.id,
    mobileNetworkId: prefix.mobileNetworkId,
    prefix: prefix.prefix,
    countryCode: prefix.countryCode,
    enabled: prefix.enabled,
    createdAt: prefix.createdAt,
    updatedAt: prefix.updatedAt,
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
    mobileNetworks = {
      findManyPrefixes: jest.fn(),
      findPrefixById: jest.fn(),
      createPrefix: jest.fn(),
      updatePrefix: jest.fn(),
      deletePrefix: jest.fn(),
      enablePrefix: jest.fn(),
      disablePrefix: jest.fn(),
    };

    mapper = {
      toPrefixResponse: jest.fn(),
      toPrefixResponses: jest.fn(),
    };

    controller = new MobileNetworksController(
      mobileNetworks as unknown as MobileNetworkService,
      mapper as unknown as MobileNetworkMapper,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findManyPrefixes", () => {
    it("should retrieve and map a paginated list of prefixes", async () => {
      const page = {
        items: [prefix],
        page: 1,
        pageSize: 20,
        totalItems: 1,
      };

      mobileNetworks.findManyPrefixes.mockResolvedValue(page);
      mapper.toPrefixResponses.mockReturnValue([response]);

      const result = await controller.findManyPrefixes("network-1", { page: 1, pageSize: 20 });

      expect(mobileNetworks.findManyPrefixes).toHaveBeenCalledWith("network-1", {
        page: 1,
        pageSize: 20,
      });
      expect(mapper.toPrefixResponses).toHaveBeenCalledWith([prefix]);
      expect(result.data).toEqual([response]);
      expect(result.pagination).toEqual({
        page: 1,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      });
    });
  });

  describe("findPrefixById", () => {
    it("should retrieve a single prefix and map it", async () => {
      mobileNetworks.findPrefixById.mockResolvedValue(prefix);
      mapper.toPrefixResponse.mockReturnValue(response);

      const result = await controller.findPrefixById("network-1", "prefix-1");

      expect(mobileNetworks.findPrefixById).toHaveBeenCalledWith("network-1", "prefix-1");
      expect(mapper.toPrefixResponse).toHaveBeenCalledWith(prefix);
      expect(result).toEqual(response);
    });
  });

  describe("createPrefix", () => {
    it("should create a prefix and map it", async () => {
      const dto = { prefix: "447", countryCode: "GB", enabled: true };

      mobileNetworks.createPrefix.mockResolvedValue(prefix);
      mapper.toPrefixResponse.mockReturnValue(response);

      const result = await controller.createPrefix("network-1", dto as any);

      expect(mobileNetworks.createPrefix).toHaveBeenCalledWith("network-1", dto);
      expect(mapper.toPrefixResponse).toHaveBeenCalledWith(prefix);
      expect(result).toEqual(response);
    });
  });

  describe("updatePrefix", () => {
    it("should update a prefix and map it", async () => {
      const dto = { prefix: "447", countryCode: "GB", enabled: false };

      mobileNetworks.updatePrefix.mockResolvedValue(prefix);
      mapper.toPrefixResponse.mockReturnValue(response);

      const result = await controller.updatePrefix("network-1", "prefix-1", dto as any);

      expect(mobileNetworks.updatePrefix).toHaveBeenCalledWith("network-1", "prefix-1", dto);
      expect(mapper.toPrefixResponse).toHaveBeenCalledWith(prefix);
      expect(result).toEqual(response);
    });
  });

  describe("deletePrefix", () => {
    it("should delete a prefix", async () => {
      await controller.deletePrefix("network-1", "prefix-1");

      expect(mobileNetworks.deletePrefix).toHaveBeenCalledWith("network-1", "prefix-1");
    });
  });

  describe("enablePrefix", () => {
    it("should enable a prefix and map it", async () => {
      mobileNetworks.enablePrefix.mockResolvedValue(prefix);
      mapper.toPrefixResponse.mockReturnValue(response);

      const result = await controller.enablePrefix("network-1", "prefix-1");

      expect(mobileNetworks.enablePrefix).toHaveBeenCalledWith("network-1", "prefix-1");
      expect(mapper.toPrefixResponse).toHaveBeenCalledWith(prefix);
      expect(result).toEqual(response);
    });
  });

  describe("disablePrefix", () => {
    it("should disable a prefix and map it", async () => {
      mobileNetworks.disablePrefix.mockResolvedValue(prefix);
      mapper.toPrefixResponse.mockReturnValue(response);

      const result = await controller.disablePrefix("network-1", "prefix-1");

      expect(mobileNetworks.disablePrefix).toHaveBeenCalledWith("network-1", "prefix-1");
      expect(mapper.toPrefixResponse).toHaveBeenCalledWith(prefix);
      expect(result).toEqual(response);
    });
  });
});
