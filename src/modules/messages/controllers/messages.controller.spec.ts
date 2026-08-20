import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import { Reflector } from "@nestjs/core";

import {
  AUTHORIZE_METADATA,
} from "../../../common/authorization/constants/authorization.constants.js";

import {
  Permissions,
} from "../../../common/authorization/permissions/permissions.registry.js";

import {
  MessageStatus,
} from "@prisma/client";

import { CreateMessageDto } from "../dto/create-message.dto.js";
import { FindMessagesDto } from "../dto/find-messages.dto.js";
import { MessageMapper } from "../message.mapper.js";
import { MessageService } from "../services/message.service.js";

import { MessagesController } from "./messages.controller.js";

describe("MessagesController", () => {
  let controller: MessagesController;

  let messages: {
    create: jest.Mock;
    findByClient: jest.Mock;
    findById: jest.Mock;
    findByPublicId: jest.Mock;
    findStatusEvents: jest.Mock;
  };

  let mapper: {
    toResponse: jest.Mock;
    toResponses: jest.Mock;
    toStatusResponses: jest.Mock;
  };

  const clientId =
    "550e8400-e29b-41d4-a716-446655440000";

  const messageId =
    "650e8400-e29b-41d4-a716-446655440000";

  const message = {
    id: messageId,
    publicId: "MSG-001",
    clientId,
    destination: "265991234567",
    body: "Hello",
    encoding: "GSM7",
    segmentCount: 1,
    currentStatus: MessageStatus.QUEUED,
  };

  const response = {
    id: messageId,
    publicId: "MSG-001",
    destination: "265991234567",
    body: "Hello",
    encoding: "GSM7",
    segmentCount: 1,
    currentStatus: MessageStatus.QUEUED,
  };

  beforeEach(() => {
    messages = {
      create: jest.fn(),
      findByClient: jest.fn(),
      findById: jest.fn(),
      findByPublicId: jest.fn(),
      findStatusEvents: jest.fn(),
    };

    mapper = {
      toResponse: jest.fn(),
      toResponses: jest.fn(),
      toStatusResponses: jest.fn(),
    };

    controller =
      new MessagesController(
        messages as unknown as MessageService,
        mapper as unknown as MessageMapper,
      );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // findMany
  // -------------------------------------------------------------------------

  describe("findMany", () => {
    it("should retrieve and map messages for a client", async () => {
      const dto = {
        limit: 25,
        offset: 50,
        status: MessageStatus.QUEUED,
      } as FindMessagesDto;

      const entries = [
        message,
      ];

      const responses = [
        response,
      ];

      messages.findByClient.mockResolvedValue(
        entries,
      );

      mapper.toResponses.mockReturnValue(
        responses,
      );

      const result =
        await controller.findMany(
          clientId,
          dto,
        );

      expect(
        messages.findByClient,
      ).toHaveBeenCalledWith(
        clientId,
        {
          limit: 25,
          offset: 50,
          status: MessageStatus.QUEUED,
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

    it("should pass undefined pagination and status values", async () => {
      const dto =
        {} as FindMessagesDto;

      messages.findByClient.mockResolvedValue(
        [],
      );

      mapper.toResponses.mockReturnValue(
        [],
      );

      await controller.findMany(
        clientId,
        dto,
      );

      expect(
        messages.findByClient,
      ).toHaveBeenCalledWith(
        clientId,
        {
          limit: undefined,
          offset: undefined,
          status: undefined,
        },
      );
    });
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------

  describe("create", () => {
    it("should create and map a message", async () => {
      const dto = {
        destination: "265991234567",
        body: "Hello",
        encoding: "GSM7",
      } as CreateMessageDto;

      messages.create.mockResolvedValue(
        message,
      );

      mapper.toResponse.mockReturnValue(
        response,
      );

      const result =
        await controller.create(
          clientId,
          dto,
        );

      expect(
        messages.create,
      ).toHaveBeenCalledWith(
        clientId,
        dto,
      );

      expect(
        mapper.toResponse,
      ).toHaveBeenCalledWith(
        message,
      );

      expect(result).toBe(
        response,
      );
    });
  });

  // -------------------------------------------------------------------------
  // findById
  // -------------------------------------------------------------------------

  describe("findById", () => {
    it("should retrieve and map a message", async () => {
      messages.findById.mockResolvedValue(
        message,
      );

      mapper.toResponse.mockReturnValue(
        response,
      );

      const result =
        await controller.findById(
          clientId,
          messageId,
        );

      expect(
        messages.findById,
      ).toHaveBeenCalledWith(
        clientId,
        messageId,
      );

      expect(
        mapper.toResponse,
      ).toHaveBeenCalledWith(
        message,
      );

      expect(result).toBe(
        response,
      );
    });
  });

  // -------------------------------------------------------------------------
  // findByPublicId
  // -------------------------------------------------------------------------

  describe("findByPublicId", () => {
    it("should retrieve and map a message", async () => {
      messages.findByPublicId.mockResolvedValue(
        message,
      );

      mapper.toResponse.mockReturnValue(
        response,
      );

      const result =
        await controller.findByPublicId(
          clientId,
          "MSG-001",
        );

      expect(
        messages.findByPublicId,
      ).toHaveBeenCalledWith(
        clientId,
        "MSG-001",
      );

      expect(
        mapper.toResponse,
      ).toHaveBeenCalledWith(
        message,
      );

      expect(result).toBe(
        response,
      );
    });
  });

  // -------------------------------------------------------------------------
  // findStatusEvents
  // -------------------------------------------------------------------------

  describe("findStatusEvents", () => {
    it("should retrieve and map status events", async () => {
      const events = [
        {
          id: "event-1",
          messageId,
          status:
            MessageStatus.QUEUED,
          source: "CONTROL_PLANE",
        },
      ];

      const responses = [
        {
          id: "event-1",
          status:
            MessageStatus.QUEUED,
        },
      ];

      messages.findStatusEvents.mockResolvedValue(
        events,
      );

      mapper.toStatusResponses.mockReturnValue(
        responses,
      );

      const result =
        await controller.findStatusEvents(
          clientId,
          messageId,
        );

      expect(
        messages.findStatusEvents,
      ).toHaveBeenCalledWith(
        clientId,
        messageId,
      );

      expect(
        mapper.toStatusResponses,
      ).toHaveBeenCalledWith(
        events,
      );

      expect(result).toBe(
        responses,
      );
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
        keyof MessagesController,
    ): readonly string[] | undefined => {
      const handler =
        MessagesController
          .prototype[
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

    it("should require messages.read for findMany", () => {
      expect(
        getPermission(
          "findMany",
        ),
      ).toEqual([
        Permissions.MESSAGES_READ,
      ]);
    });

    it("should require messages.read for findById", () => {
      expect(
        getPermission(
          "findById",
        ),
      ).toEqual([
        Permissions.MESSAGES_READ,
      ]);
    });

    it("should require messages.read for findByPublicId", () => {
      expect(
        getPermission(
          "findByPublicId",
        ),
      ).toEqual([
        Permissions.MESSAGES_READ,
      ]);
    });

    it("should require messages.read for findStatusEvents", () => {
      expect(
        getPermission(
          "findStatusEvents",
        ),
      ).toEqual([
        Permissions.MESSAGES_READ,
      ]);
    });

    it("should require messages.create for create", () => {
      expect(
        getPermission(
          "create",
        ),
      ).toEqual([
        Permissions.MESSAGES_CREATE,
      ]);
    });
  });
});