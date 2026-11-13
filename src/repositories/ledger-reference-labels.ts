import type { Prisma, PrismaClient } from "@prisma/client";

/** Resolve message references in one batch within each ledger entry's client. */
export async function ledgerReferenceLabels<T extends { clientId: string; referenceType: string | null; referenceId: string | null }>(
  db: PrismaClient | Prisma.TransactionClient,
  entries: readonly T[],
): Promise<Array<T & { referenceLabel: string | null }>> {
  const references = entries.filter(entry => entry.referenceType === "MESSAGE" && entry.referenceId);
  const messages = references.length ? await db.message.findMany({
    where: { OR: references.map(entry => ({ id: entry.referenceId!, clientId: entry.clientId })) },
    select: { id: true, clientId: true, publicId: true },
  }) : [];
  const labels = new Map(messages.map(message => [`${message.clientId}:${message.id}`, message.publicId]));
  return entries.map(entry => ({
    ...entry,
    referenceLabel: entry.referenceType === "MESSAGE"
      ? labels.get(`${entry.clientId}:${entry.referenceId}`) ?? (entry.referenceId ? "Message unavailable" : null)
      : entry.referenceId,
  }));
}
