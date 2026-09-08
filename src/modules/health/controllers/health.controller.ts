import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
} from "@nestjs/common";

import {
  Authorize,
} from "../../../common/authorization/decorators/authorize.decorator.js";

import {
  Permissions,
} from "../../../common/authorization/permissions/permissions.registry.js";

import {
  HealthService,
} from "../services/health.service.js";

// ============================================================================
// Health Controller
// ============================================================================

@Controller("health")
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
  ) { }

  // ==========================================================================
  // Application health
  // ==========================================================================

  @Get()
  @Authorize(Permissions.CHECK_HEALTH)
  public async check() {
    const response =
      await this.healthService.check();

    if (
      response.status ===
      "degraded"
    ) {
      throw new HttpException(
        response,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return response;
  }

  // ==========================================================================
  // Platform health
  // ==========================================================================

  @Get("platform")
  @Authorize(Permissions.CHECK_HEALTH)
  public async platformCheck() {
    return this.healthService.platformCheck();
  }
}