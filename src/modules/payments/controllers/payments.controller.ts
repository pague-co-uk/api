import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiOperation } from "@nestjs/swagger";

import { Permissions } from "../../../common/authorization/permissions/permissions.registry.js";

import { Authorize } from "../../../common/authorization/decorators/authorize.decorator.js";
import { type AuthenticatedRequest } from "../../../common/authorization/interfaces/authenticated-request.interface.js";
import { CreatePaymentDto } from "../dto/create-payment.dto.js";
import { PaymentResponseDto } from "../dto/payment-response.dto.js";
import { PaymentsService } from "../services/payments.service.js";

@Controller("payments")
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
  ) { }

  @Post()
  @Authorize(Permissions.PAYMENTS_CREATE)
  @ApiOperation({
    summary: "Create a payment transaction.",
  })
  async create(
    @Req()
    request: AuthenticatedRequest,

    @Body()
    dto: CreatePaymentDto,
  ): Promise<PaymentResponseDto> {
    const clientId =
      this.resolveClientId(request);

    return this.paymentsService.create(
      clientId,
      dto,
    );
  }

  @Get(":id")
  @Authorize(Permissions.PAYMENTS_READ)
  @ApiOperation({
    summary:
      "Retrieve the status of a payment transaction.",
  })
  async getStatus(
    @Req()
    request: AuthenticatedRequest,

    @Param("id")
    id: string,
  ): Promise<PaymentResponseDto> {
    const clientId =
      this.resolveClientId(request);

    return this.paymentsService.getStatus(
      clientId,
      id,
    );
  }

  private resolveClientId(
    request: AuthenticatedRequest,
  ): string {
    if (request.auth.apiKey?.clientId) {
      return request.auth.apiKey.clientId;
    }

    if (request.user?.clientId) {
      return request.user.clientId;
    }

    throw new UnauthorizedException(
      "Client context is unavailable.",
    );
  }
}