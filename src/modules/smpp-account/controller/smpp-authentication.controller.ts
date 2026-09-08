import {
  Body,
  Controller,
  Post,
} from "@nestjs/common";

import {
  ApiBody,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import { Public } from "../../../common/authorization/decorators/public.decorator.js";

import { SmppAccountService } from "../services/smpp-account.service.js";
import { AuthenticateSmppAccountDto } from "./dto/authenticate-smpp-account.dto.js";

@ApiTags("SMPP Authentication")
@Controller("smpp-accounts")
export class SmppAuthenticationController {
  constructor(
    private readonly accounts: SmppAccountService,
  ) { }

  @Post("authenticate")
  @Public()
  @ApiOperation({
    summary: "Authenticate an SMPP account.",
  })
  @ApiBody({
    type: AuthenticateSmppAccountDto,
  })
  async authenticate(
    @Body() dto: AuthenticateSmppAccountDto,
  ) {
    return this.accounts.authenticate(
      dto.systemId,
      dto.password,
      dto.remoteAddress,
    );
  }
}