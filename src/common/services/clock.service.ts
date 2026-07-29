import { Injectable } from "@nestjs/common";

@Injectable()
export class ClockService {
  /**
   * Returns the current UTC timestamp.
   */
  now(): Date {
    return new Date();
  }

  /**
   * Returns the current time in milliseconds since the Unix epoch.
   */
  nowMs(): number {
    return Date.now();
  }

  /**
   * Returns the current time in seconds since the Unix epoch.
   */
  nowSeconds(): number {
    return Math.floor(Date.now() / 1000);
  }

  /**
   * Returns whether the supplied date is in the past.
   */
  isPast(date: Date): boolean {
    return date.getTime() <= Date.now();
  }

  /**
   * Returns whether the supplied date is in the future.
   */
  isFuture(date: Date): boolean {
    return date.getTime() > Date.now();
  }

  /**
   * Returns the later of two dates.
   */
  max(a: Date, b: Date): Date {
    return a.getTime() >= b.getTime() ? a : b;
  }

  /**
   * Returns the earlier of two dates.
   */
  min(a: Date, b: Date): Date {
    return a.getTime() <= b.getTime() ? a : b;
  }
}