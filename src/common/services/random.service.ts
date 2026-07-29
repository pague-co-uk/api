import {
  randomBytes,
  randomInt,
  randomUUID,
} from "node:crypto";

import { Injectable } from "@nestjs/common";

@Injectable()
export class RandomGenerator {
  bytes(length: number): Buffer {
    this.validateLength(length);

    return randomBytes(length);
  }

  hex(length: number): string {
    return this.bytes(length).toString("hex");
  }

  base64Url(length: number): string {
    return this.bytes(length).toString("base64url");
  }

  token(length: number): string {
    return this.base64Url(length);
  }

  integer(
    min: number,
    max: number,
  ): number {
    this.validateRange(
      min,
      max,
    );

    return randomInt(
      min,
      max,
    );
  }

  uuid(): string {
    return randomUUID();
  }

  private validateLength(length: number): void {
    if (!Number.isInteger(length)) {
      throw new TypeError(
        "Length must be an integer.",
      );
    }

    if (length <= 0) {
      throw new RangeError(
        "Length must be greater than zero.",
      );
    }
  }

  private validateRange(
    min: number,
    max: number,
  ): void {
    if (
      !Number.isInteger(min) ||
      !Number.isInteger(max)
    ) {
      throw new TypeError(
        "Minimum and maximum values must be integers.",
      );
    }

    if (min < 0) {
      throw new RangeError(
        "Minimum value must be greater than or equal to zero.",
      );
    }

    if (max <= min) {
      throw new RangeError(
        "Maximum value must be greater than minimum value.",
      );
    }
  }
}