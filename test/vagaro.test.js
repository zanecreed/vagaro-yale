import test from "node:test";
import assert from "node:assert/strict";
import { mergeAccessCodeWindow } from "../src/accessCodeWindow.js";
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

test("uses a customer phone supplied by API lookup", () => {
  const appointment = normalizeAppointment(
    {
      appointmentId: 12345,
      serviceName: "Spectra S11 Session",
      customerId: "customer-123",
      businessId: "business-456",
      startTime: "2026-07-01T14:00:00-04:00",
      endTime: "2026-07-01T15:00:00-04:00"
    },
    {
      customerPhone: "555-222-4455"
    }
  );

  assert.equal(appointment.customerId, "customer-123");
  assert.equal(appointment.businessId, "business-456");
  assert.equal(appointment.code, "4455");
  assert.equal(appointment.error, undefined);
});

test("merges duplicate PIN windows so repeat appointments both work", () => {
  const merged = mergeAccessCodeWindow(
    {
      access_code_id: "access-code-1",
      name: "Vagaro old appointment spectra s11",
      code: "9978",
      starts_at: "2026-07-03T14:45:00.000Z",
      ends_at: "2026-07-03T16:15:00.000Z"
    },
    {
      appointmentId: "new-appointment",
      name: "Vagaro new appointment spectra s11",
      code: "9978",
      startsAt: "2026-07-01T10:45:00.000Z",
      endsAt: "2026-07-01T11:45:00.000Z"
    }
  );

  assert.equal(merged.accessCodeId, "access-code-1");
  assert.equal(merged.name, "Vagaro 9978 spectra s11 multi-appointment");
  assert.equal(merged.startsAt, "2026-07-01T10:45:00.000Z");
  assert.equal(merged.endsAt, "2026-07-03T16:15:00.000Z");
});

test("canceled appointments do not require a phone number", () => {
  const appointment = normalizeAppointment({
    action: "deleted",
    appointmentId: 12345,
    serviceName: "Spectra S11 Session",
    customerId: "customer-123",
    businessId: "business-456"
  });

  assert.equal(appointment.isCanceled, true);
  assert.equal(appointment.error, undefined);
  assert.equal(appointment.name, "Vagaro 12345 spectra s11");
});
