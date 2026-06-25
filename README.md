# Vagaro to Seam Yale Access Automation

This service receives Vagaro appointment webhooks and creates a time-bound Seam access code on the Yale lock.

Behavior:

- Only appointments containing `spectra s11 session` are processed.
- The lock code is the last 4 digits of the customer's phone number.
- The code starts 15 minutes before the appointment start.
- The code ends 15 minutes after the appointment end.
- Cancellation/delete events delete the matching access code when possible.
- Rescheduled/re-sent appointments update the matching access code.
- If the appointment webhook only contains `customerId`, the service can fetch the customer profile from the Vagaro API and use the profile phone number.

## Environment Variables

Use the values in `.env.example` as the deployment template.

Do not commit real secrets. Set `SEAM_API_KEY` and `WEBHOOK_SECRET` in the cloud host's environment variable settings.

For Vagaro API customer lookup, also set:

```text
VAGARO_CLIENT_ID=your_vagaro_client_id
VAGARO_CLIENT_SECRET=your_vagaro_client_secret
VAGARO_REGION=us
VAGARO_TOKEN_SCOPE=customers
```

The Generate Access Token endpoint defaults to:

```text
POST https://api.vagaro.com/{region}/api/v2/merchants/generate-access-token
```

It sends this JSON body:

```json
{
  "clientId": "from Render env",
  "clientSecretKey": "from Render env",
  "scope": "customers"
}
```

The Retrieve Customer endpoint defaults to:

```text
POST https://api.vagaro.com/{region}/api/v2/customers
```

It sends this JSON body:

```json
{
  "businessId": "from appointment webhook",
  "customerId": "from appointment webhook"
}
```

And it sends the token in Vagaro's required `accessToken` header.

The public Vagaro customer docs expose the customer endpoint, but the exact token endpoint may require logging into the Vagaro developer portal.

## Endpoints

- `GET /health`: health check.
- `POST /webhooks/vagaro`: Vagaro webhook endpoint.
- `POST /tasks/reconcile`: optional 15-minute monitor endpoint. This reports Vagaro-managed Seam codes. Seam itself handles time-bound start/end scheduling.

If `WEBHOOK_SECRET` is set, requests must include this header:

```text
x-webhook-secret: your_secret
```

If Vagaro cannot send custom headers, leave `WEBHOOK_SECRET` unset and use the long unguessable cloud URL as the main protection.

## Vagaro Setup

In Vagaro's webhook screen:

- Name: `Seam Yale Access Codes`
- Webhook Endpoint URL: `https://your-cloud-app.example.com/webhooks/vagaro`
- Request Method: `POST`
- Request Format: `JSON`
- Event Types: select `Appointments`

## Cloud Hosting

This is a plain Node.js service, so Render, Railway, Fly.io, and similar hosts work well.

Use:

```text
npm start
```

Node version:

```text
20 or newer
```

For a 15-minute monitor, configure your host's cron/scheduled job feature or a service like cron-job.org to `POST`:

```text
https://your-cloud-app.example.com/tasks/reconcile
```

Include `x-webhook-secret` if you set `WEBHOOK_SECRET`.

## First Live Payload

Vagaro webhook field names may vary by account. If a webhook cannot be processed because the payload is missing appointment fields, the service returns success to Vagaro and logs the original payload so the field mapper can be adjusted.

If the webhook includes `customerId` but no phone number, configure the Vagaro API variables above. The service will exchange the client credentials for an access token, retrieve the customer profile, extract the phone number, and use the last four digits as the lock code.
