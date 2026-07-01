export function mergeAccessCodeWindow(existingAccessCode, appointment) {
  const existingStartsAt = parseAccessCodeDate(existingAccessCode.starts_at);
  const existingEndsAt = parseAccessCodeDate(existingAccessCode.ends_at);
  const appointmentStartsAt = new Date(appointment.startsAt);
  const appointmentEndsAt = new Date(appointment.endsAt);

  const startsAt =
    existingStartsAt && existingStartsAt < appointmentStartsAt
      ? existingStartsAt
      : appointmentStartsAt;
  const endsAt =
    existingEndsAt && existingEndsAt > appointmentEndsAt ? existingEndsAt : appointmentEndsAt;

  return {
    accessCodeId: existingAccessCode.access_code_id,
    name: mergedAccessCodeName(existingAccessCode, appointment),
    code: appointment.code,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString()
  };
}

function parseAccessCodeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function mergedAccessCodeName(existingAccessCode, appointment) {
  if (existingAccessCode.name === appointment.name) return appointment.name;
  return `Vagaro ${appointment.code} spectra s11 multi-appointment`;
}
