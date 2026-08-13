import { ApiProperty } from "@nestjs/swagger";

import { UserSummaryResponseDto } from "../../../modules/users/dto/user-summary.dto.js";
import { RoleResponseDto } from "../../auth/controllers/responses/role.response.dto.js";

export class UserResponseDto extends UserSummaryResponseDto {
  @ApiProperty({
    description: "Roles assigned to the user.",
    type: () => RoleResponseDto,
    isArray: true,
  })
  readonly roles!: readonly RoleResponseDto[];
}