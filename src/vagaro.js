import crypto from "node:crypto";
import { config } from "./config.js";

const APPOINTMENT_ID_KEYS = [
  "appointmentid",
  "appointment_id",
  "appointmentguid",
  "bookingid",
  "booking_id",
  "eventid",
  "id"
];

const PHONE_KEYS = [
  "phone",
  "phonenumber",
  "phone_number",
  "mobile",
  "mobilephone",
  "mobile_phone",
  "cell",
  "cellphone",
  "customerphone",
  "clientphone"
];

const CUSTOMER_ID_KEYS = ["customerid", "customer_id", "clientid", "client_id"];
const BUSINESS_ID_KEYS = ["businessid", "business_id"];

const START_KEYS = [
  "start",
  "starts",
  "starttime",
  "start_time",
  "startdatetime",
  "start_date_time",
  "appointmentstart",
  "appointment_start",
  "appointmentdatetime",
  "appointment_date_time",
  "appointmentdate",
  "appointment_date"
];

const END_KEYS = [
  "end",
  "ends",
  "endtime",
  "end_time",
  "enddatetime",
  "end_date_time",
  "appointmentend",
  "appointment_end"
];

const DURATION_KEYS = ["duration", "durationminutes", "duration_minutes", "length"];

export function normalizeAppointment(payload, options = {}) {
  const flat = flatten(payload);
  const searchableText = JSON.stringify(payload).toLowerCase();
  const isTargetService = searchableText.includes(config.serviceFilter);
  const statusText = collectStatusText(flat).toLowerCase();
  const isCanceled = /(cancel|cancelled|canceled|delete|deleted|void|removed)/.test(
    statusText
  );

  if (!isTargetService) {
    return {
      ignored: true,
      reason: `Appointment does not include target service "${config.serviceFilter}".`
    };
  }

  const appointmentId =
    findFirstValue(flat, APPOINTMENT_ID_KEYS) ?? stablePayloadHash(payload);
  const customerId = findFirstValue(flat, CUSTOMER_ID_KEYS);
  const businessId = findFirstValue(flat, BUSINESS_ID_KEYS);
  const phone = options.customerPhone ?? findFirstValue(flat, PHONE_KEYS);
  const code = lastFourDigits(phone);

  const startRaw = findFirstValue(flat, START_KEYS);
  const endRaw = findFirstValue(flat, END_KEYS);
  const durationMinutes = Number(findFirstValue(flat, DURATION_KEYS));
  const start = parseDate(startRaw);
  const appointmentEnd =
    parseDate(endRaw) ??
    (start && Number.isFinite(durationMinutes)
      ? new Date(start.getTime() + durationMinutes * 60_000)
      : null);

  const missing = [];
  if (!code) missing.push("customer phone number");
  if (!start) missing.push("appointment start time");
  if (!appointmentEnd) missing.push("appointment end time or duration");

  const name = `Vagaro ${appointmentId} spectra s11`;

  if (missing.length > 0) {
    return {
      ignored: false,
      error: `Missing ${missing.join(", ")} in Vagaro webhook payload.`,
      appointmentId,
      customerId: customerId ? String(customerId) : undefined,
      businessId: businessId ? String(businessId) : undefined,
      isCanceled
    };
  }

  return {
    ignored: false,
    appointmentId: String(appointmentId),
    customerId: customerId ? String(customerId) : undefined,
    businessId: businessId ? String(businessId) : undefined,
    name,
    code,
    startsAt: addMinutes(start, -config.codeLeadMinutes).toISOString(),
    endsAt: addMinutes(appointmentEnd, config.codeGraceMinutes).toISOString(),
    isCanceled
  };
}

function flatten(value, path = [], rows = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => flatten(item, [...path, String(index)], rows));
    return rows;
  }

  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) => flatten(item, [...path, key], rows));
    return rows;
  }

  rows.push({
    key: path[path.length - 1]?.toLowerCase() ?? "",
    path: path.join(".").toLowerCase(),
    value
  });
  return rows;
}

function findFirstValue(flat, keys) {
  const normalizedKeys = new Set(keys.map((key) => key.toLowerCase()));
  const row = flat.find((item) => normalizedKeys.has(item.key));
  return row?.value;
}

function collectStatusText(flat) {
  return flat
    .filter((item) => /status|event|action|type/.test(item.key))
    .map((item) => String(item.value ?? ""))
    .join(" ");
}

function lastFourDigits(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
}

function parseDate(value) {
  if (!value) return null;

  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60_000);
}

function stablePayloadHash(payload) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
    .slice(0, 16);
}
