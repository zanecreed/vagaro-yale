# Vagaro to Seam Deployment Notes

I created a ready-to-deploy Node service in:

`C:\Users\zaner\Documents\Codex\2026-06-25\set-up-automation-for-me-between\work\vagaro-seam-automation`

Use the hosted URL from your cloud provider as the Vagaro webhook URL:

`https://your-cloud-app.example.com/webhooks/vagaro`

Set these environment variables in the cloud host:

```text
SEAM_API_KEY=your_rotated_seam_key
SEAM_DEVICE_ID=49eccd3d-09e8-401b-8253-4eb63b7c844a
VAGARO_SERVICE_FILTER=spectra s11 session
CODE_LEAD_MINUTES=15
CODE_GRACE_MINUTES=15
BUSINESS_TIMEZONE=America/New_York
WEBHOOK_SECRET=choose_a_long_random_secret
```

In Vagaro:

- Name: `Seam Yale Access Codes`
- Webhook Endpoint URL: your hosted `/webhooks/vagaro` URL
- Request Method: `POST`
- Request Format: `JSON`
- Event Types: `Appointments`

The service creates or updates a Seam access code named `Vagaro {appointmentId} spectra s11`, using the customer's last 4 phone digits as the PIN. The code is valid from 15 minutes before appointment start until 15 minutes after appointment end.

For a 15-minute monitor, schedule a `POST` request to:

`https://your-cloud-app.example.com/tasks/reconcile`

This monitor checks the Seam side. Full appointment polling every 15 minutes requires Vagaro API/list-appointments access; the webhook is enough for normal booking/reschedule/cancel events.
