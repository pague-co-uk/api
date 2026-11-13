# Normalized payment rollout and testing

Payment endpoints only; messaging contracts are unchanged.

## Deploy in this order

1. Apply canonical database migration `20261113100000_normalized_payment_account` from **sms-gateway-db** to the intended environment. It adds nullable `transactions.accountNumber` and `transactions.country`; it does not rewrite historical records. Use the canonical database migration process (`npm run deploy` in that repository) with the correct environment. Do not run the same migration separately from consumer repositories.
2. Release the updated canonical database package and regenerate consumers' Prisma clients. This checkout already has synchronized API/processor schemas and regenerated local clients. Coordinate package publication/version bumps through the normal release process.
3. Deploy the updated payment processor. It reads common columns for new payments and falls back to metadata for older queued payments.
4. Deploy the API, then the frontend displaying account/country on transaction details.
5. Update client service configurations to version 2 and migrate callers to the top-level fields. Keep the alias transition until callers are migrated.

On 13 November 2026, the payment migration was applied separately to the local `localhost:3306/sms_gateway` database and recorded as applied. Both nullable columns were verified. No live provider payment was sent. Other environments still require this migration.

The local database reports the four older canonical migrations as unapplied even though their tables already exist. Do not run a blanket `migrate deploy` there until that older migration history has been reviewed and baselined; only the new payment migration was executed during this fix.

A processor using new Prisma models needs the columns to exist even while handling an old transaction. Apply the schema expansion before restarting the updated applications. Rollback application code without dropping columns; older processors cannot process newly created canonical-only metadata, so stop/drain new submissions before rolling the processor back.

## Example service configuration

The example below matches the inspected local Airtel assignment. Confirm the currency/type codes and amount limits for each target environment:

```json
{
  "version": 2,
  "accountType": "mobile",
  "requiredFields": [],
  "countries": ["MW"],
  "dataFields": {},
  "validation": {
    "limits": { "minimumAmount": "2.00", "maximumAmount": "1000000.00" },
    "currencies": ["MWK"],
    "transactionTypes": ["COLLECTIONS"]
  }
}
```

`accountType` is `mobile`, `bank` or `identifier`; version 2 requires it. Generic/bank accounts are nonempty strings up to 100 characters; bank-specific checks can still happen at the provider. Mobile accounts must be valid mobile or combined fixed/mobile numbering-plan entries for their country. Countries are optional restrictions; omitted/empty means any valid ISO country.

`dataFields` supports `type` (`string`, `number`, `boolean`, `object`), `required`, scalar `enum`, and string `minLength`/`maxLength`. For example:

```json
{
  "bankCode": { "type": "string", "required": true, "minLength": 2 },
  "notifyClient": { "type": "boolean", "required": true }
}
```

Legacy `requiredFields` configuration remains supported. For an existing configuration without `accountType`, legacy `msisdn`/`payerMsisdn` requirements or a `MOBILE` destination identify a mobile request. Explicitly configure account types rather than relying on inference. Version 2 does not need `requiredFields`; it defaults to an empty list.

The configuration validator retains these new rules when assignments are saved. It rejects common aliases in `dataFields`: define those restrictions using the common account/country rules instead. `dataFields` validates configured fields but does not reject unspecified extra data keys.

For direct charges, the biller account is `data.billingAccountNumber`; the common `accountNumber` is the payer's mobile account. Originator contact numbers and payout recipient contact numbers remain separate fields when the provider needs them. For international payouts, `country` is the destination account country, while `data.senderCountryCode` stays separate. Provider-owned callback URLs and other required adapter inputs still need to be provisioned correctly; normalization does not supply them automatically.

## Compatibility rules

- New requests use top-level `accountNumber` and `country`; `data` may be omitted.
- Legacy common aliases can supply missing fields when unambiguous. Equivalent phone formats are accepted; conflicting values return 400.
- Old bank/payout requests that have only `senderCountryCode` must add the actual account country. It is unsafe to infer it from the sender.
- Common aliases are removed from newly stored metadata; billing account aliases are canonicalized separately.
- Historical rows remain nullable and their metadata remains unchanged. A later backfill should be reviewed by service type; do not blindly copy billing accounts or sender countries into common columns.
- The public API still requires amount, currency and transaction type. No refund/cancellation endpoints were introduced.

## Verification before provider testing

```sh
# API repository
npm test -- --runInBand src/modules/payments/normalize-payment.spec.ts src/modules/payments/services/payments.service.spec.ts
./node_modules/.bin/tsc --noEmit -p tsconfig.build.json

# payment-processor repository
npm run test:payments
./node_modules/.bin/tsc --noEmit -p tsconfig.build.json
```

For controlled end-to-end testing, use a sandbox provider/account and an assigned service. Confirm:

1. Create with common fields and no `data` when the service needs no extras; response is 201/PENDING with a public reference.
2. Database stores normalized account/country and additional metadata separately, with exactly one processing event.
3. Provider request uses the expected account representation: Airtel's national subscriber number, Lipad's payer/recipient account, separate billing/sender details.
4. Poll using the original public reference and verify it remains unchanged through final status.
5. Missing/wrong country, invalid number, conflicting aliases and invalid service data return 400 before creating a transaction.
6. Repeated client reference returns 409; unavailable/other-client payment reference returns 404.
7. A pre-upgrade queued transaction with null common columns still processes using its old metadata.

Do not retry uncertain POST results with a new client reference; duplicate requests are rejected, not replayed idempotently.
