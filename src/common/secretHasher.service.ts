import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import { Injectable } from "@nestjs/common";

import { AppConfigService } from "../../../config/config.service.js";

@Injectable()
export class SecretHasher {
  private static readonly ALGORITHM = "sha256";

  constructor(
    private readonly config: AppConfigService,
  ) { }

  hash(secret: string): string {
    return createHmac(
      SecretHasher.ALGORITHM,
      this.secretKey,
    )
      .update(secret, "utf8")
      .digest("hex");
  }

  verify(
    secret: string,
    expectedHash: string,
  ): boolean {
    const actualHash = this.hash(secret);

    const actual = Buffer.from(
      actualHash,
      "hex",
    );

    const expected = Buffer.from(
      expectedHash,
      "hex",
    );

    if (actual.length !== expected.length) {
      return false;
    }

    return timingSafeEqual(
      actual,
      expected,
    );
  }

  private get secretKey(): string {
    return this.config.security.secretHashKey;
  }
}