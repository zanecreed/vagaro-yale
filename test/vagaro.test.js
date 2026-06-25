import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAppointment } from "../src/vagaro.js";

test("normalizes a target appointment into a Seam access code window", () => {
  const appointment = normalizeAppointment({
    eventType: "Appointments",
    appointmentId: 12345,
    serviceName: "Spectra S11 Session",
    customer: {
      phone: "(555) 123-9876"
    },
    startTime: "2026-07-01T14:00:00-04:00",
    endTime: "2026-07-01T15:00:00-04:00"
  });

  assert.equal(appointment.ignored, false);
  assert.equal(appointment.appointmentId, "12345");
  assert.equal(appointment.code, "9876");
  assert.equal(appointment.startsAt, "2026-07-01T17:45:00.000Z");
  assert.equal(appointment.endsAt, "2026-07-01T19:15:00.000Z");
});

test("ignores appointments for other services", () => {
  const appointment = normalizeAppointment({
    appointmentId: 12345,
    serviceName: "Consultation",
    customer: {
      phone: "(555) 123-9876"
    },
    startTime: "2026-07-01T14:00:00-04:00",
    endTime: "2026-07-01T15:00:00-04:00"
  });

  assert.equal(appointment.ignored, true);
});

test("detects canceled appointment events", () => {
  const appointment = normalizeAppointment({
    eventType: "AppointmentCancelled",
    appointmentId: 12345,
    serviceName: "Spectra S11 Session",
    customer: {
      phone: "(555) 123-9876"
    },
    startTime: "2026-07-01T14:00:00-04:00",
    endTime: "2026-07-01T15:00:00-04:00"
  });

  assert.equal(appointment.isCanceled, true);
});
