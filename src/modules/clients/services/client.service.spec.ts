import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import {
  ClientStatus,
  type Client,
} from "@prisma/client";

import type { AuditService } from "../../../audit/index.js";
import { ClientNotFoundException } from "../../../exceptions/entity/clients.exceptions.js";
import { ClientRepository } from "../../../repositories/ClientRepository.js";

import { initTelemetry } from "@pague-co-uk/sms-gateway-telemetry";
import { ClientService } from "./clients.service.js";

describe("ClientService", () => {
  let service: ClientService;

  let clients: {
    findById: jest.MockedFunction<
      ClientRepository["findById"]
    >;

    findByPublicId: jest.MockedFunction<
      ClientRepository["findByPublicId"]
    >;

    findMany: jest.MockedFunction<
      ClientRepository["findMany"]
    >;

    create: jest.MockedFunction<
      ClientRepository["create"]
    >;

    update: jest.MockedFunction<
      ClientRepository["update"]
    >;

    delete: jest.MockedFunction<
      ClientRepository["delete"]
    >;

    existsByEmail: jest.MockedFunction<
      ClientRepository["existsByEmail"]
    >;
  };

  let audit: {
    record: jest.MockedFunction<
      AuditService["record"]
    >;
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

  const client: Client = {
    id: "client-1",
    publicId: "CLT-001",
    companyName: "Vibrant Systems Limited",
    displayName: "Vibrant Systems",
    email: "admin@vibrantsystems.com",
    phone: "+265991234567",
    status: ClientStatus.ACTIVE,
    rateLimitPerSecond: 100,
    metadata: null,
    timezone: "Africa/Blantyre",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };

  const createDto = {
    clientCode: "CLT-001",
    companyName: "Vibrant Systems Limited",
    displayName: "Vibrant Systems",
    email: "admin@vibrantsystems.com",
    phone: "+265991234567",
    rateLimitPerSecond: 100,
    timezone: "Africa/Blantyre",
  };

  beforeEach(() => {
    clients = {
      findById: jest.fn(),
      findByPublicId: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      existsByEmail: jest.fn(),
    };

    audit = {
      record: jest.fn(),
    };

    service = new ClientService(
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
    it("should return the client", async () => {
      clients.findById.mockResolvedValue(client);

      const result =
        await service.findById("client-1");

      expect(result).toEqual(client);

      expect(
        clients.findById,
      ).toHaveBeenCalledWith("client-1");
    });

    it("should throw ClientNotFoundException when the client does not exist", async () => {
      clients.findById.mockResolvedValue(null);

      await expect(
        service.findById("client-1"),
      ).rejects.toBeInstanceOf(
        ClientNotFoundException,
      );

      expect(
        clients.findById,
      ).toHaveBeenCalledWith("client-1");
    });
  });

  describe("findByPublicId", () => {
    it("should return the client", async () => {
      clients.findByPublicId.mockResolvedValue(
        client,
      );

      const result =
        await service.findByPublicId("CLT-001");

      expect(result).toEqual(client);

      expect(
        clients.findByPublicId,
      ).toHaveBeenCalledWith("CLT-001");
    });

    it("should throw ClientNotFoundException when the client does not exist", async () => {
      clients.findByPublicId.mockResolvedValue(
        null,
      );

      await expect(
        service.findByPublicId("CLT-001"),
      ).rejects.toBeInstanceOf(
        ClientNotFoundException,
      );
    });
  });

  describe("findMany", () => {
    it("should return the paginated clients", async () => {
      const page = {
        items: [client],
        page: 1,
        pageSize: 20,
        totalItems: 1,
      };

      const query = {
        page: 1,
        pageSize: 20,
        search: "Vibrant",
        status: ClientStatus.ACTIVE,
      };

      clients.findMany.mockResolvedValue(page);

      const result =
        await service.findMany(query);

      expect(result).toEqual(page);

      expect(
        clients.findMany,
      ).toHaveBeenCalledWith(query);
    });
  });

  // -------------------------------------------------------------------------
  // Create
  // -------------------------------------------------------------------------

  describe("create", () => {
    it("should create a client", async () => {
      clients.existsByEmail.mockResolvedValue(
        false,
      );

      clients.create.mockResolvedValue(client);
      audit.record.mockResolvedValue(undefined);

      const result =
        await service.create(createDto);

      expect(result).toEqual(client);

      expect(
        clients.existsByEmail,
      ).toHaveBeenCalledWith(
        createDto.email,
      );

      expect(
        clients.create,
      ).toHaveBeenCalledWith({
        publicId: createDto.clientCode,
        companyName: createDto.companyName,
        displayName: createDto.displayName,
        email: createDto.email,
        phone: createDto.phone,
        rateLimitPerSecond:
          createDto.rateLimitPerSecond,
        timezone: createDto.timezone,
      });
    });

    it("should use companyName when displayName is not provided", async () => {
      clients.existsByEmail.mockResolvedValue(
        false,
      );

      clients.create.mockResolvedValue(client);
      audit.record.mockResolvedValue(undefined);

      await service.create({
        ...createDto,
        displayName: undefined,
      });

      expect(
        clients.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          displayName:
            createDto.companyName,
        }),
      );
    });

    it("should reject an existing email", async () => {
      clients.existsByEmail.mockResolvedValue(
        true,
      );

      await expect(
        service.create(createDto),
      ).rejects.toThrow();

      expect(
        clients.existsByEmail,
      ).toHaveBeenCalledWith(
        createDto.email,
      );

      expect(
        clients.create,
      ).not.toHaveBeenCalled();

      expect(
        audit.record,
      ).not.toHaveBeenCalled();
    });

    it("should record a client.created audit event", async () => {
      clients.existsByEmail.mockResolvedValue(
        false,
      );

      clients.create.mockResolvedValue(client);
      audit.record.mockResolvedValue(undefined);

      await service.create(createDto);

      expect(
        audit.record,
      ).toHaveBeenCalledWith({
        action: "client.created",
        clientId: client.id,
        resourceType: "Client",
        resourceId: client.id,
        metadata: {
          publicId: client.publicId,
          companyName: client.companyName,
          email: client.email,
        },
      });
    });
  });

  // -------------------------------------------------------------------------
  // Update
  // -------------------------------------------------------------------------

  describe("update", () => {
    it("should update the client", async () => {
      const updatedClient: Client = {
        ...client,
        companyName: "Updated Company",
        displayName: "Updated",
      };

      clients.findById.mockResolvedValue(client);

      clients.update.mockResolvedValue(
        updatedClient,
      );

      audit.record.mockResolvedValue(undefined);

      const result =
        await service.update(
          "client-1",
          {
            companyName: "Updated Company",
            displayName: "Updated",
          },
        );

      expect(result).toEqual(updatedClient);

      expect(
        clients.update,
      ).toHaveBeenCalledWith(
        "client-1",
        {
          companyName: "Updated Company",
          displayName: "Updated",
        },
      );
    });

    it("should throw when the client does not exist", async () => {
      clients.findById.mockResolvedValue(null);

      await expect(
        service.update(
          "client-1",
          {
            companyName: "Updated Company",
          },
        ),
      ).rejects.toBeInstanceOf(
        ClientNotFoundException,
      );

      expect(
        clients.update,
      ).not.toHaveBeenCalled();
    });

    it("should check email availability when email changes", async () => {
      clients.findById.mockResolvedValue(client);

      clients.existsByEmail.mockResolvedValue(
        false,
      );

      clients.update.mockResolvedValue(client);
      audit.record.mockResolvedValue(undefined);

      await service.update(
        "client-1",
        {
          email: "new@example.com",
        },
      );

      expect(
        clients.existsByEmail,
      ).toHaveBeenCalledWith(
        "new@example.com",
      );

      expect(
        clients.update,
      ).toHaveBeenCalledWith(
        "client-1",
        {
          email: "new@example.com",
        },
      );
    });

    it("should reject an email that is already in use", async () => {
      clients.findById.mockResolvedValue(client);

      clients.existsByEmail.mockResolvedValue(
        true,
      );

      await expect(
        service.update(
          "client-1",
          {
            email: "existing@example.com",
          },
        ),
      ).rejects.toThrow();

      expect(
        clients.existsByEmail,
      ).toHaveBeenCalledWith(
        "existing@example.com",
      );

      expect(
        clients.update,
      ).not.toHaveBeenCalled();
    });

    it("should not check email availability when email is unchanged", async () => {
      clients.findById.mockResolvedValue(client);

      clients.update.mockResolvedValue(client);
      audit.record.mockResolvedValue(undefined);

      await service.update(
        "client-1",
        {
          email: client.email,
        },
      );

      expect(
        clients.existsByEmail,
      ).not.toHaveBeenCalled();

      expect(
        clients.update,
      ).toHaveBeenCalledWith(
        "client-1",
        {
          email: client.email,
        },
      );
    });

    it("should only include defined fields in the update", async () => {
      clients.findById.mockResolvedValue(client);

      clients.update.mockResolvedValue(client);
      audit.record.mockResolvedValue(undefined);

      await service.update(
        "client-1",
        {
          companyName: "New Company",
          phone: "+265999999999",
        },
      );

      expect(
        clients.update,
      ).toHaveBeenCalledWith(
        "client-1",
        {
          companyName: "New Company",
          phone: "+265999999999",
        },
      );
    });

    it("should record a client.updated audit event", async () => {
      clients.findById.mockResolvedValue(client);

      clients.update.mockResolvedValue(client);
      audit.record.mockResolvedValue(undefined);

      await service.update(
        "client-1",
        {
          companyName: "Updated Company",
        },
      );

      expect(
        audit.record,
      ).toHaveBeenCalledWith({
        action: "client.updated",
        clientId: client.id,
        resourceType: "Client",
        resourceId: client.id,
        metadata: {
          publicId: client.publicId,
          companyName: client.companyName,
          email: client.email,
        },
      });
    });
  });

  // -------------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------------

  describe("delete", () => {
    it("should delete the client and return void", async () => {
      clients.findById.mockResolvedValue(client);

      clients.delete.mockResolvedValue(client);

      audit.record.mockResolvedValue(undefined);

      const result =
        await service.delete("client-1");

      expect(result).toBeUndefined();

      expect(
        clients.findById,
      ).toHaveBeenCalledWith("client-1");

      expect(
        clients.delete,
      ).toHaveBeenCalledWith("client-1");
    });

    it("should throw when the client does not exist", async () => {
      clients.findById.mockResolvedValue(null);

      await expect(
        service.delete("client-1"),
      ).rejects.toBeInstanceOf(
        ClientNotFoundException,
      );

      expect(
        clients.delete,
      ).not.toHaveBeenCalled();

      expect(
        audit.record,
      ).not.toHaveBeenCalled();
    });

    it("should record a client.deleted audit event", async () => {
      clients.findById.mockResolvedValue(client);

      clients.delete.mockResolvedValue(client);

      audit.record.mockResolvedValue(undefined);

      await service.delete("client-1");

      expect(
        audit.record,
      ).toHaveBeenCalledWith({
        action: "client.deleted",
        clientId: client.id,
        resourceType: "Client",
        resourceId: client.id,
        metadata: {
          publicId: client.publicId,
          companyName: client.companyName,
          email: client.email,
        },
      });
    });
  });

  // -------------------------------------------------------------------------
  // Activate
  // -------------------------------------------------------------------------

  describe("activate", () => {
    it("should activate the client", async () => {
      const suspendedClient: Client = {
        ...client,
        status: ClientStatus.SUSPENDED,
      };

      const activatedClient: Client = {
        ...client,
        status: ClientStatus.ACTIVE,
      };

      clients.findById.mockResolvedValue(
        suspendedClient,
      );

      clients.update.mockResolvedValue(
        activatedClient,
      );

      audit.record.mockResolvedValue(undefined);

      const result =
        await service.activate("client-1");

      expect(result).toEqual(
        activatedClient,
      );

      expect(
        clients.update,
      ).toHaveBeenCalledWith(
        "client-1",
        {
          status: ClientStatus.ACTIVE,
        },
      );
    });

    it("should record a client.activated audit event", async () => {
      const suspendedClient: Client = {
        ...client,
        status: ClientStatus.SUSPENDED,
      };

      const activatedClient: Client = {
        ...client,
        status: ClientStatus.ACTIVE,
      };

      clients.findById.mockResolvedValue(
        suspendedClient,
      );

      clients.update.mockResolvedValue(
        activatedClient,
      );

      audit.record.mockResolvedValue(undefined);

      await service.activate("client-1");

      expect(
        audit.record,
      ).toHaveBeenCalledWith({
        action: "client.activated",
        clientId: client.id,
        resourceType: "Client",
        resourceId: client.id,
        metadata: {
          previousStatus:
            ClientStatus.SUSPENDED,
          status:
            ClientStatus.ACTIVE,
        },
      });
    });

    it("should not update an already active client", async () => {
      clients.findById.mockResolvedValue(
        client,
      );

      const result =
        await service.activate("client-1");

      expect(result).toEqual(client);

      expect(
        clients.update,
      ).not.toHaveBeenCalled();

      expect(
        audit.record,
      ).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Suspend
  // -------------------------------------------------------------------------

  describe("suspend", () => {
    it("should suspend the client", async () => {
      const suspendedClient: Client = {
        ...client,
        status: ClientStatus.SUSPENDED,
      };

      clients.findById.mockResolvedValue(
        client,
      );

      clients.update.mockResolvedValue(
        suspendedClient,
      );

      audit.record.mockResolvedValue(undefined);

      const result =
        await service.suspend("client-1");

      expect(result).toEqual(
        suspendedClient,
      );

      expect(
        clients.update,
      ).toHaveBeenCalledWith(
        "client-1",
        {
          status: ClientStatus.SUSPENDED,
        },
      );
    });

    it("should record a client.suspended audit event", async () => {
      const suspendedClient: Client = {
        ...client,
        status: ClientStatus.SUSPENDED,
      };

      clients.findById.mockResolvedValue(
        client,
      );

      clients.update.mockResolvedValue(
        suspendedClient,
      );

      audit.record.mockResolvedValue(undefined);

      await service.suspend("client-1");

      expect(
        audit.record,
      ).toHaveBeenCalledWith({
        action: "client.suspended",
        clientId: client.id,
        resourceType: "Client",
        resourceId: client.id,
        metadata: {
          previousStatus:
            ClientStatus.ACTIVE,
          status:
            ClientStatus.SUSPENDED,
        },
      });
    });

    it("should not update an already suspended client", async () => {
      const suspendedClient: Client = {
        ...client,
        status: ClientStatus.SUSPENDED,
      };

      clients.findById.mockResolvedValue(
        suspendedClient,
      );

      const result =
        await service.suspend("client-1");

      expect(result).toEqual(
        suspendedClient,
      );

      expect(
        clients.update,
      ).not.toHaveBeenCalled();

      expect(
        audit.record,
      ).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Disable
  // -------------------------------------------------------------------------

  describe("disable", () => {
    it("should disable the client", async () => {
      const disabledClient: Client = {
        ...client,
        status: ClientStatus.DISABLED,
      };

      clients.findById.mockResolvedValue(
        client,
      );

      clients.update.mockResolvedValue(
        disabledClient,
      );

      audit.record.mockResolvedValue(undefined);

      const result =
        await service.disable("client-1");

      expect(result).toEqual(
        disabledClient,
      );

      expect(
        clients.update,
      ).toHaveBeenCalledWith(
        "client-1",
        {
          status: ClientStatus.DISABLED,
        },
      );
    });

    it("should record a client.disabled audit event", async () => {
      const disabledClient: Client = {
        ...client,
        status: ClientStatus.DISABLED,
      };

      clients.findById.mockResolvedValue(
        client,
      );

      clients.update.mockResolvedValue(
        disabledClient,
      );

      audit.record.mockResolvedValue(undefined);

      await service.disable("client-1");

      expect(
        audit.record,
      ).toHaveBeenCalledWith({
        action: "client.disabled",
        clientId: client.id,
        resourceType: "Client",
        resourceId: client.id,
        metadata: {
          previousStatus:
            ClientStatus.ACTIVE,
          status:
            ClientStatus.DISABLED,
        },
      });
    });

    it("should not update an already disabled client", async () => {
      const disabledClient: Client = {
        ...client,
        status: ClientStatus.DISABLED,
      };

      clients.findById.mockResolvedValue(
        disabledClient,
      );

      const result =
        await service.disable("client-1");

      expect(result).toEqual(
        disabledClient,
      );

      expect(
        clients.update,
      ).not.toHaveBeenCalled();

      expect(
        audit.record,
      ).not.toHaveBeenCalled();
    });
  });
});