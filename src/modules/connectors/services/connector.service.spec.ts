import { beforeAll, describe, expect, it, jest } from "@jest/globals";
import { initTelemetry } from "@pague-co-uk/sms-gateway-telemetry";
import { ConnectorStatus, ConnectorTransport } from "@prisma/client";
import { ConnectorService } from "./connector.service.js";

describe("ConnectorService", () => {
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
  it("should create a connector record", async () => {
    const connectors = {
      findByCode: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: "connector-1",
        publicId: "CON-001",
        name: "Primary SMPP",
        code: "SMPP-1",
        provider: "OpenSMPP",
        transport: ConnectorTransport.SMPP,
        status: ConnectorStatus.ACTIVE,
        configuration: { host: "127.0.0.1" },
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };

    const audit = { record: jest.fn() };

    const service = new ConnectorService(
      connectors as any,
      audit as any,
    );

    await expect(
      service.create({
        publicId: "CON-001",
        name: "Primary SMPP",
        code: "SMPP-1",
        provider: "OpenSMPP",
        transport: ConnectorTransport.SMPP,
        configuration: { host: "127.0.0.1" },
      }),
    ).resolves.toMatchObject({ code: "SMPP-1" });

    expect(connectors.create).toHaveBeenCalled();
  });
});
