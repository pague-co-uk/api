import { SecretHasher } from "src/common/services/secretHasher.service.js";
import { RandomGenerator } from "../../../common/services/random.service.js";

export class SessionToken {
  private static readonly PREFIX = "ps_live_";

  private static readonly SECRET_LENGTH = 32;

  private constructor(
    private readonly value: string,
  ) { }

  static generate(
    random: RandomGenerator,
  ): SessionToken {
    const secret = random.base64Url(
      SessionToken.SECRET_LENGTH,
    );

    return new SessionToken(
      `${SessionToken.PREFIX}${secret}`,
    );
  }

  static parse(
    value: string,
  ): SessionToken {
    if (
      !value.startsWith(
        SessionToken.PREFIX,
      )
    ) {
      throw new Error(
        "Invalid session token.",
      );
    }

    const secret = value.substring(
      SessionToken.PREFIX.length,
    );

    if (secret.length === 0) {
      throw new Error(
        "Invalid session token.",
      );
    }

    return new SessionToken(value);
  }

  hash(
    hasher: SecretHasher,
  ): string {
    return hasher.hash(this.value);
  }

  toString(): string {
    return this.value;
  }
}