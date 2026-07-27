import { Injectable } from "@nestjs/common";
import * as argon2 from "argon2";

import { AppConfigService } from "../../../config/config.service.js";

@Injectable()
export class PasswordService {
  constructor(
    private readonly config: AppConfigService,
  ) { }

  hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: this.config.auth.security.password.memoryCost,
      timeCost: this.config.auth.security.password.timeCost,
      parallelism: this.config.auth.security.password.parallelism,
    });
  }

  verify(
    hash: string,
    password: string,
  ): Promise<boolean> {
    return argon2.verify(hash, password);
  }

  needsRehash(hash: string): boolean {
    return argon2.needsRehash(hash, {
      memoryCost: this.config.auth.security.password.memoryCost,
      timeCost: this.config.auth.security.password.timeCost,
      parallelism: this.config.auth.security.password.parallelism,
    });
  }
}