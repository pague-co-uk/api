import { beforeAll, describe, expect, it, jest } from "@jest/globals";
import { initTelemetry } from "@pague-co-uk/sms-gateway-telemetry";
import { MobileNetworkStatus } from "@prisma/client";
import { MobileNetworkService } from "./mobile-network.service.js";

describe("MobileNetworkService", () => {
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

  it("should create a mobile network record", async () => {
    const networks = {
      findByCode: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: "network-1",
        publicId: "MNO-001",
        name: "Vodafone",
        code: "VOD",
        countryCode: "GB",
        status: MobileNetworkStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };

    const audit = { record: jest.fn() };

    const service = new MobileNetworkService(
      networks as any,
      audit as any,
    );

    await expect(
      service.create({
        publicId: "MNO-001",
        name: "Vodafone",
        code: "VOD",
        countryCode: "GB",
      }),
    ).resolves.toMatchObject({ code: "VOD" });

    expect(networks.create).toHaveBeenCalled();
  });

  it("should delegate prefix pagination to the repository", async () => {
    const network = {
      id: "network-1",
      publicId: "MNO-001",
      name: "Vodafone",
      code: "VOD",
      countryCode: "GB",
      status: MobileNetworkStatus.ACTIVE,
      prefixes: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const page = {
      items: [{
        id: "prefix-1",
        mobileNetworkId: "network-1",
        prefix: "447",
        countryCode: "GB",
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }],
      page: 1,
      pageSize: 20,
      totalItems: 1,
    };

    const networks = {
      findById: jest.fn().mockResolvedValue(network),
      findPrefixesByNetwork: jest.fn().mockResolvedValue(page),
      findPrefixByCountryCodeAndPrefix: jest.fn().mockResolvedValue(null),
    };

    const service = new MobileNetworkService(networks as any, { record: jest.fn() } as any);

    await expect(service.findManyPrefixes("network-1", { page: 1, pageSize: 20 })).resolves.toEqual(page);
    expect(networks.findPrefixesByNetwork).toHaveBeenCalledWith("network-1", { page: 1, pageSize: 20 });
  });

  it("should reject duplicate country+prefix combinations", async () => {
    const networks = {
      findById: jest.fn().mockResolvedValue({
        id: "network-1",
        publicId: "MNO-001",
        name: "Vodafone",
        code: "VOD",
        countryCode: "GB",
        status: MobileNetworkStatus.ACTIVE,
        prefixes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      findPrefixByCountryCodeAndPrefix: jest.fn().mockResolvedValue({
        id: "prefix-9",
        mobileNetworkId: "network-2",
        prefix: "447",
        countryCode: "GB",
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };

    const service = new MobileNetworkService(networks as any, { record: jest.fn() } as any);

    await expect(service.createPrefix("network-1", { prefix: "447", countryCode: "GB", enabled: true })).rejects.toThrow("already exists");
  });
});
