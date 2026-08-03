import { Injectable } from "@nestjs/common";
import { ConfigService as NestConfigService } from "@nestjs/config";

@Injectable()
export class ConfigService {
  constructor(
    private readonly configService: NestConfigService,
  ) { }

  public get<T>(key: string): T {
    const value = this.configService.get<T>(key);

    if (value === undefined) {
      throw new Error(`Missing configuration value: ${key}`);
    }

    return value;
  }

  public getOptional<T>(key: string): T | undefined {
    return this.configService.get<T>(key);
  }
}