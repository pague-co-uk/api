# Pague Payments API

Use this API to request a payment and check its status. Payments are processed asynchronously.

## Base URL and authentication

The API endpoint is https://api.pague.co.uk. Use this base URL for payment requests:

```text
https://api.pague.co.uk/api
```

Authenticate integrations using a client API key:

```http
Authorization: Bearer <API_KEY>
Content-Type: application/json
Accept: application/json
```

Keep your API key on your backend and include it with every request. Use the service assigned to your account.

## Services and `data` fields

| Service | `serviceCode` | `country` | `currency` | `transactionType` | Amount range | `data` |
| --- | --- | --- | --- | --- | --- | --- |
| Airtel Money Malawi collection | `AIRTEL_MONEY_MW` | `MW` | `MWK` | `COLLECTIONS` | MWK 2.00–1,000,000.00 | No additional fields. Send `{}` or omit `data`. |

For Airtel Money Malawi, `accountNumber` is the payer's mobile number. Supply it and `country` at the top level of the request; do not repeat them inside `data`.

### Lipad payouts

Use the Lipad payout `serviceCode`, currency, transaction type and amount limits supplied for your account. The top-level `accountNumber` is the recipient's account or mobile number, and `country` is the recipient's country. Put the following additional fields in `data`.

| Field | Type | Required | Value |
| --- | --- | --- | --- |
| `type` | string | Yes | `local` or `international` |
| `destinationType` | string | Yes | `MOBILE` or `BANK` |
| `destinationName` | string | Yes | Destination network or bank name |
| `recipientPhoneNumber` | string | Yes | Recipient's contact phone number |
| `recipientAccountName` | string | Yes | Name on the recipient account |
| `recipientBankCode` | string | For `BANK` | Bank code supplied for the destination |
| `destinationCurrency` | string | Yes | Recipient currency code |
| `exchangeRate` | string | Yes | Agreed exchange rate |
| `recipientAmount` | string | Yes | Amount to be received |
| `senderCountryCode` | string | Yes | Sender's country code |
| `recipientFirstName` | string | For local payouts | Recipient's first name; optional for international payouts |
| `recipientLastName` | string | For local payouts | Recipient's last name; optional for international payouts |
| `callbackUrl` | string | For local payouts | Use the callback URL supplied by Pague; optional for international payouts |

International payouts also use these `data` fields:

| Field | Type | Required | Value |
| --- | --- | --- | --- |
| `senderFirstName` | string | Yes | Sender's first name |
| `senderLastName` | string | Yes | Sender's last name |
| `senderType` | string | Yes | `INDIVIDUAL` or `COMPANY` |
| `recipientType` | string | Yes | `INDIVIDUAL` or `COMPANY` |
| `recipientOccupation` | string | Yes | Recipient's occupation |
| `incomeSource` | string | Yes | Source of funds |
| `fundPurpose` | string | Yes | Purpose of transfer |
| `senderMiddleName`, `senderDocumentType`, `senderDocumentNumber`, `senderPhoneNumber` | string | No | Additional sender details |
| `recipientMiddleName`, `recipientDocumentType`, `recipientDocumentNumber` | string | No | Additional recipient details |

Example `data` for a local mobile payout; replace the destination and amounts with the values agreed for your account:

```json
{
  "type": "local",
  "destinationType": "MOBILE",
  "destinationName": "DESTINATION_NETWORK",
  "recipientFirstName": "Jane",
  "recipientLastName": "Doe",
  "recipientPhoneNumber": "+254712345678",
  "recipientAccountName": "Jane Doe",
  "destinationCurrency": "KES",
  "exchangeRate": "1",
  "recipientAmount": "100",
  "senderCountryCode": "KE",
  "callbackUrl": "https://<callback-host>/<pague-supplied-path>"
}
```

### Lipad direct charge

Use the direct-charge service code supplied for your account. The top-level `accountNumber` and `country` identify the payer. Supply these fields in `data`:

| Field | Type | Required | Value |
| --- | --- | --- | --- |
| `clientCode` | string | Yes | Assigned client code |
| `originChannelCode` | string | Yes | Assigned channel code |
| `originatorMsisdn` | string | Yes | Originator's mobile number |
| `payerEmail` | string | Yes | Payer's email |
| `billingAccountNumber` | string | Yes | Biller account, separate from the payer's mobile number |
| `invoiceNumber` | string | Yes | Invoice reference |
| `addTransactionCharge` | boolean | Yes | Whether to add the transaction charge |
| `transactionCharge` | string | Yes | Transaction charge amount, including `"0"` when applicable |
| `paymentMethodCode` | string | Yes | Assigned payment method code |
| `notifyClient` | boolean | Yes | Whether to notify the client |
| `notifyOriginator` | boolean | Yes | Whether to notify the originator |
| `callbackUrl` | string | Yes | Callback URL supplied by Pague |
| `extraData` | object | No | Additional agreed payment details |

Send actual JSON booleans (`true` or `false`), rather than quoted strings. Obtain the assigned codes and callback URL from Pague before submitting direct charges. If your payment method requires OTP verification, use the verification instructions supplied during onboarding.

### Lipad hosted checkout

Use the hosted checkout service code supplied for your account. The top-level `accountNumber` and `country` identify the payer. Send a positive whole-unit `amount` as a string, such as `"1000"`.

