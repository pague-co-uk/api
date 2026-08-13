
import { HttpStatus } from "@nestjs/common";

import { DomainException } from "../domain.exception.js";

export class PermissionNotFoundException extends DomainException {
  readonly code = "PERMISSION_NOT_FOUND";

  readonly status = HttpStatus.NOT_FOUND;

  constructor(
    permissionId: string,
  ) {
    super(
      `Permission '${permissionId}' was not found.`,
      [
        {
          permissionId,
        },
      ],
    );
  }
}

export class PermissionsNotFoundException extends DomainException {
  readonly code = "PERMISSIONS_NOT_FOUND";

  readonly status = HttpStatus.NOT_FOUND;

  constructor(
    permissionIds: readonly string[],
  ) {
    super(
      `The following permissions were not found: ${permissionIds.join(", ")}.`,
      permissionIds.map((permissionId) => ({
        permissionId,
      })),
    );
  }
}