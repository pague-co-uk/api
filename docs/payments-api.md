# Pague Payments API

This guide describes the implementation in this repository, updated on 13 November 2026 for normalized account fields. It covers the client integration API first, followed by the separate transaction administration and provider endpoints.

## Base URL and authentication

Use the API hostname supplied for your environment. The default API prefix is `/api`; there is no automatic `/v1` segment on these controllers. `API_PREFIX` can change the prefix.

```text
https://<api-host>/api
```

Authenticate integrations using a client API key:

```http
Authorization: Bearer <API_KEY>
Content-Type: application/json
Accept: application/json
```

The key needs these capabilities:

| Operation | Capability |
| --- | --- |
| Create a payment | `payments.create` |
| Read payment status | `payments.read` |

The API also accepts authenticated browser sessions. The payment client is resolved from the API key's client, or from the session user's client. Do not supply `clientId` in the payment body; these endpoints do not accept an override to charge another client's service.

Before integrating, obtain your assigned **service code**, allowed **currency codes**, allowed **transaction type codes**, required `data` fields, and amount limits. These depend on the client's service configuration. The Airtel example below uses the service/type codes verified in the local database on 13 November 2026. Your authenticated client must have that service assigned and active. Other examples use illustrative codes.

## Local Airtel quick start

The local API base URL is `http://localhost:9000/api`. HTTPS should be used for remote deployments. Running locally does not automatically select an Airtel sandbox: the configured provider determines whether a request can charge a real account.

The verified Airtel service uses `serviceCode: AIRTEL_MONEY_MW`, `transactionType: COLLECTIONS` (plural), and `currency: MWK`. The inspected assignment allows MWK 2.00–1,000,000.00. These are service configuration values, not universal API limits.

Use the creation example below with a newly generated key belonging to your assigned client. Keep the key in an environment variable; no actual credentials are included in these documents. Generate a unique reference for each intentional new payment. Do not create a new reference to retry a request whose outcome is uncertain.

The payment account migration has been applied to the local database. Other environments require the schema expansion before the updated API/processor is started. See [rollout and migration status](payment-normalization-rollout.md).

## Endpoint summary

| Method | Endpoint | Purpose | Success status |
| --- | --- | --- | --- |
| POST | `/payments` | Create and queue a payment | `201 Created` |
| GET | `/payments/{paymentReference}` | Read the current status | `200 OK` |

Paths in this table are relative to the base URL, including its `/api` prefix.

## Create a payment

```http
POST /api/payments
```

### Request fields

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `serviceCode` | string | Yes | Assigned payment service code; nonempty, maximum 50 characters. |
| `reference` | string | Yes | Your reference; trimmed, nonempty, maximum 100 characters; unique within your client. |
| `accountNumber` | string | Yes* | Account being charged or credited; maximum 100 characters. For mobile money this is the payer/recipient MSISDN. |
| `country` | string | Yes* | ISO two-letter country of that account, for example `MW`. |
| `currency` | string | Yes | Currency code; nonempty, maximum 36 characters; active and allowed for the service. |
| `amount` | string | Yes | Positive decimal, up to four fractional digits; must satisfy configured limits. |
| `transactionType` | string | Yes | Transaction type code; nonempty, maximum 50 characters; active and allowed for the service. |
| `description` | string | No | Maximum 255 characters. |
| `data` | JSON object | No | Additional service-specific fields; omission becomes `{}`. Required configured fields still apply. |

`serviceCode`, `currency`, and `transactionType` are trimmed and normalized to uppercase. The reference is trimmed before uniqueness checks and storage. Account country is trimmed and uppercased. Mobile services store the account as E.164, for example `+265991234567`; bank/identifier account strings retain leading zeros.

Send amounts as strings, for example `"1500"`, `"1500.50"`, or `"1500.1234"`. Zero, negative values, leading zeros such as `"01500"`, commas, exponent notation and more than four decimal places are rejected. The API enforces at most 15 integer digits to match `Decimal(19,4)` storage.

Unknown top-level fields are rejected. `data` is extensible: configured required fields must exist and must not be null or blank strings. Version 2 service configuration can validate field types, allowed values and string lengths before queuing. Provider adapters can still apply provider-specific checks during processing.

*During transition, common fields may also be derived from legacy `data` aliases: `msisdn`, `payerMsisdn`, `recipientAccountNumber`, `country`, `countryCode` and `recipientCountryCode`. A generic/bank account may also use legacy `data.accountNumber`. Conflicting aliases are rejected. A mobile service treats `data.accountNumber` as a separate billing account and renames it to `data.billingAccountNumber`. The sender country is never used as the account country. New integrations must supply the common fields at the top level.

### Example: Airtel Money Malawi collection

