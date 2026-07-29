import { PermissionResponseDto } from "./permission.response.dto.js";

export class RoleResponseDto {
  readonly id!: string;

  readonly name!: string;

  readonly description!: string | null;

  readonly permissions!: readonly PermissionResponseDto[];
}