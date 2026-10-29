import { z } from "zod";
import { fromEnvironment, InfraiClient } from "./infrai_client.ts";

export const appointmentRequest = z.object({
  appointmentId: z.string().min(1),
  patientId: z.string().min(1),
  clinicianId: z.string().min(1),
  startsAt: z.string().datetime(),
  channel: z.enum(["sms", "email"]),
});

type Appointment = z.infer<typeof appointmentRequest>;

export function notificationDecision(appointment: Appointment, now: Date): "send" | "hold" {
  const hours = (new Date(appointment.startsAt).getTime() - now.getTime()) / 3_600_000;
  return hours >= 24 && hours <= 48 ? "send" : "hold";
}

export async function runAppointmentJob(client: InfraiClient, input: unknown, now = new Date()) {
  const appointment = appointmentRequest.parse(input);
  const decision = notificationDecision(appointment, now);
  const entry = {
    message: "appointment notification decision",
    level: "info",
    service: "appointment-job",
    environment: process.env.NODE_ENV ?? "development",
    trace_id: appointment.appointmentId,
    metadata: { appointmentId: appointment.appointmentId, channel: appointment.channel, decision },
  };
  await client.request("POST", "/v1/logs/ingest", {
    entries: [entry],
    idempotency_key: `appointment-decision-${appointment.appointmentId}`,
  });
  return { appointmentId: appointment.appointmentId, decision };
}

export async function auditRecentDecision(client: InfraiClient, appointmentId: string) {
  const [logs, keys, identity] = await Promise.all([
    client.request("GET", "/v1/logs/search", undefined, { service: "appointment-job", trace_id: appointmentId, limit: 10 }),
    client.request("GET", "/v1/account/keys/list"),
    client.request("GET", "/v1/account/whoami"),
  ]);
  return { logs, keys, identity };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const client = fromEnvironment();
  const input = {
    appointmentId: process.env.APPOINTMENT_ID ?? "appt-demo-001",
    patientId: process.env.PATIENT_ID ?? "patient-demo-001",
    clinicianId: process.env.CLINICIAN_ID ?? "clinician-demo-001",
    startsAt: process.env.STARTS_AT ?? new Date(Date.now() + 36 * 3_600_000).toISOString(),
    channel: "sms",
  };
  const result = await runAppointmentJob(client, input);
  const audit = await auditRecentDecision(client, result.appointmentId);
  console.log(JSON.stringify({ result, audit }, null, 2));
}
