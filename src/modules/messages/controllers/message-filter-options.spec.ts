import { describe, expect, it, jest } from "@jest/globals";
import { MessageService } from "../services/message.service.js";
import { MessagesController } from "./messages.controller.js";
import { PlatformMessagesController } from "./platform-messages.controller.js";
import type { AuthenticatedUser } from "../../../common/authorization/interfaces/authenticated-user.interface.js";

const options = {
  clients: [{ id: "client-a", publicId: "ACME", displayName: "Acme", companyName: "Acme Ltd" }],
  senderIds: [{ id: "sender-a", clientId: "client-a", sender: "Acme" }, { id: "sender-b", clientId: "client-b", sender: "Other" }],
};

describe("message filter options", () => {
  it("keeps client options available while narrowing sender IDs to the selected client", async () => {
    const service = { getPlatformFilterOptions: jest.fn<() => Promise<typeof options>>().mockResolvedValue(options) };
    const controller = new PlatformMessagesController(service as unknown as MessageService, {} as never);
    const user = { clientId: "platform" } as AuthenticatedUser;
    const result = await controller.filterOptions({ clientId: "client-a" }, user);
    expect(result.clients).toEqual(options.clients);
    expect(result.senderIds).toEqual([options.senderIds[0]]);
    expect(service.getPlatformFilterOptions).toHaveBeenCalledWith(user);
  });

  it("scopes client filter options to the client in the authorized route", async () => {
    const service = { getFilterOptions: jest.fn<() => Promise<typeof options>>().mockResolvedValue(options) };
    const controller = new MessagesController(service as unknown as MessageService, {} as never);
    await controller.filterOptions("client-a");
    expect(service.getFilterOptions).toHaveBeenCalledWith("client-a");
  });

  it("rejects platform filter access for client users before reading names", async () => {
    const service = Object.create(MessageService.prototype) as MessageService;
    Object.assign(service, { configs: { app: { platformClient: "platform" } } });
    await expect(service.getPlatformFilterOptions({ clientId: "client-a", roles: [] } as unknown as AuthenticatedUser)).rejects.toThrow("Platform access is required.");
  });

  it("allows platform super admins independently of their client assignment", async () => {
    const getFilterOptions = jest.fn<() => Promise<typeof options>>().mockResolvedValue(options);
    const service = Object.create(MessageService.prototype) as MessageService;
    Object.assign(service, { messages: { getFilterOptions }, configs: { app: { platformClient: "platform" } } });
    const user = { clientId: "another-client", roles: [{ name: "PLATFORM_SUPER_ADMIN" }] } as unknown as AuthenticatedUser;
    await expect(service.getPlatformFilterOptions(user)).resolves.toEqual(options);
    expect(getFilterOptions).toHaveBeenCalledWith();
  });

  it("does not grant cross-client filter access based only on platform client membership", async () => {
    const getFilterOptions = jest.fn();
    const service = Object.create(MessageService.prototype) as MessageService;
    Object.assign(service, { messages: { getFilterOptions }, configs: { app: { platformClient: "platform" } } });
    const user = { clientId: "platform", roles: [{ name: "CLIENT_ADMIN" }] } as unknown as AuthenticatedUser;
    await expect(service.getPlatformFilterOptions(user)).rejects.toThrow("Platform access is required.");
    expect(getFilterOptions).not.toHaveBeenCalled();
  });
});
