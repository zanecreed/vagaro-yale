import http from "node:http";
import { assertRuntimeConfig, config } from "./config.js";
import {
  createAccessCode,
  deleteAccessCode,
  listAccessCodes,
  updateAccessCode
} from "./seam.js";
import { normalizeAppointment } from "./vagaro.js";

const CODE_NAME_PREFIX = "Vagaro ";

assertRuntimeConfig();

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === "GET" && url.pathname === "/health") {
      return sendJson(response, 200, { ok: true });
    }

    if (request.method === "POST" && url.pathname === "/webhooks/vagaro") {
      assertWebhookSecret(request);
      const payload = await readJson(request);
      const result = await handleVagaroWebhook(payload);
      return sendJson(response, result.status, result.body);
    }

    if (request.method === "POST" && url.pathname === "/tasks/reconcile") {
      assertWebhookSecret(request);
      const result = await reconcileAccessCodes();
      return sendJson(response, 200, result);
    }

    return sendJson(response, 404, { ok: false, error: "Not found" });
  } catch (error) {
    console.error(error);
    return sendJson(response, error.status ?? 500, {
      ok: false,
      error: error.message,
      details: error.response
    });
  }
});

server.listen(config.port, () => {
  console.log(`Vagaro to Seam automation listening on port ${config.port}`);
});

export async function handleVagaroWebhook(payload) {
  const appointment = normalizeAppointment(payload);
  console.log("Normalized Vagaro webhook:", JSON.stringify(appointment));

  if (appointment.ignored) {
    return { status: 202, body: { ok: true, ignored: true, reason: appointment.reason } };
  }

  if (appointment.error) {
    console.log("Original Vagaro payload:", JSON.stringify(payload));
    return {
      status: 202,
      body: {
        ok: true,
        skipped: true,
        reason: appointment.error,
        appointmentId: appointment.appointmentId
      }
    };
  }

  const accessCodes = await listAccessCodes();
  const existing = accessCodes.find((code) => code.name === appointment.name);

  if (appointment.isCanceled) {
    if (existing) {
      await deleteAccessCode(existing.access_code_id);
      return {
        status: 200,
        body: { ok: true, action: "deleted", appointmentId: appointment.appointmentId }
      };
    }

    return {
      status: 200,
      body: { ok: true, action: "nothing_to_delete", appointmentId: appointment.appointmentId }
    };
  }

  if (existing) {
    await updateAccessCode({
      accessCodeId: existing.access_code_id,
      name: appointment.name,
      code: appointment.code,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt
    });

    return {
      status: 200,
      body: { ok: true, action: "updated", appointmentId: appointment.appointmentId }
    };
  }

  const created = await createAccessCode({
    name: appointment.name,
    code: appointment.code,
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt
  });

  return {
    status: 200,
    body: {
      ok: true,
      action: "created",
      appointmentId: appointment.appointmentId,
      accessCodeId: created.access_code?.access_code_id
    }
  };
}

async function reconcileAccessCodes() {
  const accessCodes = await listAccessCodes();
  const managed = accessCodes.filter((code) => code.name?.startsWith(CODE_NAME_PREFIX));
  const now = Date.now();
  const stale = managed.filter((code) => code.ends_at && new Date(code.ends_at).getTime() < now);

  return {
    ok: true,
    note: "Seam removes scheduled time-bound access automatically. This check reports Vagaro-managed codes visible in Seam.",
    managedCount: managed.length,
    pastEndCount: stale.length,
    pastEndAccessCodeIds: stale.map((code) => code.access_code_id)
  };
}

function assertWebhookSecret(request) {
  if (!config.webhookSecret) return;

  const provided = request.headers["x-webhook-secret"];
  if (provided !== config.webhookSecret) {
    const error = new Error("Invalid webhook secret");
    error.status = 401;
    throw error;
  }
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);

  const text = Buffer.concat(chunks).toString("utf8");
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    const error = new Error("Request body must be valid JSON");
    error.status = 400;
    throw error;
  }
}

function sendJson(response, status, body) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}
