import { Inject, Injectable } from '@nestjs/common';
import { KYSELY_DB } from '../databases/kysely';
import type { AppDatabase } from '../databases/kysely';

type DbExecutor = AppDatabase;

@Injectable()
export class ClientPortalRepository {
  constructor(@Inject(KYSELY_DB) private readonly db: AppDatabase) {}

  private exec(tx?: DbExecutor): DbExecutor {
    return tx ?? this.db;
  }

  async listClients(organizationId: string) {
    const clients = await this.db
      .selectFrom('clients')
      .selectAll()
      .where('organizationId', '=', organizationId)
      .orderBy('createdAt', 'desc')
      .execute();
    if (clients.length === 0) return [];

    const linked = await this.db
      .selectFrom('clientUsers')
      .select('clientId')
      .where(
        'clientId',
        'in',
        clients.map((client) => client.id),
      )
      .distinct()
      .execute();
    const activeClientIds = new Set(linked.map((entry) => entry.clientId));
    return clients.map((client) => ({
      ...client,
      portalStatus: activeClientIds.has(client.id)
        ? ('active' as const)
        : ('invited' as const),
    }));
  }

  async getClient(organizationId: string, clientId: string, tx?: DbExecutor) {
    return (
      (await this.exec(tx)
        .selectFrom('clients')
        .selectAll()
        .where('organizationId', '=', organizationId)
        .where('id', '=', clientId)
        .executeTakeFirst()) ?? null
    );
  }

  async findClientByEmail(organizationId: string, email: string) {
    return (
      (await this.db
        .selectFrom('clients')
        .selectAll()
        .where('organizationId', '=', organizationId)
        .where('email', '=', email)
        .executeTakeFirst()) ?? null
    );
  }

