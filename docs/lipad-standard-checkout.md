# Lipad Standard Checkout implementation and audit

Implemented 13 November 2026 against the Standard Checkout specification supplied in this conversation. No real checkout or payment was initiated during implementation; gateway behaviour still requires a sandbox integration test.

## Files to audit

- [Provider: mapping, initiation, verified settlement and polling](../../payment-processor/src/payments/providers/implementations/lipad/checkout/lipad-standard-checkout.provider.ts)
- [HTTP client: v2 endpoints and authentication](../../payment-processor/src/payments/providers/implementations/lipad/checkout/lipad-checkout.client.ts)
- [Callback controller](../../payment-processor/src/payments/providers/implementations/lipad/checkout/lipad-checkout.controller.ts)
- [Repository: reconciliation selection and concurrency-safe session updates](../../payment-processor/src/payments/repositories/payments.repository.ts)
- [Module registration](../../payment-processor/src/payments/payment-processor.module.ts)
- [API status response](../src/modules/payments/services/payments.service.ts)
- [Processor tests](../../payment-processor/src/payments/providers/implementations/lipad/checkout/lipad-standard-checkout.spec.ts)

Provider code: `LIPAD_STANDARD_CHECKOUT`. Existing direct-charge and payout providers remain separate. No database columns or migration are needed: session and verification evidence are stored in `Transaction.providerResponse`, and the checkout reference in `providerReference`.

## Request and settlement flow

1. Authenticated `POST /api/payments` validates common payment fields, saves the transaction/outbox event and returns HTTP 201 with `data.id` and `PENDING`. This does not indicate payment success.
2. The existing asynchronous payment queue routes the payment to an active provider service whose provider code is `LIPAD_STANDARD_CHECKOUT`.
3. The processor authenticates using the existing Lipad auth service, then posts to `/v2/checkout/initiate` with `x-access-token`. The globally unique public payment reference is used as `merchant_transaction_id`; the caller's reference remains the client-scoped business reference.
4. After validating the response reference, currency, amount and HTTPS redirect URL, the processor stores the session. It remains `PROCESSING`.
5. Read `GET /api/payments/{publicPaymentReference}` until `data.checkout.redirectUrl` is available. Send the customer there to pay. This GET only reads local state; it does not itself call Lipad.
6. Lipad notifies `POST /payments/callback/lipad-checkout` on the **payment processor**, without the API's `/api` prefix. The controller resolves the public merchant reference and verifies the provider assignment. It does not trust the callback's status or amount. It calls authenticated `GET /v2/checkout/status/{publicPaymentReference}` before persisting an outcome. Failed verification returns an error rather than acknowledging a fabricated outcome.
7. Background reconciliation also performs authenticated status enquiries: every 60 seconds by default, up to 100 oldest `PROCESSING` checkout payments untouched for at least 30 seconds. Per-process overlap is prevented; database optimistic locking protects concurrent callbacks/workers. Errors leave payment status unchanged and rotate the row to the back of the polling queue.

Successful callbacks return HTTP 200 and `{ "processed": true }`. Session creation and verification audit records are merged, preserving the hosted URL when callbacks and initiation responses race. Repeated callbacks repeat verification and audit updates without initiating another checkout or applying a second business transition.

## Field mapping

| Platform field | Lipad field | Rule |
| --- | --- | --- |
| Public payment reference | `merchant_transaction_id` | Server-generated, max 64 |
| `amount` | `amount` | Positive safe integer; no rounding or currency-unit conversion |
| `accountNumber` | `payer_msisdn` | Valid normalized mobile number matching `country`; country code retained, leading `+` removed |
| `data.payerName` | `payer_name` | Required, max 100 |
| `data.payerEmail` | `payer_email` | Required valid email, max 100 |
| Provider-service `externalServiceCode` | `service_code` | Server configured, max 32 |
| Provider-service configuration `accountNumber`, otherwise `LIPAD_ACCOUNT_NUMBER` | `account_number` | Merchant billing account, separate from payer; max 50 |
| `data.expiresIn` | `expires_in` | Optional; default and maximum come from `LIPAD_CHECKOUT_DEFAULT_EXPIRY_MINUTES` and `LIPAD_CHECKOUT_MAX_EXPIRY_MINUTES` |
| `description` or `LIPAD_CHECKOUT_DEFAULT_NARRATION` | `narration` | Max 255 |
| Provider-service `checkoutCallbackUrl`, otherwise `LIPAD_CHECKOUT_CALLBACK_URL` | `callback_url` | Server owned, HTTPS, max 500 |
| `data.redirectUrl` | `redirect_url` | Required HTTPS URL without embedded credentials, max 500 |

