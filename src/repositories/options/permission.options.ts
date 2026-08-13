import type { PageRequest } from '../../common/query/page-request.interface.js';

export interface PermissionQueryOptions extends PageRequest {
  readonly search?: string;
  readonly module?: string;
}
