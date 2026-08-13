import {
  SetMetadata,
} from "@nestjs/common";

import {
  AUTHORIZE_METADATA,
} from "../constants/authorization.constants.js";

export function Authorize(
  ...permissions: readonly string[]
): MethodDecorator & ClassDecorator {
  return SetMetadata(
    AUTHORIZE_METADATA,
    permissions,
  );
}