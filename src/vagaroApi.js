import { config } from "./config.js";

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

let tokenCache = null;

export function isVagaroApiConfigured() {
  return Boolean(config.vagaroClientId && config.vagaroClientSecret);
}

export async function getCustomerPhone({ customerId, businessId }) {
  if (!customerId || !businessId) return null;

  if (!isVagaroApiConfigured()) {
    console.log(
      "Vagaro API lookup skipped: set VAGARO_CLIENT_ID and VAGARO_CLIENT_SECRET."
    );
    return null;
  }

  console.log(
    "Requesting Vagaro access token:",
    JSON.stringify({ tokenUrl: buildTokenUrl(), scope: config.vagaroTokenScope })
  );
  const token = await getAccessToken();
  const customerUrl = buildCustomerUrl();
  console.log("Requesting Vagaro customer profile:", JSON.stringify({ customerUrl }));
  const response = await fetch(customerUrl, {
    method: "POST",
    headers: {
      accessToken: token,
      accept: "application/json",
      "content-type": "application/json"
    },
    body: JSON.stringify({ businessId, customerId })
  });

  const data = await readJsonResponse(response);

  if (!response.ok) {
    const message =
      data?.error_description ??
      data?.error?.message ??
      data?.message ??
      `Vagaro customer lookup failed with HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.response = data;
    throw error;
  }

  const phone = findPhone(data);
  if (!phone) {
    console.log("Vagaro customer profile did not include a phone number:", JSON.stringify(data));
  }

  return phone;
}

async function getAccessToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.accessToken;
  }

  const response = await fetch(buildTokenUrl(), {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      clientId: config.vagaroClientId,
      clientSecretKey: config.vagaroClientSecret,
      scope: config.vagaroTokenScope
    })
  });

  const data = await readJsonResponse(response);

  const accessToken = data.access_token ?? data.accessToken ?? data.token;

  if (!response.ok || !accessToken) {
    const message =
      data?.error_description ??
      data?.error?.message ??
      data?.message ??
      `Vagaro token request failed with HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.response = data;
    throw error;
  }

  const expiresInSeconds = Number(data.expires_in ?? 3600);
  tokenCache = {
    accessToken,
    expiresAt: Date.now() + expiresInSeconds * 1000
  };

  return tokenCache.accessToken;
}

function buildTokenUrl() {
  if (config.vagaroTokenUrl) return config.vagaroTokenUrl;

  return `https://api.vagaro.com/${encodeURIComponent(
    config.vagaroRegion
  )}/api/v2/merchants/generate-access-token`;
}

function buildCustomerUrl() {
  const template =
    config.vagaroCustomerUrlTemplate ??
    `https://api.vagaro.com/${encodeURIComponent(config.vagaroRegion)}/api/v2/customers`;
  const path = template.replaceAll("{region}", encodeURIComponent(config.vagaroRegion));

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  if (!config.vagaroApiBaseUrl) {
    throw new Error(
      "VAGARO_CUSTOMER_URL_TEMPLATE is relative, so VAGARO_API_BASE_URL must also be set."
    );
  }

  return new URL(path, config.vagaroApiBaseUrl).toString();
}

function findPhone(value) {
  const flat = flatten(value);
  const normalizedKeys = new Set(PHONE_KEYS);
  const row = flat.find((item) => normalizedKeys.has(item.key));
  return row?.value ? String(row.value) : null;
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

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}
