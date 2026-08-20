import { AuthorizationService } from "./authorization.service.js";

describe("AuthorizationService", () => {
  let service: AuthorizationService;

  const createUser = (
    overrides: Partial<{
      userId: string;
      clientId: string;
      roles: any[];
    }> = {},
  ) => ({
    sessionId: "session-1",
    userId:
      overrides.userId ??
      "user-1",
    clientId:
      overrides.clientId ??
      "client-1",

    username: "user",
    email: "user@example.com",
    firstName: "Test",
    lastName: "User",

    active: true,
    locked: false,
    mfaEnabled: true,

    roles:
      overrides.roles ?? [],
  });

  const createRole = (
    name: string,
    permissions: string[] = [],
  ) => ({
    id: `${name}-id`,
    name,
    description: null,
    permissions:
      permissions.map(
        (permission) => ({
          name: permission,
        }),
      ),
  });

  beforeEach(() => {
    service =
      new AuthorizationService();
  });

  describe("hasPermissions", () => {
    it("should return true when all required permissions are granted", () => {
      const user =
        createUser({
          roles: [
            createRole(
              "Client Administrator",
              [
                "clients.read",
                "clients.create",
                "clients.update",
              ],
            ),
          ],
        });

      expect(
        service.hasPermissions(
          user,
          [
            "clients.read",
            "clients.create",
          ],
        ),
      ).toBe(true);
    });

    it("should return false when a required permission is missing", () => {
      const user =
        createUser({
          roles: [
            createRole(
              "Client Administrator",
              [
                "clients.read",
                "clients.create",
              ],
            ),
          ],
        });

      expect(
        service.hasPermissions(
          user,
          [
            "clients.read",
            "clients.delete",
          ],
        ),
      ).toBe(false);
    });

    it("should combine permissions from multiple roles", () => {
      const user =
        createUser({
          roles: [
            createRole(
              "Role A",
              ["clients.read"],
            ),
            createRole(
              "Role B",
              ["clients.update"],
            ),
          ],
        });

      expect(
        service.hasPermissions(
          user,
          [
            "clients.read",
            "clients.update",
          ],
        ),
      ).toBe(true);
    });

    it("should return true when no permissions are required", () => {
      const user =
        createUser();

      expect(
        service.hasPermissions(
          user,
          [],
        ),
      ).toBe(true);
    });
  });

  describe("isAuthorized", () => {
    it("should delegate to hasPermissions", () => {
      const user =
        createUser({
          roles: [
            createRole(
              "Client Administrator",
              ["clients.read"],
            ),
          ],
        });

      expect(
        service.isAuthorized(
          user,
          ["clients.read"],
        ),
      ).toBe(true);

      expect(
        service.isAuthorized(
          user,
          ["clients.delete"],
        ),
      ).toBe(false);
    });
  });

  describe("isPagueSuperUser", () => {
    it("should return true for a Pague Super User", () => {
      const user =
        createUser({
          roles: [
            createRole(
              "Pague Super User",
            ),
          ],
        });

      expect(
        service.isPagueSuperUser(
          user,
        ),
      ).toBe(true);
    });

    it("should return false when the user does not have the Pague Super User role", () => {
      const user =
        createUser({
          roles: [
            createRole(
              "Client Administrator",
            ),
          ],
        });

      expect(
        service.isPagueSuperUser(
          user,
        ),
      ).toBe(false);
    });

    it("should return false when the user has no roles", () => {
      const user =
        createUser();

      expect(
        service.isPagueSuperUser(
          user,
        ),
      ).toBe(false);
    });

    it("should return true when Pague Super User is one of multiple roles", () => {
      const user =
        createUser({
          roles: [
            createRole(
              "Client Administrator",
            ),
            createRole(
              "Pague Super User",
            ),
          ],
        });

      expect(
        service.isPagueSuperUser(
          user,
        ),
      ).toBe(true);
    });
  });

  describe("canAccessClient", () => {
    it("should allow a Pague Super User to access any client", () => {
      const user =
        createUser({
          clientId: "pague-client",
          roles: [
            createRole(
              "Pague Super User",
            ),
          ],
        });

      expect(
        service.canAccessClient(
          user,
          "client-1",
        ),
      ).toBe(true);

      expect(
        service.canAccessClient(
          user,
          "client-2",
        ),
      ).toBe(true);

      expect(
        service.canAccessClient(
          user,
          "client-999",
        ),
      ).toBe(true);
    });

    it("should allow a normal client user to access their own client", () => {
      const user =
        createUser({
          clientId: "client-1",
          roles: [
            createRole(
              "Client Administrator",
            ),
          ],
        });

      expect(
        service.canAccessClient(
          user,
          "client-1",
        ),
      ).toBe(true);
    });

    it("should deny a normal client user access to another client", () => {
      const user =
        createUser({
          clientId: "client-1",
          roles: [
            createRole(
              "Client Administrator",
            ),
          ],
        });

      expect(
        service.canAccessClient(
          user,
          "client-2",
        ),
      ).toBe(false);
    });

    it("should not grant cross-client access merely because the user has permissions", () => {
      const user =
        createUser({
          clientId: "client-1",
          roles: [
            createRole(
              "Client Administrator",
              [
                "api_keys.read",
                "api_keys.create",
                "api_keys.revoke",
              ],
            ),
          ],
        });

      expect(
        service.hasPermissions(
          user,
          ["api_keys.read"],
        ),
      ).toBe(true);

      expect(
        service.canAccessClient(
          user,
          "client-2",
        ),
      ).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // hasCapabilities
  // -------------------------------------------------------------------------

  describe("hasCapabilities", () => {
    const apiKey = {
      id: "api-key-1",
      publicId: "AK-001",
      clientId: "client-1",
      name: "Production",
      capabilities: [
        "messages.send",
        "messages.status.read",
      ],
    };

    it("should authorize when the API key has the required capability", () => {
      expect(
        service.hasCapabilities(
          apiKey,
          ["messages.send"],
        ),
      ).toBe(true);
    });

    it("should authorize when the API key has all required capabilities", () => {
      expect(
        service.hasCapabilities(
          apiKey,
          [
            "messages.send",
            "messages.status.read",
          ],
        ),
      ).toBe(true);
    });

    it("should reject when the API key is missing a required capability", () => {
      expect(
        service.hasCapabilities(
          apiKey,
          ["messages.delete"],
        ),
      ).toBe(false);
    });

    it("should reject when the API key is missing one of multiple required capabilities", () => {
      expect(
        service.hasCapabilities(
          apiKey,
          [
            "messages.send",
            "messages.delete",
          ],
        ),
      ).toBe(false);
    });

    it("should authorize when no capabilities are required", () => {
      expect(
        service.hasCapabilities(
          apiKey,
          [],
        ),
      ).toBe(true);
    });

    it("should reject an API key with no capabilities when a capability is required", () => {
      expect(
        service.hasCapabilities(
          {
            ...apiKey,
            capabilities: [],
          },
          ["messages.send"],
        ),
      ).toBe(false);
    });

    it("should not mutate the API key capabilities", () => {
      const capabilities = [
        "messages.send",
        "messages.status.read",
      ];

      const key = {
        ...apiKey,
        capabilities,
      };

      service.hasCapabilities(
        key,
        ["messages.send"],
      );

      expect(
        key.capabilities,
      ).toEqual(capabilities);
    });
  });
});