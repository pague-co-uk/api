import {
  createParamDecorator,
  ExecutionContext,
} from "@nestjs/common";

import type { AuthenticatedRequest } from "../interfaces/authenticated-request.interface.js";

export const CurrentAuthentication =
  createParamDecorator(
    (
      _data: unknown,
      context: ExecutionContext,
    ) => {
      const request =
        context
          .switchToHttp()
          .getRequest<AuthenticatedRequest>();

      return request.auth;
    },
  );