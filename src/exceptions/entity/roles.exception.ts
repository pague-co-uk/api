import { HttpStatus } from "@nestjs/common";

import { DomainException } from "../domain.exception.js";

export class RoleNotFoundException extends DomainException {
  readonly code = "ROLE_NOT_FOUND";

  readonly status = HttpStatus.NOT_FOUND;

  constructor(
    roleId: string,
  ) {
    super(
      `Role '${roleId}' was not found.`,
      [
        {
          roleId,
        },
      ],
    );
  }
}

export class RolesNotFoundException extends DomainException {
  readonly code = "ROLES_NOT_FOUND";

  readonly status = HttpStatus.NOT_FOUND;

  constructor(
    roleIds: readonly string[],
  ) {
    super(
      `The following roles were not found: ${roleIds.join(", ")}.`,
      roleIds.map((roleId) => ({
        roleId,
      })),
    );
  }
}

export class RoleAlreadyExistsException extends DomainException {
  readonly code = "ROLE_ALREADY_EXISTS";

  readonly status = HttpStatus.CONFLICT;

  constructor(
    roleId: string,
  ) {
    super(
      `Role '${roleId}' already exists.`,
      [
        {
          roleId,
        },
      ],
    );
  }
}


export class RolesAlreadyExistsException extends DomainException {
  readonly code = "ROLES_ALREADY_EXISTS";

  readonly status = HttpStatus.CONFLICT;

  constructor(
    roleIds: readonly string[],
  ) {
    super(
      `The following roles already exist: ${roleIds.join(", ")}.`,
      roleIds.map((roleId) => ({
        roleId,
      })),
    );
  }
}