Caller-supplied callback URLs and merchant account overrides in `data` do not control these server-owned values. Provider initiation responses are checked before a session is exposed. Only the four session fields below are exposed by the status endpoint; raw provider JSON is not returned.

```json
{
  "success": true,
  "data": {
    "id": "PUBLIC_PAYMENT_REFERENCE",
    "status": "PROCESSING",
    "checkout": {
      "merchantTransactionId": "PUBLIC_PAYMENT_REFERENCE",
      "checkoutReference": "LIPAD_CHECKOUT_REFERENCE",
      "redirectUrl": "https://sandbox.pay.lipad.io/checkout/LIPAD_CHECKOUT_REFERENCE",
      "expiresAt": "2026-11-13T15:00:00.000Z"
    }
  }
}
```

The real API envelope also includes `meta`. `checkout` is absent until the session is stored, and for other providers.

## Verified status mapping

Gateway numeric codes are loaded from the processor environment. The values below are the supplied Lipad protocol values recorded in `.env.example`; they are not hard-coded in settlement logic. Platform enum names remain part of the database schema.

| Lipad checkout status | Platform status |
| --- | --- |
| `LIPAD_CHECKOUT_STATUS_COMPLETE` (801) | `SUCCESS`, only with matching reference/currency and unique successful (`LIPAD_CHECKOUT_STATUS_PAYMENT_SUCCESSFUL`, example 700) payment records totalling at least the requested amount; top-level amount must also cover it |
| `LIPAD_CHECKOUT_STATUS_PARTIAL` (802), `LIPAD_CHECKOUT_STATUS_UNPAID` (803), `LIPAD_CHECKOUT_STATUS_JAMMED` (850), `LIPAD_CHECKOUT_STATUS_PENDING` (851) | `PROCESSING` |
| `LIPAD_CHECKOUT_STATUS_EXPIRED` (820) | `FAILED` |
| `LIPAD_CHECKOUT_STATUS_REVERSED` (840), `LIPAD_CHECKOUT_STATUS_REFUNDED` (841) | `REVERSED` |
| Unknown/malformed response, timeout, enquiry error | No status change |

The schema has no `REFUNDED` state; exact 840/841 codes remain in the verification audit record. A successful status cannot regress to processing or failed. Verified reversal can update success; verified late full payment can correct a previously failed checkout. Cancelled/reversed states stay terminal. Settled sessions are no longer background-polled; later reversal/refund reconciliation relies on a callback. Jammed/partial sessions remain pending and may need operator review.

## Configuration before testing

All checkout environment settings are explicit and validated on processor startup. Copy the labelled checkout block from [the processor environment example](../../payment-processor/.env.example) into each deployment's `.env`; no status-code fallback is applied in code. The local `.env` has been supplemented without overwriting existing settings or credentials. Missing codes, duplicate checkout outcome codes, invalid numeric values and an expiry default above the configured maximum reject startup. Changing an environment value requires a processor restart.

The provider identity, platform database enums, HTTPS validation and gateway field-length constraints are schema rules. Active service routing and merchant-specific provider-service settings remain managed by the platform; `accountNumber` and `checkoutCallbackUrl` overrides still take precedence over environment defaults.

| Environment setting | Example | Purpose |
| --- | --- | --- |
| `LIPAD_CHECKOUT_INITIATE_PATH` | `/v2/checkout/initiate` | Relative gateway creation path |
| `LIPAD_CHECKOUT_STATUS_PATH` | `/v2/checkout/status` | Relative enquiry path; merchant reference appended safely |
| `LIPAD_CHECKOUT_DEFAULT_EXPIRY_MINUTES` | 60 | Session lifetime when omitted in `data` |
| `LIPAD_CHECKOUT_MAX_EXPIRY_MINUTES` | 1440 | Maximum allowed requested lifetime |
| `LIPAD_CHECKOUT_DEFAULT_NARRATION` | Payment | Narration when description is omitted |
| `LIPAD_CHECKOUT_POLL_INTERVAL_MS` | 60000 | Reconciliation interval; 0 disables it |
| `LIPAD_CHECKOUT_POLL_MIN_AGE_MS` | 30000 | Minimum age since last database update |
| `LIPAD_CHECKOUT_POLL_BATCH_SIZE` | 100 | Maximum rows queried per cycle (1–1000) |
| `LIPAD_CHECKOUT_UPDATE_RETRIES` | 5 | Optimistic concurrency retry limit (1–20) |

Status settings and meanings are listed above. `LIPAD_CHECKOUT_STATUS_PAYMENT_SUCCESSFUL=700` selects which nested payment records count toward full payment. All checkout outcome codes must be distinct; nested payment codes belong to a separate namespace.


Set these on the **payment processor**, then restart it and the API:

