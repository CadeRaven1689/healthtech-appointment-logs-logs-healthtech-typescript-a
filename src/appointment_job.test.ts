import assert from "node:assert/strict";
import { notificationDecision } from "./appointment_job.ts";

const base = {
  appointmentId: "appt-test-001",
  patientId: "patient-test-001",
  clinicianId: "clinician-test-001",
  startsAt: "2026-10-26T12:00:00.000Z",
  channel: "sms" as const,
};
const now = new Date("2026-10-25T00:00:00.000Z");

assert.equal(notificationDecision(base, now), "send");
assert.equal(notificationDecision({ ...base, startsAt: "2026-10-27T12:00:00.000Z" }, now), "hold");
console.log("appointment notification decision test passed");
