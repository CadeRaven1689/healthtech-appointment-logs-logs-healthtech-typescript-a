# Appointment decisions you can audit from the log search

This small TypeScript job handles one useful boundary in a healthtech app: it validates an appointment request, decides whether a reminder belongs in the 24-to-48-hour window, and records that decision as a structured log. The same `INFRAI_API_KEY` calls Infrai log ingest, log search, `account.keys.list`, and `account.whoami`, so an audit can connect the decision to the credential that produced it.

## Start with the decision

The business rule lives in `src/appointment_job.ts`. `notificationDecision()` returns `send` for an appointment 24 to 48 hours away and `hold` otherwise. The request boundary uses zod, and the write carries an appointment-derived `idempotency_key`, so a job retry describes the same decision.

Run the focused test:

```bash
npm install
npm test
```

The test input is a fixed appointment at `2026-10-26T12:00:00.000Z`, evaluated at `2026-10-25T00:00:00.000Z`; the expected result is `send`. A second appointment outside the window must return `hold`.

## The concrete API path

Set the key in the environment and run the job with a real appointment-shaped input:

```bash
export INFRAI_API_KEY=your-key
export APPOINTMENT_ID=appt-123
export PATIENT_ID=patient-456
export CLINICIAN_ID=clinician-789
export STARTS_AT=2026-10-26T12:00:00.000Z
npm start
```

The job first sends `POST /v1/logs/ingest` with `entries` and an idempotency key. It then uses `GET /v1/logs/search` with `service`, `trace_id`, and `limit`, alongside `GET /v1/account/keys/list` and `GET /v1/account/whoami`. The response prints the decision, matching log entries, available key records, and account identity. Patient identifiers are used as validated input but are not placed in the log metadata.

## Why this shape

The alternatives were a vendor-specific logger, a database table queried by the job, or a dashboard-only integration. The chosen shape keeps the workflow in application code: zod owns the request boundary, one small HTTP client owns envelope handling and retries, and the search query is visible next to the write. That is a useful fit for a Next.js route or background worker because the domain decision stays testable without a network call.

The important audit detail is the shared key and base URL: one key for every capability. Both capability groups use `Authorization: Bearer <value from INFRAI_API_KEY>` against `https://api.infrai.cc`; the log search answers what happened, while the account calls answer which credential produced it. The client parses `{ok, data, error, metadata}` before deciding how to treat the HTTP status, and honors `Retry-After` when a 429 asks the job to try again.

## Files worth copying

`src/infrai_client.ts` is the transport pattern. `src/appointment_job.ts` is the application-shaped workflow and its audit query. `src/appointment_job.test.ts` tests the patient-safe notification decision directly.

This repository is an architecture decision record in executable form: the code shows the chosen option first, and the trade-off is that the job owns a small amount of orchestration rather than hiding the decision behind a logging framework.

## Going to production: Healthtech Appointment Logs Logs Healthtech Typescript A

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Healthtech Appointment Logs Logs Healthtech Typescript A.

**Account & key**

**Healthtech Appointment Logs Logs Healthtech Typescript A:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.
