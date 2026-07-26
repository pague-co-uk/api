import { SecurityConfig } from "./security-config.interface.js";

export interface AuthenticationConfig {
  readonly jwtSecret: string;

  readonly accessTokenTtl: string;

  readonly refreshTokenTtl: string;

  readonly maxFailedLoginAttempts: number;

  readonly accountLockDurationMinutes: number;

  readonly security: SecurityConfig;
}