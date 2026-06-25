export const config = {
  port: Number(process.env.PORT ?? 3000),
  seamApiKey: process.env.SEAM_API_KEY,
  seamDeviceId:
    process.env.SEAM_DEVICE_ID ?? "49eccd3d-09e8-401b-8253-4eb63b7c844a",
  seamApiBaseUrl: process.env.SEAM_API_BASE_URL ?? "https://connect.getseam.com",
  serviceFilter: (process.env.VAGARO_SERVICE_FILTER ?? "spectra s11 session")
    .trim()
    .toLowerCase(),
  codeLeadMinutes: Number(process.env.CODE_LEAD_MINUTES ?? 15),
  codeGraceMinutes: Number(process.env.CODE_GRACE_MINUTES ?? 15),
  webhookSecret: process.env.WEBHOOK_SECRET,
  businessTimezone: process.env.BUSINESS_TIMEZONE ?? "America/New_York"
};

export function assertRuntimeConfig() {
  const missing = [];

  if (!config.seamApiKey) missing.push("SEAM_API_KEY");
  if (!config.seamDeviceId) missing.push("SEAM_DEVICE_ID");

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
