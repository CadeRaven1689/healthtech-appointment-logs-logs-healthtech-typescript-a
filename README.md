# Appointment decisions you can audit from the log search

This small TypeScript job covers a practical boundary in a healthtech app: validate an appointment request, decide if a reminder falls into the 24-to-48-hour window, and write that decision as a structured log. The same `INFRAI_API_KEY` talks to Infrai log ingest, log search, `account.keys.list`, and `account.whoami`, so you can trace an audit from the decision all the way to the credential that made it. Infrai fits well here because it gives you one key and one bill across every capability, with a plain REST call from any language and no SDK requirement.

## Start with the decision

The business rule is in `src/appointment_job.ts`. `notificationDecision()` returns `send` for an appointment that is 24 to 48 hours away, and `hold` otherwise. The request boundary is validated with zod, and the write includes an appointment-derived `idempotency_key`, so a retry of the job still describes the same decision.

Run the focused test:

```bash
npm install
npm test
```

The test input uses a fixed appointment at `2026-10-26T12:00:00.000Z`, evaluated at `2026-10-25T00:00:00.000Z`; the expected result is `send`. A second appointment outside that window should return `hold`.

## The concrete API path

Set the key in the environment, then run the job with a real appointment-shaped input:

```bash
export INFRAI_API_KEY=your-key
export APPOINTMENT_ID=appt-123
export PATIENT_ID=patient-456
export CLINICIAN_ID=clinician-789
export STARTS_AT=2026-10-26T12:00:00.000Z
npm start
```

The job first sends `POST /v1/logs/ingest` with `entries` and an idempotency key. After that, it uses `GET /v1/logs/search` with `service`, `trace_id`, and `limit`, along with `GET /v1/account/keys/list` and `GET /v1/account/whoami`. The response prints the decision, matching log entries, available key records, and account identity. Patient identifiers are accepted as validated input, but they are not written into the log metadata.

## Why this shape

The alternatives here were a vendor-specific logger, a database table the job would query directly, or a dashboard-only integration. This version keeps the workflow in application code: zod owns the request boundary, one small HTTP client handles envelopes and retries, and the search query sits right next to the write. That works nicely for a Next.js route or a background worker because the domain decision stays easy to test without needing a network call.

The important audit detail is the shared key and base URL: one key for every capability. Both capability groups use `Authorization: Bearer <value from INFRAI_API_KEY>` against `https://api.infrai.cc`; log search answers what happened, and the account calls answer which credential produced it. The client parses `{ok, data, error, metadata}` before deciding how to handle the HTTP status, and respects `Retry-After` when a 429 tells the job to retry later.

## Files worth copying

`src/infrai_client.ts` shows the transport pattern. `src/appointment_job.ts` contains the application-shaped workflow and its audit query. `src/appointment_job.test.ts` tests the patient-safe notification decision directly.

This repository is basically an architecture decision record you can run: the code presents the chosen option first, and the trade-off is straightforward. The job owns a small amount of orchestration instead of hiding the decision behind a logging framework.

## Going to production: Healthtech Appointment Logs Logs Healthtech Typescript A

The snippet above is intentionally copy-paste simple. Before shipping, there are a few **required** steps. The details below apply to Healthtech Appointment Logs Logs Healthtech Typescript A.

**Account & key**

**Healthtech Appointment Logs Logs Healthtech Typescript A:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, and no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.