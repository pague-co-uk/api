import {
  IsIP,
  IsNotEmpty,
  IsString,
} from "class-validator";

export class AuthenticateSmppAccountDto {
  @IsString()
  @IsNotEmpty()
  systemId!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsIP()
  remoteAddress!: string;
}