```dotenv
LIPAD_BASE_URL=https://sandbox.api.gateway.lipad.io
LIPAD_CONSUMER_KEY=<sandbox-consumer-key>
LIPAD_CONSUMER_SECRET=<sandbox-consumer-secret>
LIPAD_ACCOUNT_NUMBER=<merchant-billing-account>
LIPAD_CHECKOUT_CALLBACK_URL=https://<public-processor-host>/payments/callback/lipad-checkout
LIPAD_CHECKOUT_POLL_INTERVAL_MS=60000
LIPAD_TIMEOUT_MS=30000
```

Use `LIPAD_CHECKOUT_POLL_INTERVAL_MS=0` to disable polling. Nonzero values must be at least 1000 ms. The callback URL must publicly reach the processor over HTTPS; proxy routing is deployment-specific. Existing `LIPAD_CALLBACK_URL` is for the older integration and does not replace the dedicated checkout setting. Authentication uses the existing `/v1/auth` Lipad credential exchange.

Provision an active payment service (example public service code `LIPAD_STANDARD_CHECKOUT`), an active provider with **provider code** `LIPAD_STANDARD_CHECKOUT`, and an active provider-service route connecting them. Set its `externalServiceCode` to the real Lipad checkout service code assigned to your merchant; `DEMCHE1` from the supplied document is illustrative. Assign the payment service to the API key's client. Codes for currency/transaction type must exist, be active and match your assignment. No credentials, routes or assignments were inserted automatically.

Example **client-service configuration**, assuming KE/KES/COLLECTIONS are provisioned:

```json
{
  "version": 2,
  "accountType": "mobile",
  "countries": ["KE"],
  "requiredFields": [],
  "dataFields": {
    "payerName": { "type": "string", "required": true, "minLength": 1, "maxLength": 100 },
    "payerEmail": { "type": "string", "required": true, "minLength": 1, "maxLength": 100 },
    "redirectUrl": { "type": "string", "required": true, "minLength": 1, "maxLength": 500 },
    "expiresIn": { "type": "number" }
  },
  "validation": {
    "limits": { "minimumAmount": "1", "maximumAmount": "1000000" },
    "currencies": ["KES"],
    "transactionTypes": ["COLLECTIONS"]
  }
}
```

Limits and supported countries/currencies/types are merchant-specific; this configuration is an example, not a verified local assignment. Integer amount, email, expiry range and HTTPS checks additionally run in the provider before initiation.

## Test requests

Use a sandbox key with `payments.create` and `payments.read` belonging to the assigned client. Use Lipad-approved sandbox payer details. Replace the example merchant return URL with yours.

```bash
export PAYMENTS_API_KEY='<your-client-api-key>'

curl --request POST 'http://localhost:9000/api/payments' \
  --header "Authorization: Bearer $PAYMENTS_API_KEY" \
  --header 'Content-Type: application/json' \
  --data '{
    "serviceCode": "LIPAD_STANDARD_CHECKOUT",
    "reference": "CHECKOUT-TEST-000001",
    "accountNumber": "+254712345678",
    "country": "KE",
    "amount": "1000",
    "currency": "KES",
    "transactionType": "COLLECTIONS",
    "description": "Checkout test",
    "data": {
      "payerName": "Jane Doe",
      "payerEmail": "jane@example.com",
      "expiresIn": 60,
      "redirectUrl": "https://your-merchant.example/payment-return"
    }
  }'
```

Copy `data.id` from the 201 response and query:

```bash
curl 'http://localhost:9000/api/payments/<PUBLIC_PAYMENT_REFERENCE>' \
  --header "Authorization: Bearer $PAYMENTS_API_KEY"
```

Wait for `data.checkout.redirectUrl`, open it to complete the sandbox checkout, then query again until the verified outcome appears. A unique client reference is required for each intentional new checkout; retrying a creation with the same reference returns 409. Do not generate a new reference to recover an uncertain payment.

## Recovery limits and verification evidence

No automatic second initiation is sent after a network timeout. Reconciliation uses the original public merchant reference, including processing transactions whose initiation response was lost. If Lipad repeatedly reports not found, the payment stays processing and requires investigation; the existing queue pipeline does not reclaim an already assigned transaction. If the initiation response containing the hosted URL was lost, status verification can recover settlement but the supplied status protocol does not provide a replacement hosted URL. Database sessions, queue/outbox delivery, public callback ingress and sandbox credentials/routing must all be running for end-to-end testing.

Verification completed: processor payment tests (31 passed, including custom status-code/default tests and environment validation), API payment tests (28 passed, including checkout status projection), TypeScript build checks for API and processor. HTTP tests mock Lipad; no claim is made of a live gateway, database-concurrency integration or public callback ingress test.
