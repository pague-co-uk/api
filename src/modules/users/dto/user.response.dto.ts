import { ApiProperty } from "@nestjs/swagger";

import { RoleResponseDto } from "../../auth/controllers/responses/role.response.dto.js";
import { UserSummaryResponseDto } from "./user-summary.dto.js";

export class UserResponseDto extends UserSummaryResponseDto {
  @ApiProperty({
    description: "Roles assigned to the user.",
    type: () => RoleResponseDto,
    isArray: true,
  })
  readonly roles!: readonly RoleResponseDto[];
}