For a mobile-money service, supply the MSISDN as `accountNumber` and the account country as `country`. Local and international number forms are normalized and checked against the supplied country. Airtel receives the national subscriber number; common fields do not need to be repeated inside `data`.

```bash
export PAYMENTS_BASE_URL='http://localhost:9000/api'
export PAYMENTS_API_KEY='<API_KEY>'

curl --request POST "$PAYMENTS_BASE_URL/payments" \
  --header "Authorization: Bearer $PAYMENTS_API_KEY" \
  --header 'Content-Type: application/json' \
  --header 'Accept: application/json' \
  --data '{
    "serviceCode": "AIRTEL_MONEY_MW",
    "reference": "ORDER-2026-000001",
    "accountNumber": "0991234567",
    "country": "MW",
    "currency": "MWK",
    "amount": "100.00",
    "transactionType": "COLLECTIONS",
    "description": "Payment for order ORDER-2026-000001",
    "data": {}
  }'
```

This example requests a **MWK 100 payment** against the supplied account if it reaches a live provider. Replace the illustrative phone number with an account you are authorized to test. A missing `data` property is also accepted for this Airtel configuration.

### Response

```json
{
  "success": true,
  "data": {
    "id": "PAYMENT_PUBLIC_REFERENCE",
    "status": "PENDING"
  },
  "meta": {
    "requestId": "43834df0-892d-4c54-9478-be4167b0569a",
    "timestamp": "2026-11-13T08:49:27.916Z"
  }
}
```

Save both your `reference` and the returned `data.id`. For creation, `data.id` is the payment's **public reference**, not its database UUID.

A `201` response means the transaction and its processing event were committed atomically. It does not mean the customer has paid. A separate processor submits the payment to the configured provider and updates the transaction.

## Configure a client payment service

Payment-service configuration is required when assigning a service to a client; `{}` is insufficient. In the portal, select **Insert payment template** and review the currencies, transaction types and limits before saving.

For the verified Airtel Money Malawi service, use:

```json
{
  "version": 2,
  "accountType": "mobile",
  "requiredFields": [],
  "countries": ["MW"],
  "dataFields": {},
  "validation": {
    "limits": {
      "minimumAmount": "2.00",
      "maximumAmount": "1000000.00"
    },
    "currencies": ["MWK"],
    "transactionTypes": ["COLLECTIONS"]
  }
}
```

This is **service configuration**, not the payment request body. `requiredFields: []` means no additional legacy metadata inputs are required; `accountNumber` and `country` are still required payment inputs. Version 2 permits omitting `requiredFields`; including the empty array is compatible with the existing assignment form/template.

For other services, set `accountType` to `mobile`, `bank` or `identifier`. A collection's common account is the payer; a payout's common account is the recipient. `country` belongs to that account. Sender-country information for cross-border payouts remains distinct in `data.senderCountryCode`.

`dataFields` can declare a field's `type` (`string`, `number`, `boolean`, `object`), `required`, scalar `enum`, and string `minLength`/`maxLength`. For example, a bank service might require `data.bankCode`. Unspecified extra `data` keys are not rejected by the schema validator. Required provider-specific inputs must still be configured for the selected service.

## Get payment status

```http
GET /api/payments/{paymentReference}
```

`paymentReference` must be the public reference returned by payment creation. The lookup is scoped to the authenticated client.

```bash
PAYMENT_REFERENCE='PAYMENT_PUBLIC_REFERENCE'

curl "$PAYMENTS_BASE_URL/payments/$PAYMENT_REFERENCE" \
  --header "Authorization: Bearer $PAYMENTS_API_KEY" \
  --header 'Accept: application/json'
```

Example response:

```json
{
  "success": true,
  "data": {
    "id": "PAYMENT_PUBLIC_REFERENCE",
    "status": "SUCCESS"
  },
  "meta": {
    "requestId": "43834df0-892d-4c54-9478-be4167b0569a",
    "timestamp": "2026-11-13T08:50:00.000Z"
  }
}
```

Creation and status retrieval both return the same public payment reference in `data.id`. Internal database IDs are not returned by these two payment endpoints.

### Status values

| Status | Meaning |
| --- | --- |
| `PENDING` | Created and awaiting processing. |
| `PROCESSING` | Processing is underway; a final outcome is not yet available. |
| `SUCCESS` | Recorded as successful. |
| `FAILED` | Recorded as failed. |
| `REVERSED` | Recorded as reversed. |
| `CANCELLED` | Recorded as cancelled. |

For a polling integration, keep checking while the state is `PENDING` or `PROCESSING`; stop the immediate polling loop on another state and apply your reconciliation rules. These enum values do not guarantee that a successful payment can never later be reversed. The repository does not define a client polling interval; choose an interval and timeout agreed with the API operator.

## References, retries and duplicate requests

References are unique per client. A duplicate POST is rejected; it does **not** return the original transaction as an idempotent replay. No `Idempotency-Key` handling is implemented by these payment endpoints.

