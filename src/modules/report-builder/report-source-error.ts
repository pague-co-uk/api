import { BadRequestException } from '@nestjs/common';

export function sourceErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return 'UNKNOWN';
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' && /^[A-Z0-9_]{1,64}$/.test(code)
    ? code
    : 'UNKNOWN';
}

export function mysqlConnectionError(error: unknown, stage: string) {
  const code = sourceErrorCode(error);
  const hints: Record<string, string> = {
    ER_ACCESS_DENIED_ERROR:
      'Check the username, password, and MySQL user host grant for the API server’s source IP.',
    ER_DBACCESS_DENIED_ERROR:
      'The reporting account does not have access to the selected database. Check its SELECT grants.',
    ER_BAD_DB_ERROR: 'The configured database does not exist on this server.',
    ER_HOST_NOT_PRIVILEGED:
      'MySQL does not allow connections from the API server’s source IP. Check the user host grant.',
    ECONNREFUSED:
      'The database refused the connection. Check the host, port, and MySQL listener.',
    ETIMEDOUT:
      'The connection timed out. Check routing and firewall access from the API server.',
    PROTOCOL_SEQUENCE_TIMEOUT: 'The database operation exceeded 30 seconds.',
    ENETUNREACH: 'The API server cannot reach the database network.',
    EHOSTUNREACH: 'The API server cannot reach the database host.',
    ENOTFOUND: 'The database hostname could not be resolved.',
    EAI_AGAIN: 'The database hostname could not be resolved. Check DNS.',
    HANDSHAKE_NO_SSL_SUPPORT:
      'TLS is enabled for this connection, but the database server does not support it. Configure server TLS or disable TLS only for an intentionally unencrypted connection.',
    HANDSHAKE_SSL_ERROR:
      'The TLS handshake failed. Check the database TLS configuration and trusted certificate authority.',
    ER_NOT_SUPPORTED_AUTH_MODE:
      'The database authentication plugin is unsupported. Check the database account authentication configuration.',
    ER_UNKNOWN_SYSTEM_VARIABLE:
      'The database server does not support a required session setting.',
    ER_PARSE_ERROR:
      'The database server does not support the required session or read-only transaction syntax.',
  };
  const tlsCodes = new Set([
    'CERT_HAS_EXPIRED',
    'DEPTH_ZERO_SELF_SIGNED_CERT',
    'SELF_SIGNED_CERT_IN_CHAIN',
    'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
    'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
    'ERR_TLS_CERT_ALTNAME_INVALID',
  ]);
  const hint = tlsCodes.has(code)
    ? 'TLS certificate verification failed. Use the certificate’s database hostname and configure a trusted certificate authority; certificate verification remains enabled.'
    : hints[code] ||
      'Check database connectivity, credentials, TLS settings, and server support.';
  // Never include driver messages: they may contain SQL, credentials, or server details.
  return new BadRequestException(
    `MySQL/MariaDB ${stage} failed (${code}). ${hint}`,
  );
}
