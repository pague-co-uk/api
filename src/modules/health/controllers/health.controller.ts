import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
} from "@nestjs/common";

import { HealthService } from "../services/health.service.js";

@Controller("health")
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
  ) {}

  @Get()
  public async check() {
    const response =
      await this.healthService.check();

    if (response.status === "degraded") {
      throw new HttpException(
        response,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return response;
  }
}