| `data` field | Type | Required | Value |
| --- | --- | --- | --- |
| `payerName` | string | Yes | Full name, maximum 100 characters |
| `payerEmail` | string | Yes | Valid email, maximum 100 characters |
| `redirectUrl` | string | Yes | Your HTTPS return URL without embedded credentials, maximum 500 characters |
| `expiresIn` | integer | No | Session duration in minutes, within the range supplied by Pague |

Example `data`:

```json
{
  "payerName": "Jane Doe",
  "payerEmail": "jane@example.com",
  "redirectUrl": "https://merchant.example/payment-return"
}
```

After creation, check the payment status until `data.checkout.redirectUrl` is available while the status is `PROCESSING`. Redirect the customer to that URL. The status response can contain:

```json
{
  "success": true,
  "data": {
    "id": "PAYMENT_REFERENCE",
    "status": "PROCESSING",
    "checkout": {
      "merchantTransactionId": "PAYMENT_REFERENCE",
      "checkoutReference": "CHECKOUT_REFERENCE",
      "redirectUrl": "https://checkout.example/session",
      "expiresAt": "2026-11-17T15:00:00.000Z"
    }
  },
  "meta": {
    "requestId": "example-request-id",
    "timestamp": "2026-11-17T14:00:00.000Z"
  }
}
```

Returning to your `redirectUrl` does not confirm payment. Check the payment status and confirm payment only when it is `SUCCESS`.

## Integration flow

1. Submit a payment using `POST /payments`.
2. Save the returned `data.id` as the payment reference.
3. Check `GET /payments/{paymentReference}` while the status is `PENDING` or `PROCESSING`.
4. Confirm the payment in your application when the status is `SUCCESS`.

## Endpoint summary

| Method | Endpoint | Purpose | Success status |
| --- | --- | --- | --- |
| POST | `/payments` | Create and queue a payment | `201 Created` |
| GET | `/payments/{paymentReference}` | Read the current status | `200 OK` |

Append these paths to `https://api.pague.co.uk/api`.

## Create a payment

```http
POST /api/payments
```

### Request fields

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `serviceCode` | string | Yes | Assigned payment service code; nonempty, maximum 50 characters. |
| `reference` | string | Yes | Your reference; trimmed, nonempty, maximum 100 characters; unique within your client. |
| `accountNumber` | string | Yes | Account being charged or credited; maximum 100 characters. For mobile money this is the payer/recipient MSISDN. |
| `country` | string | Yes | ISO two-letter country of that account, for example `MW`. |
| `currency` | string | Yes | Currency code; nonempty, maximum 36 characters; active and allowed for the service. |
| `amount` | string | Yes | Positive decimal, up to four fractional digits; must satisfy configured limits. |
| `transactionType` | string | Yes | Transaction type code; nonempty, maximum 50 characters; active and allowed for the service. |
| `description` | string | No | Maximum 255 characters. |
| `data` | JSON object | No | Service-specific fields described above. For Airtel Money Malawi, send `{}` or omit this field. |

Use a unique `reference` for each payment. Send `accountNumber` as a string to preserve its leading zero. Airtel mobile numbers may use local format, such as `0991234567`, or international format, such as `+265991234567`.

Send `amount` as a decimal string, such as `"100"` or `"100.50"`, within the service's amount range. Do not use commas, exponent notation, leading zeros such as `"0100"`, or more than four decimal places.

Send only the fields listed above.

### Example: Airtel Money Malawi collection

```bash
export PAYMENTS_BASE_URL='https://api.pague.co.uk/api'
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

Replace the example phone number with the payer’s Airtel Money Malawi number. This example requests a MWK 100 payment.

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

Save your `reference` and the returned `data.id`. Use `data.id` when checking payment status.

A `201` response means the payment request was accepted for processing. It does not confirm payment. Check the status endpoint for the outcome.

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

Use the `data.id` returned by creation in the status URL, rather than your submitted `reference`.

### Status values

| Status | Meaning |
| --- | --- |
| `PENDING` | Created and awaiting processing. |
| `PROCESSING` | Processing is underway; a final outcome is not yet available. |
| `SUCCESS` | Recorded as successful. |
| `FAILED` | Recorded as failed. |
| `REVERSED` | Recorded as reversed. |
| `CANCELLED` | Recorded as cancelled. |

Continue checking while the status is `PENDING` or `PROCESSING`, using the polling interval agreed with Pague. If the outcome remains unresolved after your agreed timeout, contact support with the payment reference. A timeout does not confirm failure.

## Errors

Errors use this envelope:

```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Amount must be at least 2.00.",
    "details": [],
    "path": "/api/payments"
  },
  "meta": {
    "requestId": "43834df0-892d-4c54-9478-be4167b0569a",
    "timestamp": "2026-11-13T08:49:27.916Z"
  }
}
```

| HTTP status | Meaning |
| --- | --- |
| `400` | Invalid request. Check the payment fields and service requirements. |
| `401` | Missing or invalid API key. |
| `403` | Access denied. Contact Pague if your key should have access. |
| `404` | Payment not found for your account. Check the payment reference. |
| `409` | The reference has already been used. |
| `500` | A server error occurred. Contact support if the result is unclear. |

A status response with `status: "FAILED"` means the payment failed; it is separate from an HTTP error when calling the API.

When contacting support, provide `meta.requestId`, your reference, the payment reference if available, and the approximate request time. Never include your API key.
