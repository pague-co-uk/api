import {
  SetMetadata,
} from "@nestjs/common";

import {
  PUBLIC_METADATA,
} from "../constants/authorization.constants.js";

export function Public():
  MethodDecorator &
  ClassDecorator {
  return SetMetadata(
    PUBLIC_METADATA,
    true,
  );
}