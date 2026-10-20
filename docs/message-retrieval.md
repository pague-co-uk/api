# Message lists and retry history

Both `GET /clients/:clientId/messages` and `GET /messages` accept:

- `createdFrom`: inclusive creation date or timestamp.
- `createdTo`: inclusive calendar date, or exclusive timestamp boundary.
- `page`: positive integer; `pageSize`: integer from 1 to 100.

Date-only values use Africa/Nairobi (UTC+03:00). For example,
`createdFrom=2026-10-19&createdTo=2026-10-19` covers
`2026-10-18T21:00:00Z <= createdAt < 2026-10-19T21:00:00Z`.
Explicit timestamp values must include their timezone. Reversed ranges are rejected.
Existing `submittedFrom` and `submittedTo` filters retain their original behavior.
Lists now use stable `createdAt DESC, id DESC` ordering. The canonical database
package includes indexes for platform and client-scoped created-date retrieval.

Pagination counts messages, independently of retry count. List responses include
`retryProgress` containing `attemptCount`, `routeSubmissionCount`,
`latestAttemptStatus`, and `scheduledAt`. Counts include scheduled attempts;
a scheduled attempt is not proof that a provider call has already taken place.
Lists fetch only the latest attempt projection and total count, then use one
batched grouping query per nonempty page for per-route counts. Full attempt
histories and status events are returned only by detail retrieval.

Detail responses preserve every attempt's ID and global order and additionally
include `routeSubmissionNumber` (calculated from history) and `scheduledAt`.
A new route begins at submission 1; submission 2 is its first retry. These fields
are not stored retry counters. Failed attempts remain visible even when the
message is still ROUTED and awaiting another submission.

The schema/migrations in this application are synchronized from `sms-gateway-db`.
Release/install the updated canonical package, apply its reviewed migrations,
synchronize assets and regenerate Prisma clients before deploying these queries.
No migration has been applied as part of this change.

Focused verification:

```sh
npm run build
npm test -- --runInBand src/modules/messages/message-retrieval.spec.ts
```

## Manual retry

`POST /clients/:clientId/messages/:id/retry` requires `messages.create` and returns
202 after scheduling. Only a `FAILED` message in the requested client scope is
eligible; other statuses or an active/uncertain latest attempt return 409. A
missing message in that client scope returns 404.

The API locks the message and atomically changes it to QUEUED, appends a
`manual-retry` status event, and inserts an outbox event for `sms.queued`. It does
not create another message, charge message creation again, or delete attempt
history. Concurrent requests while the retry is queued cannot enqueue it twice.
The previous attempt ID in the audit event marks the beginning of the new routing
cycle; routing counts subsequent attempts to apply a fresh automatic retry budget.
Deploy the updated routing-service together with this endpoint.
