import { Injectable } from "@nestjs/common";


import {
  UserMapper,
  UserWithRolesEntity,
} from "../../users/user.mapper.js";
import { VerifyMfaResponseDto } from "../controllers/responses/index.js";
import { LoginResponseDto } from "../controllers/responses/login.response.dto.js";
import { RefreshTokenResponseDto } from "../controllers/responses/refresh-token.response.dto.js";

@Injectable()
export class AuthenticationMapper {
  constructor(
    private readonly userMapper: UserMapper,
  ) { }

  toLoginResponse(
    user: UserWithRolesEntity,
    requiresMfa: boolean,
  ): LoginResponseDto {
    return {
      user: this.userMapper.toResponse(user),
      requiresMfa,
    };
  }

  toRefreshTokenResponse(
    user: UserWithRolesEntity,
  ): RefreshTokenResponseDto {
    return {
      user: this.userMapper.toResponse(user),
    };
  }

  toVerifyMfaResponse(
    user: UserWithRolesEntity,
  ): VerifyMfaResponseDto {
    return {
      user: this.userMapper.toResponse(user),
    };
  }
}