If creation times out after being sent, its result may be uncertain. Do not automatically submit a new payment with a new reference, because the original may have committed. Reconcile using the saved public reference when available, or have an operator locate the original transaction by your client reference. The client payment API currently has no reference-search/list endpoint.

## Errors

Errors use this envelope:

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "API key does not have the required capability.",
    "details": [],
    "path": "/api/payments"
  },
  "meta": {
    "requestId": "43834df0-892d-4c54-9478-be4167b0569a",
    "timestamp": "2026-11-13T08:49:27.916Z"
  }
}
```

| HTTP status | Current behavior |
| --- | --- |
| `400` | Invalid/missing common fields, conflicting aliases, invalid service data or amount, inactive/unassigned services, and DTO validation; `BAD_REQUEST`. |
| `401` | Missing/invalid authentication or unavailable client context. |
| `403` | Missing permission or API-key capability. |
| `404` | Payment reference unavailable to the authenticated client. |
| `409` | Duplicate client reference. Service prechecks return `CONFLICT`; database races may return `DUPLICATE_RESOURCE`. |
| `500` | Unexpected errors; may also be `DATABASE_ERROR` for other Prisma errors. |

Payment validation errors now return HTTP 400; a missing payment returns 404; duplicate-reference prechecks return 409. Unexpected failures still return 500.

Provide `meta.requestId`, your reference, the public payment reference if known, and the approximate request time when reporting a failed request. Never include your API key in support logs.

### Missing account columns (`P2022`)

If server logs report that `transactions.accountNumber` or `transactions.country` does not exist, the API and database schema are out of sync. Apply the reviewed payment migration through the deployment process; changing the request body will not fix this error.

The local `sms_gateway` database now has both nullable columns and the payment migration is recorded as applied. Its older canonical migration history still needs baseline review: do not run a blanket migration deployment there to address this error. See [deployment instructions](payment-normalization-rollout.md).

A generic HTTP 500 does not prove whether a payment committed. Check the server log and the saved reference before resubmitting.

## Other provider data

The `data` object varies by service. The Lipad direct-charge adapter currently reads the following fields; these are not fields required by every payment service:

- Nonempty strings: `clientCode`, `originChannelCode`, `originatorMsisdn`, `payerEmail`, `billingAccountNumber`, `invoiceNumber`, `transactionCharge`, `paymentMethodCode`, `callbackUrl`.
- Booleans: `addTransactionCharge`, `notifyClient`, `notifyOriginator`.
- Optional object: `extraData`.

The payer MSISDN and country come from the common fields. `billingAccountNumber` identifies a separate biller/merchant account and must not be confused with the payer MSISDN. Legacy queued requests using `data.accountNumber` still work.

`callbackUrl` in that adapter is a provider callback configuration input; do not assume it enables a universal client payment webhook. Obtain the correct URL and complete field requirements from the API operator.

## Transaction administration API

These endpoints are separate from the two client payment endpoints. They use an authenticated **user session** in the current controller/service implementation, plus `payments.read`; do not assume API-key support simply because the authentication guard accepts keys.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/transactions` | List detailed transaction records. |
| GET | `/api/transactions/{id}` | Get a detailed record using its internal transaction ID. |

List query fields: `page` (default 1), `pageSize` (default 20, maximum 100), `search`, `status`, `clientId`, `clientServiceId`, `providerId`, `providerServiceId`, `currencyId`, `transactionTypeId`, `sort`.

The current service resolves client scope from the authenticated user's client and the configured platform client; the DTO's `clientId` is not forwarded as a requested client filter. Treat scope as server-controlled. Sort accepts comma-separated fields, with `-` for descending, for example `-createdAt,reference`. Allowed fields: `publicId`, `reference`, `amount`, `status`, `processedAt`, `createdAt`, `updatedAt`. Default: `-createdAt`.

Detailed records include names and codes for the client, service, provider, currency and transaction type, plus `publicId`, `accountNumber`, `country`, `reference`, `providerReference`, `amount`, `status`, `description`, `metadata`, `providerResponse` and timestamps. They also contain internal IDs for administration. Historical transactions can have null `accountNumber` and `country`; those values must not be invented from an unrelated billing account or sender country.

The list service returns an object containing `data` and `pagination`. Because this object is not a `PaginatedResponse` instance, the global response interceptor wraps it, giving this nesting:

```json
{
  "success": true,
  "data": {
    "data": [],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "totalItems": 0,
      "totalPages": 0,
      "hasNext": false,
      "hasPrevious": false
    }
  },
  "meta": {
    "requestId": "example-request-id",
    "timestamp": "2026-11-13T08:50:00.000Z"
  }
}
```

## Separate payment-processor endpoints