  async createClient(
    input: {
      organizationId: string;
      name: string;
      email: string;
      companyName: string | null;
      createdByUserId: string;
    },
    tx?: DbExecutor,
  ) {
    return this.exec(tx)
      .insertInto('clients')
      .values(input)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async createInvite(
    input: { clientId: string; tokenHash: string; expiresAt: Date },
    tx?: DbExecutor,
  ) {
    return this.exec(tx)
      .insertInto('clientPortalInvites')
      .values(input)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async expirePendingInvites(clientId: string, tx?: DbExecutor): Promise<void> {
    await this.exec(tx)
      .updateTable('clientPortalInvites')
      .set({ status: 'expired' })
      .where('clientId', '=', clientId)
      .where('status', '=', 'pending')
      .execute();
  }

  async findInviteByTokenHash(tokenHash: string) {
    return (
      (await this.db
        .selectFrom('clientPortalInvites as invite')
        .innerJoin('clients as client', 'client.id', 'invite.clientId')
        .innerJoin(
          'organizations as organization',
          'organization.id',
          'client.organizationId',
        )
        .select([
          'invite.id as inviteId',
          'invite.clientId',
          'invite.status',
          'invite.expiresAt',
          'invite.tokenHash',
          'client.name as clientName',
          'client.email as clientEmail',
          'client.organizationId',
          'organization.name as organizationName',
        ])
        .where('invite.tokenHash', '=', tokenHash)
        .executeTakeFirst()) ?? null
    );
  }

  async listPendingInvitesByEmail(email: string) {
    return this.db
      .selectFrom('clientPortalInvites as invite')
      .innerJoin('clients as client', 'client.id', 'invite.clientId')
      .innerJoin(
        'organizations as organization',
        'organization.id',
        'client.organizationId',
      )
      .select([
        'invite.id',
        'invite.expiresAt',
        'client.name as clientName',
        'client.email as invitedEmail',
        'organization.name as organizationName',
      ])
      .where('client.email', '=', email.trim().toLowerCase())
      .where('invite.status', '=', 'pending')
      .where('invite.expiresAt', '>', new Date())
      .where('organization.deactivatedAt', 'is', null)
      .orderBy('invite.createdAt', 'desc')
      .execute();
  }

  async hasClientAccess(userId: string): Promise<boolean> {
    const clientUser = await this.db
      .selectFrom('clientUsers')
      .select('clientId')
      .where('userId', '=', userId)
      .executeTakeFirst();
    return !!clientUser;
  }

  async findPendingInviteByIdAndEmail(inviteId: string, email: string) {
    return (
      (await this.db
        .selectFrom('clientPortalInvites as invite')
        .innerJoin('clients as client', 'client.id', 'invite.clientId')
        .innerJoin(
          'organizations as organization',
          'organization.id',
          'client.organizationId',
        )
        .select([
          'invite.id as inviteId',
          'invite.clientId',
          'invite.status',
          'invite.expiresAt',
          'invite.tokenHash',
          'client.name as clientName',
          'client.email as clientEmail',
          'client.organizationId',
          'organization.name as organizationName',
          'organization.deactivatedAt',
        ])
        .where('invite.id', '=', inviteId)
        .where('client.email', '=', email.trim().toLowerCase())
        .executeTakeFirst()) ?? null
    );
  }

  async acceptInvite(
    inviteId: string,
    clientId: string,
    userId: string,
    tx: DbExecutor,
  ): Promise<boolean> {
    const accepted = await tx
      .updateTable('clientPortalInvites')
      .set({
        status: 'accepted',
        acceptedByUserId: userId,
        acceptedAt: new Date(),
      })
      .where('id', '=', inviteId)
      .where('status', '=', 'pending')
      .where('expiresAt', '>', new Date())
      .returning('id')
      .executeTakeFirst();
    if (!accepted) return false;

    await tx
      .insertInto('clientUsers')
      .values({ clientId, userId })
      .onConflict((conflict) =>
        conflict.columns(['clientId', 'userId']).doNothing(),
      )
      .execute();
    return true;
  }

  async createRequest(
    input: {
      organizationId: string;
      clientId: string;
      title: string;
      description: string | null;
      dueDate: string | null;
      requestedByUserId: string;
    },
    tx?: DbExecutor,
  ) {
    return this.exec(tx)
      .insertInto('documentRequests')
      .values(input)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async listOrganizationRequests(organizationId: string, clientId?: string) {
    let query = this.db
      .selectFrom('documentRequests as request')
      .innerJoin('clients as client', 'client.id', 'request.clientId')
      .select([
        'request.id',
        'request.organizationId',
        'request.clientId',
        'request.title',
        'request.description',
        'request.dueDate',
        'request.status',
        'request.createdAt',
        'client.name as clientName',
      ])
      .where('request.organizationId', '=', organizationId);
    if (clientId) {
      query = query.where('request.clientId', '=', clientId);
    }
    return query.orderBy('request.createdAt', 'desc').execute();
  }

  async listPortalRequests(userId: string) {
    return this.db
      .selectFrom('documentRequests as request')
      .innerJoin('clients as client', 'client.id', 'request.clientId')
      .innerJoin(
        'clientUsers as clientUser',
        'clientUser.clientId',
        'client.id',
      )
      .innerJoin(
        'organizations as organization',
        'organization.id',
        'request.organizationId',
      )
      .select([
        'request.id',
        'request.organizationId',
        'request.clientId',
        'request.title',
        'request.description',
        'request.dueDate',
        'request.status',
        'request.createdAt',
        'organization.name as organizationName',
      ])
      .where('clientUser.userId', '=', userId)
      .orderBy('request.createdAt', 'desc')
      .execute();
  }

  async listDocumentsByRequestIds(requestIds: string[]) {
    if (requestIds.length === 0) return [];
    return this.db
      .selectFrom('clientDocuments')
      .selectAll()
      .where('requestId', 'in', requestIds)
      .orderBy('createdAt', 'desc')
      .execute();
  }

  async canClientAccessRequest(
    userId: string,
    requestId: string,
  ): Promise<{ id: string; deactivatedAt: Date | null } | null> {
    const row = await this.db
      .selectFrom('documentRequests as request')
      .innerJoin(
        'clientUsers as clientUser',
        'clientUser.clientId',
        'request.clientId',
      )
      .innerJoin(
        'organizations as organization',
        'organization.id',
        'request.organizationId',
      )
      .select(['request.id', 'organization.deactivatedAt'])
      .where('request.id', '=', requestId)
      .where('clientUser.userId', '=', userId)
      .executeTakeFirst();
    return row ?? null;
  }

  async addDocumentAndMarkReceived(input: {
    requestId: string;
    objectKey: string;
    originalFilename: string;
    contentType: string;
    sizeBytes: number;
    uploadedByUserId: string;
  }) {
    return this.db.transaction().execute(async (tx) => {
      const document = await tx
        .insertInto('clientDocuments')
        .values(input)
        .returningAll()
        .executeTakeFirstOrThrow();
      await tx
        .updateTable('documentRequests')
        .set({ status: 'received', updatedAt: new Date() })
        .where('id', '=', input.requestId)
        .execute();
      return document;
    });
  }

  async getDocumentForOrganization(organizationId: string, documentId: string) {
    return (
      (await this.db
        .selectFrom('clientDocuments as document')
        .innerJoin(
          'documentRequests as request',
          'request.id',
          'document.requestId',
        )
        .select([
          'document.id',
          'document.objectKey',
          'document.originalFilename',
          'request.organizationId',
        ])
        .where('document.id', '=', documentId)
        .where('request.organizationId', '=', organizationId)
        .executeTakeFirst()) ?? null
    );
  }

  async getDocumentForClient(userId: string, documentId: string) {
    return (
      (await this.db
        .selectFrom('clientDocuments as document')
        .innerJoin(
          'documentRequests as request',
          'request.id',
          'document.requestId',
        )
        .innerJoin(
          'clientUsers as clientUser',
          'clientUser.clientId',
          'request.clientId',
        )
        .select([
          'document.id',
          'document.objectKey',
          'document.originalFilename',
        ])
        .where('document.id', '=', documentId)
        .where('clientUser.userId', '=', userId)
        .executeTakeFirst()) ?? null
    );
  }
}
