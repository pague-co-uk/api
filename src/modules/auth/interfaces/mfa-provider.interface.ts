export interface MfaProvider {
  /**
   * Generates a new MFA secret.
   */
  generateSecret(): Promise<string>;

  /**
   * Verifies a one-time code.
   */
  verify(
    secret: string,
    code: string,
  ): Promise<boolean>;
}