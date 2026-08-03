import { Injectable } from "@nestjs/common";


import {
  UserMapper,
  UserWithRoles,
} from "../../../modules/users/mapper/user.mapper.js";
import { VerifyMfaResponseDto } from "../controllers/responses/index.js";
import { LoginResponseDto } from "../controllers/responses/login.response.dto.js";
import { RefreshTokenResponseDto } from "../controllers/responses/refresh-token.response.dto.js";

@Injectable()
export class AuthenticationMapper {
  constructor(
    private readonly userMapper: UserMapper,
  ) { }

  toLoginResponse(
    user: UserWithRoles,
    requiresMfa: boolean,
  ): LoginResponseDto {
    return {
      user: this.userMapper.toResponse(user),
      requiresMfa,
    };
  }

  toRefreshTokenResponse(
    user: UserWithRoles,
  ): RefreshTokenResponseDto {
    return {
      user: this.userMapper.toResponse(user),
    };
  }

  toVerifyMfaResponse(
    user: UserWithRoles,
  ): VerifyMfaResponseDto {
    return {
      user: this.userMapper.toResponse(user),
    };
  }
}