The following routes belong to the **payment-processor service**, not the API service above. Their deployment address, exposure and authentication must be confirmed separately; do not send your API-service credentials to an arbitrary processor URL or infer the `/api` prefix.

| Method | Processor controller route | Intended caller |
| --- | --- | --- |
| POST | `/payments/direct-charge/verify-otp` | Lipad direct-charge OTP flow, when provisioned. |
| POST | `/payments/callback` | Lipad provider callback. |
| POST | `/payments/callback/airtelmw` | Airtel Money Malawi provider callback. |

OTP request body: `{"publicId":"PAYMENT_PUBLIC_REFERENCE","otp":"123456"}`. Both values must be nonempty strings; maximum lengths are 100 and 20 respectively. The provider response type has `status` and optional `status_description`. Confirm the processor's response envelope and access configuration before integration.

Provider callbacks are inbound provider integrations. The client Payments API does not currently expose a generic callback-subscription endpoint, refund endpoint, cancellation endpoint or payment-list endpoint.

## Source references

- [Payment controller](../src/modules/payments/controllers/payments.controller.ts)
- [Payment normalization and alias handling](../src/modules/payments/normalize-payment.ts)
- [Service configuration validation](../src/modules/payments/configuration/payment-service-configuration.validator.ts)
- [Rollout and testing instructions](payment-normalization-rollout.md)
- [Create-payment DTO](../src/modules/payments/dto/create-payment.dto.ts)
- [Payment service and validation](../src/modules/payments/services/payments.service.ts)
- [Payment repository and reference lookup](../src/modules/payments/repositories/payments.repository.ts)
- [API authentication guard](../src/common/authorization/guards/authentication.guard.ts)
- [Response interceptor](../src/common/interceptors/response.interceptor.ts)
- [Global error filter](../src/filters/global-exception.filter.ts)
- [Transaction controller](../src/modules/transactions/controllers/transactions.controller.ts)
- [OpenAPI specification](payments-openapi.json)

## Lipad Standard Checkout

Provider code: `LIPAD_STANDARD_CHECKOUT`. It creates a hosted checkout session through Lipad, then verifies settlement through authenticated status enquiries after callbacks and during background reconciliation. Checkout status codes, paths, expiry defaults and polling policy are configured in the **payment processor's `.env`**. See the [configuration and implementation audit](lipad-standard-checkout.md) and [environment example](../../payment-processor/.env.example).

Use the same `POST /api/payments` endpoint and client API-key authentication as other providers. The public service code must be assigned to your client and routed to this provider. `LIPAD_STANDARD_CHECKOUT`, KE/KES and COLLECTIONS below are provisioning examples. Lipad's merchant account, provider service code, callback URL and credentials are server configured.

| Request field | Checkout meaning |
| --- | --- |
| `accountNumber` | Payer mobile number matching `country`, normalized by the API |
| `amount` | Positive whole-unit amount as a string; this provider performs no rounding or minor-unit conversion |
| `data.payerName` | Required full name, maximum 100 characters |
| `data.payerEmail` | Required valid email, maximum 100 characters |
| `data.redirectUrl` | Required HTTPS merchant return URL, maximum 500 characters |
| `data.expiresIn` | Optional integer minutes; defaults and maximum are environment configured |
| `description` | Optional narration; omission uses the configured default |

```bash
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
      "redirectUrl": "https://your-merchant.example/payment-return",
      "expiresIn": 60
    }
  }'
```

Creation returns **201/PENDING**, not an immediate hosted URL or payment confirmation. Poll the read endpoint using its `data.id`:

```bash
curl 'http://localhost:9000/api/payments/<PUBLIC_PAYMENT_REFERENCE>' \
  --header "Authorization: Bearer $PAYMENTS_API_KEY"
```

Once the worker creates the session, the response includes:

```json
{
  "id": "PUBLIC_PAYMENT_REFERENCE",
  "status": "PROCESSING",
  "checkout": {
    "merchantTransactionId": "PUBLIC_PAYMENT_REFERENCE",
    "checkoutReference": "LIPAD_CHECKOUT_REFERENCE",
    "redirectUrl": "https://sandbox.pay.lipad.io/checkout/LIPAD_CHECKOUT_REFERENCE",
    "expiresAt": "2026-11-13T15:00:00.000Z"
  }
}
```

This object is inside the normal `success/data/meta` envelope. Redirect the customer to `checkout.redirectUrl`. Returning to the merchant URL does not confirm payment; wait for the verified transaction status. The dedicated provider callback is `POST /payments/callback/lipad-checkout` on the payment processor, publicly exposed over HTTPS. Clients do not call it to mark payments paid. Callback claims are verified with Lipad before any outcome is persisted.

A new intentional checkout needs a unique client reference. For an uncertain result, query the original payment instead of creating another checkout. Use Lipad-approved sandbox payer details and a real merchant return URL when testing.
