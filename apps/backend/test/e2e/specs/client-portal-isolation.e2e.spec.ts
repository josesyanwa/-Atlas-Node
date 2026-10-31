import type { Kysely } from 'kysely';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../../../src/databases/kysely/database.types';
import { createFileDatabase } from '../harness/database';
import { createTestApp, type TestApp } from '../harness/create-test-app';
import { createVerifiedUser } from '../harness/auth-client';

const PASSWORD = 'correct-horse-battery-staple';

describe('client portal tenant isolation', () => {
  let testApp: TestApp;
  let db: Kysely<Database>;
  let closeDb: () => Promise<void>;
  let firmACookie: string;
  let firmAId: string;
  let firmBCookie: string;
  let firmBId: string;
  let clientACookie: string;
  let clientAId: string;
  let clientBId: string;
  let requestAId: string;
  let requestBId: string;
  let documentBId: string;

  beforeAll(async () => {
    ({ db, close: closeDb } = await createFileDatabase());
    testApp = await createTestApp();

    const firmA = await createVerifiedUser(testApp.server, db, {
      email: 'portal-firm-a@example.com',
      password: PASSWORD,
      name: 'Firm A',
    });
    firmACookie = firmA.cookie;
    firmAId = (
      await request(testApp.server)
        .post('/api/organizations')
        .set('Cookie', firmACookie)
        .send({ name: 'Portal Firm A' })
    ).body.data.id as string;

    const firmB = await createVerifiedUser(testApp.server, db, {
      email: 'portal-firm-b@example.com',
      password: PASSWORD,
      name: 'Firm B',
    });
    firmBCookie = firmB.cookie;
    firmBId = (
      await request(testApp.server)
        .post('/api/organizations')
        .set('Cookie', firmBCookie)
        .send({ name: 'Portal Firm B' })
    ).body.data.id as string;

    const clientA = await createVerifiedUser(testApp.server, db, {
      email: 'portal-client-a@example.com',
      password: PASSWORD,
      name: 'Client A',
    });
    clientACookie = clientA.cookie;
    clientAId = clientA.userId;

    const clientB = await createVerifiedUser(testApp.server, db, {
      email: 'portal-client-b@example.com',
      password: PASSWORD,
      name: 'Client B',
    });
    clientBId = clientB.userId;

    const clientARecord = await db
      .insertInto('clients')
      .values({
        organizationId: firmAId,
        name: 'Client A',
        email: 'portal-client-a@example.com',
        companyName: null,
        createdByUserId: firmA.userId,
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    const clientBRecord = await db
      .insertInto('clients')
      .values({
        organizationId: firmBId,
        name: 'Client B',
        email: 'portal-client-b@example.com',
        companyName: null,
        createdByUserId: firmB.userId,
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    await db
      .insertInto('clientUsers')
      .values([
        { clientId: clientARecord.id, userId: clientAId },
        { clientId: clientBRecord.id, userId: clientBId },
      ])
      .execute();

    const documentRequestA = await db
      .insertInto('documentRequests')
      .values({
        organizationId: firmAId,
        clientId: clientARecord.id,
        title: 'Client A tax records',
        description: null,
        dueDate: null,
        requestedByUserId: firmA.userId,
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    requestAId = documentRequestA.id;
    const documentRequestB = await db
      .insertInto('documentRequests')
      .values({
        organizationId: firmBId,
        clientId: clientBRecord.id,
        title: 'Client B tax records',
        description: null,
        dueDate: null,
        requestedByUserId: firmB.userId,
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    requestBId = documentRequestB.id;

    const document = await db
      .insertInto('clientDocuments')
      .values({
        requestId: requestBId,
        objectKey: `client-documents/${requestBId}/private-file`,
        originalFilename: 'tax-records.pdf',
        contentType: 'application/pdf',
        sizeBytes: 9,
        uploadedByUserId: clientBId,
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    documentBId = document.id;
  });

  afterAll(async () => {
    await testApp.close();
    await closeDb();
  });

  it('only lists document requests linked to the signed-in client', async () => {
    const response = await request(testApp.server)
      .get('/api/client-portal/requests')
      .set('Cookie', clientACookie);

    expect(response.status).toBe(200);
    expect(response.body.data.map((entry: { id: string }) => entry.id)).toEqual(
      [requestAId],
    );
    expect(response.body.data[0].title).toBe('Client A tax records');
  });

  it('does not allow a client to download another client’s file', async () => {
    const response = await request(testApp.server)
      .get(`/api/client-portal/documents/${documentBId}/download`)
      .set('Cookie', clientACookie);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('does not allow a firm to download another firm’s client file', async () => {
    const response = await request(testApp.server)
      .get(
        `/api/organizations/current/client-documents/${documentBId}/download`,
      )
      .set('Cookie', firmACookie)
      .set('x-organization-id', firmAId);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('does not list another firm’s clients through the current organization API', async () => {
    const response = await request(testApp.server)
      .get('/api/organizations/current/clients')
      .set('Cookie', firmACookie)
      .set('x-organization-id', firmAId);

    expect(response.status).toBe(200);
    expect(
      response.body.data.map((entry: { email: string }) => entry.email),
    ).toEqual(['portal-client-a@example.com']);
  });

  it('confirms that client portal access is attached to the signed-in user', async () => {
    const allowed = await request(testApp.server)
      .get('/api/client-portal/access')
      .set('Cookie', clientACookie);
    const denied = await request(testApp.server)
      .get('/api/client-portal/access')
      .set('Cookie', firmBCookie);

    expect(allowed.status).toBe(200);
    expect(allowed.body.data.hasAccess).toBe(true);
    expect(denied.status).toBe(200);
    expect(denied.body.data.hasAccess).toBe(false);
  });
});
