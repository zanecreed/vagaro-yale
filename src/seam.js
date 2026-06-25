import { config } from "./config.js";

async function seamRequest(path, body) {
  const response = await fetch(`${config.seamApiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.seamApiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok || data.ok === false) {
    const message =
      data?.error?.message ??
      data?.message ??
      `Seam request failed with HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.response = data;
    throw error;
  }

  return data;
}

export async function listAccessCodes() {
  const data = await seamRequest("/access_codes/list", {
    device_id: config.seamDeviceId,
    limit: 100
  });

  return data.access_codes ?? [];
}

export async function createAccessCode({ name, code, startsAt, endsAt }) {
  return seamRequest("/access_codes/create", {
    device_id: config.seamDeviceId,
    name,
    code,
    starts_at: startsAt,
    ends_at: endsAt,
    sync: false
  });
}

export async function updateAccessCode({ accessCodeId, name, code, startsAt, endsAt }) {
  return seamRequest("/access_codes/update", {
    access_code_id: accessCodeId,
    device_id: config.seamDeviceId,
    name,
    code,
    starts_at: startsAt,
    ends_at: endsAt,
    sync: false
  });
}

export async function deleteAccessCode(accessCodeId) {
  return seamRequest("/access_codes/delete", {
    access_code_id: accessCodeId,
    device_id: config.seamDeviceId,
    sync: false
  });
}
