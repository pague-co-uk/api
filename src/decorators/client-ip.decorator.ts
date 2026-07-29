import {
  createParamDecorator,
  ExecutionContext,
} from "@nestjs/common";
import { Request } from "express";

export const ClientIp = createParamDecorator(
  (
    _data: unknown,
    context: ExecutionContext,
  ): string => {
    const request = context
      .switchToHttp()
      .getRequest<Request>();

    return request.ip ?? "unknown";
  },
);