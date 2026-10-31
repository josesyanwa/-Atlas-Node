# Atlas Node

**A multi-tenant client onboarding and document-collection portal**

Atlas Node helps small accounting and bookkeeping firms invite clients,
request business documents, and securely collect files through a separate
client portal. Firm staff manage clients and requests inside their organization;
clients sign in separately and can access only records linked to their client
account.

## The engineering problem

The product needed to support two distinct user relationships without
confusing them: internal firm members with organization roles, and external
clients who should only see their own document requests and files. It also
needed secure invitations and file delivery while remaining practical to
operate as a small full-stack SaaS.

## System design

- **Frontend:** React, TypeScript, Vite, TanStack Router, TanStack Query, and
  accessible UI primitives.
- **API:** NestJS with typed request/response contracts shared with the
  frontend, Zod validation, and explicit controller/service/repository
  boundaries.
- **Identity:** Better Auth manages verified email accounts and sessions.
  Organization membership is separate from the client-user relationship.
- **Tenancy:** PostgreSQL stores firm organizations, roles, clients, document
  requests, and file metadata. Firm endpoints scope reads and writes to the
  active organization and enforce roles server-side. Client queries scope
  access through the authenticated user's client association.
- **File storage:** File bytes are stored in a private S3-compatible Neon
  Object Storage bucket. The API authorizes each download before generating a
  short-lived signed URL; browser clients never receive storage credentials.
- **Email:** Resend sends client invitations. Invitation tokens are random,
  expire, and are stored as hashes rather than raw values.
- **Operations:** Dokploy Compose deploys the API, frontend, and Temporal
  workers. API and worker share a release image to avoid incompatible
  workflow-code versions. Structured logs carry request IDs; liveness and
  dependency readiness are separate checks.

## Important design choices

### Firm members and clients are separate

An accounting firm's staff access organization resources through owner,
admin, or viewer membership. An invited client is not added as a firm member;
the client is linked through a dedicated client-user association. This keeps
internal permissions from leaking into the client-facing portal.

### Authorization is enforced at the data boundary

The active organization header is not treated as proof of access. Server-side
guards resolve membership and role, while client record and file queries also
scope by organization or linked client identity. Tests exercise attempts to
read another firm's client list, another client's requests, and another
client's files.

### Uploads are private by default

The API limits upload size, checks filename and declared type against the
supported formats, and verifies recognizable file signatures before writing
to storage. Files are stored as generic binary content and delivered only
after an authorization check using short-lived signed URLs. The storage and
database writes are treated as a cross-service operation: if metadata
persistence fails after upload, the API attempts to remove the unreferenced
object and reports cleanup failures for investigation.

### Dependency health does not cause restart loops

The liveness probe checks only whether the API process is responsive. Readiness
also checks Postgres and Temporal and can report a dependency outage without
turning it into a container crash loop. Schema migrations are an explicit
operator step rather than an implicit deploy side effect.

## Reliability and verification

- Backend unit tests cover authorization decisions, invitation acceptance,
  upload validation, storage cleanup after a failed database write, and
  organization access rules.
- PostgreSQL-backed end-to-end tests exercise authentication, organization
  guards, invitations, and cross-tenant client portal access.
- Frontend production builds include TypeScript project checks.
- Invitation email failure is surfaced as a partial-success condition: the
  client and invitation may be saved even if the provider rejects delivery.
  Operators can resolve the provider issue and resend from the firm client
  list.
- Deployment, backup, restore, monitoring, and known incident recovery steps
  are documented in
  [the production operations runbook](../operations/production-readiness.md).

## Current scope and honest limitations

This is an MVP and an extensible product foundation, not a compliance
certification. It does not yet include malware scanning, durable email retries,
periodic orphan-file reconciliation, immutable audit logs, configurable
retention, billing, OCR, e-signatures, or a formal disaster-recovery SLA.
Those are identified follow-on controls rather than implied capabilities.

The most important next steps for regulated production use are independent
security assessment, malware scanning, audit and retention controls, tested
backup restoration for both database and object storage, and a durable
notification/outbox workflow.

## Profile summary

Designed and hardened a multi-tenant accounting client portal using React,
TypeScript, NestJS, PostgreSQL, Better Auth, Temporal, and private S3-compatible
object storage. Implemented organization-role authorization, separate
client identities, hashed invitations, scoped document access, upload
validation, signed downloads, operational health checks, and
PostgreSQL-backed isolation tests. Documented deployment, recovery, and
security limitations as part of the production-readiness work.
