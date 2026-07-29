import { RoleResponseDto } from "./role.response.dto.js";

export class UserResponseDto {
  readonly id!: string;

  readonly username!: string;

  readonly email!: string;

  readonly firstName!: string;

  readonly lastName!: string;

  readonly active!: boolean;

  readonly locked!: boolean;

  readonly mfaEnabled!: boolean;

  readonly roles!: readonly RoleResponseDto[];
}