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
  businessTimezone: process.env.BUSINESS_TIMEZONE ?? "America/New_York",
  vagaroClientId: process.env.VAGARO_CLIENT_ID,
  vagaroClientSecret: process.env.VAGARO_CLIENT_SECRET,
  vagaroTokenUrl: process.env.VAGARO_TOKEN_URL,
  vagaroTokenScope: process.env.VAGARO_TOKEN_SCOPE ?? "customers",
  vagaroCustomerUrlTemplate: process.env.VAGARO_CUSTOMER_URL_TEMPLATE,
  vagaroApiBaseUrl: process.env.VAGARO_API_BASE_URL,
  vagaroRegion: process.env.VAGARO_REGION ?? "us"
};

export function assertRuntimeConfig() {
  const missing = [];

  if (!config.seamApiKey) missing.push("SEAM_API_KEY");
  if (!config.seamDeviceId) missing.push("SEAM_DEVICE_ID");

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
