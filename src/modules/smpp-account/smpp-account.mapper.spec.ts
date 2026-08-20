import {
  describe,
  expect,
  it,
} from "@jest/globals";

import {
  SmppAccountStatus,
} from "@prisma/client";

import { SmppAccountMapper } from "./smpp-account.mapper.js";

describe("SmppAccountMapper", () => {
  const mapper =
    new SmppAccountMapper();

  const account = {
    id: "account-1",
    publicId: "SMPP-001",
    clientId: "client-1",

    systemId: "client-system",

    passwordHash:
      "this-must-never-be-exposed",

    status:
      SmppAccountStatus.ACTIVE,

    maxConcurrentBinds: 5,
    enquireLinkInterval: 30,

    createdAt:
      new Date("2026-08-15T10:00:00.000Z"),

    updatedAt:
      new Date("2026-08-15T10:00:00.000Z"),
  };

  it("should map an SMPP account to a response", () => {
    const result =
      mapper.toResponse(account);

    expect(result).toEqual({
      id: "account-1",
      publicId: "SMPP-001",
      clientId: "client-1",

      systemId: "client-system",

      status:
        SmppAccountStatus.ACTIVE,

      maxConcurrentBinds: 5,
      enquireLinkInterval: 30,

      createdAt:
        account.createdAt,

      updatedAt:
        account.updatedAt,
    });
  });

  it("should never expose the password hash", () => {
    const result =
      mapper.toResponse(account);

    expect(
      result,
    ).not.toHaveProperty(
      "passwordHash",
    );
  });

  it("should map multiple accounts", () => {
    const result =
      mapper.toResponses([
        account,
        {
          ...account,
          id: "account-2",
          publicId: "SMPP-002",
        },
      ]);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(
      "account-1",
    );
    expect(result[1].id).toBe(
      "account-2",
    );
  });

  it("should return an empty array for no accounts", () => {
    expect(
      mapper.toResponses([]),
    ).toEqual([]);
  });
});