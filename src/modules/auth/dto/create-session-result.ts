import type { PortalSession } from "@prisma/client";

export interface CreateSessionResult {
  token: string;

  session: PortalSession;
}