import { UserResponseDto } from "./index.js";

export class LoginResponseDto {
  readonly user!: UserResponseDto;

  readonly requiresMfa!: boolean;
}