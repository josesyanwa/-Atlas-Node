import type { Kysely } from 'kysely';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '../../../src/databases/kysely/database.types';
import { createFileDatabase } from '../harness/database';
import { createTestApp, type TestApp } from '../harness/create-test-app';
import { createVerifiedUser } from '../harness/auth-client';
import { seedMember } from '../harness/fixtures';

const PASSWORD = 'correct-horse-battery-staple';

describe('organizations', () => {
  let testApp: TestApp;
  let db: Kysely<Database>;
  let closeDb: () => Promise<void>;
  let ownerCookie: string;
  let ownerId: string;

  async function getOwnerOrganizationId(): Promise<string> {
    const mine = await request(testApp.server)
      .get('/api/organizations/me')
      .set('Cookie', ownerCookie);
    if (mine.body.data?.[0]?.organization?.id) {
      return mine.body.data[0].organization.id as string;
    }

    const created = await request(testApp.server)
      .post('/api/organizations')
      .set('Cookie', ownerCookie)
      .send({ name: 'Owner Dashboard Organization' });
    expect(created.status).toBe(201);
    return created.body.data.id as string;
  }

  beforeAll(async () => {
    ({ db, close: closeDb } = await createFileDatabase());
    testApp = await createTestApp();
    ({ cookie: ownerCookie, userId: ownerId } = await createVerifiedUser(
      testApp.server,
      db,
      { email: 'org-owner@example.com', password: PASSWORD, name: 'Org Owner' },
    ));
  });

  afterAll(async () => {
    await testApp.close();
    await closeDb();
  });

  it('rejects creation without a session', async () => {
    const res = await request(testApp.server)
      .post('/api/organizations')
      .send({ name: 'No Session Inc' });
    expect(res.status).toBe(401);
  });

  it('creates an organization and an owner membership', async () => {
    const res = await request(testApp.server)
      .post('/api/organizations')
      .set('Cookie', ownerCookie)
      .send({ name: 'Acme Rockets' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Acme Rockets');
    // buildSlug() appends a random 6-hex-char suffix.
    expect(res.body.data.slug).toMatch(/^acme-rockets-[0-9a-f]{6}$/);
    expect(res.body.data.ownerId).toBe(ownerId);

    const membership = await db
      .selectFrom('organizationMembers')
      .select('role')
      .where('organizationId', '=', res.body.data.id as string)
      .where('userId', '=', ownerId)
      .executeTakeFirst();
    expect(membership?.role).toBe('owner');
  });

  it('refuses a second organization for the same owner', async () => {
    // organizations_owner_id_unique: one owned organization per user.
    const res = await request(testApp.server)
      .post('/api/organizations')
      .set('Cookie', ownerCookie)
      .send({ name: 'Second Venture' });
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: 'ORG_OWNER_CONFLICT' });
  });

  it('rejects an invalid body with the validation envelope', async () => {
    const other = await createVerifiedUser(testApp.server, db, {
      email: 'invalid-body@example.com',
      password: PASSWORD,
      name: 'Invalid Body',
    });
    const res = await request(testApp.server)
      .post('/api/organizations')
      .set('Cookie', other.cookie)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('lists the organization under /me', async () => {
    const res = await request(testApp.server)
      .get('/api/organizations/me')
      .set('Cookie', ownerCookie);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    // MyOrganization is { organization, role }, not a flat Organization.
    expect(res.body.data[0].organization.name).toBe('Acme Rockets');
    expect(res.body.data[0].role).toBe('owner');
  });

  it('returns the current organization with the caller role', async () => {
    const mine = await request(testApp.server)
      .get('/api/organizations/me')
      .set('Cookie', ownerCookie);
    const orgId = mine.body.data[0].organization.id as string;

    const res = await request(testApp.server)
      .get('/api/organizations/current')
      .set('Cookie', ownerCookie)
      .set('x-organization-id', orgId);

    expect(res.status).toBe(200);
    expect(res.body.data.organization.id).toBe(orgId);
    expect(res.body.data.role).toBe('owner');
  });

  it('stores the subscription plan, updates its quota, and gates enterprise exports', async () => {
    const orgId = await getOwnerOrganizationId();
    const headers = { Cookie: ownerCookie, 'x-organization-id': orgId };

    const initial = await request(testApp.server)
      .get('/api/organizations/current')
      .set(headers);
    expect(initial.body.data.organization).toMatchObject({
      activeSubscriptionPlan: 'free',
      usageQuotaBytes: 5 * 1024 ** 3,
    });

    const freeExport = await request(testApp.server)
      .post('/api/organizations/current/enterprise/export')
      .set(headers);
    expect(freeExport.status).toBe(403);
    expect(freeExport.body.code).toBe('SUBSCRIPTION_UPGRADE_REQUIRED');

    const update = await request(testApp.server)
      .patch('/api/organizations/current/subscription')
      .set(headers)
      .send({ activeSubscriptionPlan: 'pro' });
    expect(update.status).toBe(200);
    expect(update.body.data).toMatchObject({
      activeSubscriptionPlan: 'pro',
      usageQuotaBytes: 100 * 1024 ** 3,
    });

    const paidExport = await request(testApp.server)
      .post('/api/organizations/current/enterprise/export')
      .set(headers);
    expect(paidExport.status).toBe(201);
  });

  it('lets admins manage viewer roles but reserves admin roles for owners', async () => {
    const orgId = await getOwnerOrganizationId();
    const admin = await createVerifiedUser(testApp.server, db, {
      email: 'member-role-admin@example.com',
      password: PASSWORD,
      name: 'Member Role Admin',
    });
    const viewer = await createVerifiedUser(testApp.server, db, {
      email: 'member-role-viewer@example.com',
      password: PASSWORD,
      name: 'Member Role Viewer',
    });
    await seedMember(db, {
      organizationId: orgId,
      userId: admin.userId,
      role: 'admin',
    });
    await seedMember(db, {
      organizationId: orgId,
      userId: viewer.userId,
      role: 'viewer',
    });

    const memberList = await request(testApp.server)
      .get('/api/organizations/current/members')
      .set('Cookie', ownerCookie)
      .set('x-organization-id', orgId);
    const adminMemberId = memberList.body.data.find(
      (member: { userId: string }) => member.userId === admin.userId,
    ).id as string;
    const viewerMemberId = memberList.body.data.find(
      (member: { userId: string }) => member.userId === viewer.userId,
    ).id as string;

    const promoteViewer = await request(testApp.server)
      .patch(`/api/organizations/current/members/${viewerMemberId}`)
      .set('Cookie', admin.cookie)
      .set('x-organization-id', orgId)
      .send({ role: 'admin' });
    expect(promoteViewer.status).toBe(200);
    expect(promoteViewer.body.data.role).toBe('admin');

    const changeAdminRole = await request(testApp.server)
      .patch(`/api/organizations/current/members/${adminMemberId}`)
      .set('Cookie', admin.cookie)
      .set('x-organization-id', orgId)
      .send({ role: 'viewer' });
    expect(changeAdminRole.status).toBe(403);

    const ownerDemotesAdmin = await request(testApp.server)
      .patch(`/api/organizations/current/members/${viewerMemberId}`)
      .set('Cookie', ownerCookie)
      .set('x-organization-id', orgId)
      .send({ role: 'viewer' });
    expect(ownerDemotesAdmin.status).toBe(200);
  });

  it('refuses a slug that another organization already uses', async () => {
    // ORG_SLUG_CONFLICT is unreachable via POST: buildSlug() appends a random
    // suffix and retries five times on collision. It is only reachable by
    // PATCHing an explicit slug.
    const second = await createVerifiedUser(testApp.server, db, {
      email: 'second-owner@example.com',
      password: PASSWORD,
      name: 'Second Owner',
    });
    const created = await request(testApp.server)
      .post('/api/organizations')
      .set('Cookie', second.cookie)
      .send({ name: 'Rival Corp' });
    expect(created.status).toBe(201);

    const mine = await request(testApp.server)
      .get('/api/organizations/me')
      .set('Cookie', ownerCookie);
    const ownerOrgSlug = mine.body.data[0].organization.slug as string;

    const res = await request(testApp.server)
      .patch('/api/organizations/current')
      .set('Cookie', second.cookie)
      .set('x-organization-id', created.body.data.id)
      .send({ slug: ownerOrgSlug });

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: 'ORG_SLUG_CONFLICT' });
  });

  it('answers concurrent creates by one user with 201 and 409, never 500', async () => {
    const racer = await createVerifiedUser(testApp.server, db, {
      email: 'create-racer@example.com',
      password: PASSWORD,
      name: 'Create Racer',
    });
    const statuses = await Promise.all(
      ['Race One', 'Race Two'].map((name) =>
        request(testApp.server)
          .post('/api/organizations')
          .set('Cookie', racer.cookie)
          .send({ name })
          .then((r) => r.status),
      ),
    );
    expect(statuses.sort()).toEqual([201, 409]);
  });

  it('allows only one concurrent ownership transfer and denies the former owner', async () => {
    const owner = await createVerifiedUser(testApp.server, db, {
      email: 'transfer-owner@example.com',
      password: PASSWORD,
      name: 'Transfer Owner',
    });
    const created = await request(testApp.server)
      .post('/api/organizations')
      .set('Cookie', owner.cookie)
      .send({ name: 'Contested Inc' });
    const orgId = created.body.data.id as string;

    const admins = await Promise.all(
      ['transfer-a@example.com', 'transfer-b@example.com'].map((email) =>
        createVerifiedUser(testApp.server, db, {
          email,
          password: PASSWORD,
          name: email,
        }),
      ),
    );
    for (const admin of admins) {
      await seedMember(db, {
        organizationId: orgId,
        userId: admin.userId,
        role: 'admin',
      });
    }

    const statuses = await Promise.all(
      admins.map((admin) =>
        request(testApp.server)
          .post('/api/organizations/current/transfer-ownership')
          .set('Cookie', owner.cookie)
          .set('x-organization-id', orgId)
          .send({ newOwnerUserId: admin.userId })
          .then((r) => r.status),
      ),
    );
    // The competing request may hit the owner guard after commit (403) or
    // reach the service with the former owner's stale role (409).
    expect(statuses.filter((status) => status === 201)).toHaveLength(1);
    expect(
      statuses.filter((status) => status === 403 || status === 409),
    ).toHaveLength(1);

    const owners = await db
      .selectFrom('organizationMembers')
      .select('userId')
      .where('organizationId', '=', orgId)
      .where('role', '=', 'owner')
      .execute();
    const org = await db
      .selectFrom('organizations')
      .select('ownerId')
      .where('id', '=', orgId)
      .executeTakeFirstOrThrow();
    expect(owners).toEqual([{ userId: org.ownerId }]);
  });
});
