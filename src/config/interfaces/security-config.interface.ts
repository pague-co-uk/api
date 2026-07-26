export interface SecurityConfig {
  password: {
    memoryCost: number;
    timeCost: number;
    parallelism: number;
  };

  secretHashKey: string;

  verification: {
    codeLength: number;
    expiryMinutes: number;
    maxAttempts: number;
  };

  session: {
    idleTimeoutMinutes: number;
    absoluteTimeoutDays: number;
    refreshTokenTtlDays: number;
  };
}