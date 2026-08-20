import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  Length,
} from "class-validator";

export class UpdateWebhookDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsUrl({
    require_protocol: true,
  })
  @Length(1, 2048)
  url?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}