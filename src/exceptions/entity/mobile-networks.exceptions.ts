import { HttpStatus } from "@nestjs/common";

import { DomainException } from "../domain.exception.js";

export class MobileNetworkNotFoundException extends DomainException {
  readonly code = "MOBILE_NETWORK_NOT_FOUND";

  readonly status = HttpStatus.NOT_FOUND;

  constructor(networkId: string) {
    super(`Mobile network '${networkId}' not found.`, [
      { networkId },
    ]);
  }
}

export class MobileNetworkAlreadyExistsException extends DomainException {
  readonly code = "MOBILE_NETWORK_ALREADY_EXISTS";

  readonly status = HttpStatus.CONFLICT;

  constructor(value: string) {
    super(`Mobile network '${value}' already exists.`, [
      { value },
    ]);
  }
}

export class MobileNetworkPrefixNotFoundException extends DomainException {
  readonly code = "MOBILE_NETWORK_PREFIX_NOT_FOUND";

  readonly status = HttpStatus.NOT_FOUND;

  constructor(prefixId: string) {
    super(`Mobile network prefix '${prefixId}' not found.`, [
      { prefixId },
    ]);
  }
}

export class MobileNetworkPrefixAlreadyExistsException extends DomainException {
  readonly code = "MOBILE_NETWORK_PREFIX_ALREADY_EXISTS";

  readonly status = HttpStatus.CONFLICT;

  constructor(countryCode: string, prefix: string) {
    super(`Mobile network prefix '${prefix}' for country '${countryCode}' already exists.`, [
      { countryCode, prefix },
    ]);
  }
}
