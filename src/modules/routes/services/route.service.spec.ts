import { beforeAll, describe, expect, it, jest } from "@jest/globals";
import { initTelemetry } from "@pague-co-uk/sms-gateway-telemetry";
import { RouteStatus } from "@prisma/client";
import { RouteService } from "./route.service.js";

describe("RouteService", () => {
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
  it("should create a route when dependencies exist", async () => {
    const routes = {
      findByClientAndNetworkAndPriority: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: "route-1",
        publicId: "ROUTE-001",
        clientId: "client-1",
        mobileNetworkId: "network-1",
        connectorId: "connector-1",
        priority: 10,
        status: RouteStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };

    const clients = { findById: jest.fn().mockResolvedValue({ id: "client-1" }) };
    const networks = { findById: jest.fn().mockResolvedValue({ id: "network-1" }) };
    const connectors = { findById: jest.fn().mockResolvedValue({ id: "connector-1" }) };
    const audit = { record: jest.fn() };

    const service = new RouteService(
      routes as any,
      clients as any,
      networks as any,
      connectors as any,
      audit as any,
    );

    await expect(
      service.create({
        publicId: "ROUTE-001",
        clientId: "client-1",
        mobileNetworkId: "network-1",
        connectorId: "connector-1",
        priority: 10,
      }),
    ).resolves.toMatchObject({ priority: 10 });

    expect(routes.create).toHaveBeenCalled();
  });
});
