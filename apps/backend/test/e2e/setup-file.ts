import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { inject, vi } from 'vitest';

// Must run before any import of src/app.module. ConfigModule.forRoot reads
// apps/backend/.env from cwd; without this, tests would boot against the dev
// database on port 11753 and mutate it. dotenv never overwrites an
// already-set key, so these values win and the dev .env can only fill gaps.
loadEnv({ path: fileURLToPath(new URL('../../.env.test', import.meta.url)) });

// Set before any import of src/app.module: the Temporal client and its
// background bootstrap use this address, so e2e tests connect to the dev
// server rather than a mocked client.
process.env.TEMPORAL_ADDRESS = inject('temporalAddress');

// A module mock, not a DI override: `new Resend(...)` is called directly at
// three non-injectable sites — auth/auth.config.ts, auth/email-otp.service.ts,
// and organizations/services/invite-mailer.ts. Only a module-level mock reaches
// all of them, and it needs no edit when a fourth site appears.
vi.mock('resend', async () => {
  const { ResendMock } = await import('./harness/resend-mock');
  return { Resend: ResendMock };
});
