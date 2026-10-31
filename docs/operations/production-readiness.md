# Production operations and recovery

This runbook describes the current Atlas Node deployment on Dokploy. It is an
operator checklist, not a claim of a formal security or compliance assessment.

## Deployment sequence

1. Keep the `temporal` and `launchstack` Dokploy apps on the same host-wide
   `dokploy-network`. Deploy the Temporal stack first.
2. Configure the app environment in the Dokploy `launchstack` app. Keep
   database, Better Auth, email, Temporal, and object-storage credentials in
   server-side environment variables only; never use `VITE_` variables for
   secrets.
3. Before deploying a database migration, take or verify a recent database
   backup. Run the migrator explicitly:

   ```sh
   docker compose -f infra/dokploy/launchstack/docker-compose.yaml run --rm --build migrate
   ```

4. Deploy the `launchstack` app. The API and Temporal worker use the same image
   so workflow code is released together.
5. Confirm the liveness and readiness endpoints:

   ```sh
   curl -fsS https://api.example.com/api/health/live
   curl -fsS https://api.example.com/api/health
   ```

   Liveness must not depend on external services. Readiness reports database
   and Temporal connectivity and may return 503 during dependency outages.

## Monitoring and triage

- Use the `x-request-id` response header to correlate a failed API request with
  structured backend logs. Do not copy session cookies, authorization headers,
  invitation tokens, or storage credentials into incident tickets.
- Inspect backend logs first for API/database errors. Inspect the worker logs
  separately for Temporal activity failures; worker logs are per replica.
- A failing readiness check means the API cannot currently use Postgres or
  Temporal. Do not restart-loop the backend solely because readiness is down;
  the container liveness probe intentionally checks only whether the process is
  serving HTTP.
- For an invitation email failure, the client and hashed invitation record may
  already have been saved. Fix the sender configuration or provider issue, then
  resend the invitation from the firm client list. The API reports this
  partial-success state explicitly; email delivery is not currently backed by
  a durable retry queue.
- For an upload database failure after object storage accepted a file, the
  application attempts to delete the orphaned object. A cleanup failure is
  logged and requires operator investigation; there is not yet a periodic
  orphan reconciliation job.

## Backup and recovery

- Back up the application Postgres database, Temporal persistence databases,
  and client-document object storage under separate, documented retention
  policies. A database-only backup does not restore uploaded document bytes.
- Restrict backup access to the smallest operator group and test restores into
  an isolated environment on a scheduled basis.
- Before applying a migration, confirm that a restorable backup exists and
  review whether the migration is reversible. Do not use the local
  `db:fresh` command against production data.
- After restoring, verify application and auth database connectivity, run
  readiness checks, confirm a representative client request and its file
  metadata exist, then test authorized signed download links.

## Credentials and service changes

- Rotate Resend, Postgres, Better Auth, and object-storage credentials through
  their providers and update Dokploy variables. Do not commit `.env` files.
- Better Auth secrets protect stored OAuth tokens. Changing the secret can
  make existing encrypted tokens unreadable; plan provider re-authentication
  before rotation.
- Keep `APP_DOMAIN` and `API_DOMAIN` on sibling subdomains and keep
  `FRONTEND_URL` / `BETTER_AUTH_URL` aligned with the actual deployment.
- The storage integration uses S3-compatible credentials issued by the storage
  provider. It does not require placing those credentials in the browser.
- The production frontend API base URL is baked into the bundle at build time;
  changing `API_DOMAIN` requires rebuilding the frontend image.

## Security and compliance boundaries

Client files are private, access-controlled in the API, stored as
`application/octet-stream`, and served through short-lived signed download
links. The application validates file size, filename, declared type, and
recognized signatures for supported formats. These controls do not replace
malware scanning or content sanitization.

The current application does not provide malware scanning, immutable audit
logs, configurable retention/deletion policies, customer-managed encryption
keys, formal disaster-recovery objectives, or a compliance certification.
Firms handling regulated records must assess and add required controls before
using the system for those records.
