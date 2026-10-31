import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  ClientDocumentRequest,
  ClientInvitePreview,
  ClientPortalDocumentDownload,
  ClientRecord,
  CreateClientRequest,
  CreateDocumentRequest,
} from '@atlas-node/api-interfaces';
import { KYSELY_DB } from '../databases/kysely';
import type { AppDatabase } from '../databases/kysely';
import { Inject } from '@nestjs/common';
import { generateInviteToken, hashInviteToken } from '../organizations/tokens';
import { ClientDocumentStorageService } from './client-document-storage.service';
import { ClientPortalMailer } from './client-portal.mailer';
import { ClientPortalRepository } from './client-portal.repository';

const CLIENT_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Map<string, string[]>([
  ['application/pdf', ['.pdf']],
  ['image/jpeg', ['.jpg', '.jpeg']],
  ['image/png', ['.png']],
  ['text/csv', ['.csv']],
  [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ['.xlsx'],
  ],
  [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ['.docx'],
  ],
]);

type Caller = { userId: string; email: string; emailVerified: boolean };

function isoDate(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

function serializeClient(row: {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  companyName: string | null;
  portalStatus: 'invited' | 'active';
  createdAt: Date;
}): ClientRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    email: row.email,
    companyName: row.companyName,
    portalStatus: row.portalStatus,
    createdAt: isoDate(row.createdAt),
  };
}

@Injectable()
export class ClientPortalService {
  private readonly logger = new Logger(ClientPortalService.name);

  constructor(
    private readonly repository: ClientPortalRepository,
    private readonly mailer: ClientPortalMailer,
    private readonly storage: ClientDocumentStorageService,
    private readonly config: ConfigService,
    @Inject(KYSELY_DB) private readonly db: AppDatabase,
  ) {}

  private buildInviteUrl(token: string): string {
    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL');
    const url = new URL('/client-portal/invite', frontendUrl);
    url.searchParams.set('token', token);
    return url.toString();
  }

  private async issueInvite(client: {
    id: string;
    name: string;
    email: string;
    organizationId: string;
  }): Promise<void> {
    const existingContact = await this.db
      .selectFrom('clientUsers')
      .select('userId')
      .where('clientId', '=', client.id)
      .executeTakeFirst();
    if (existingContact) {
      throw new BadRequestException('This client already has portal access.');
    }

    const rawToken = generateInviteToken();
    const tokenHash = hashInviteToken(rawToken);
    const expiresAt = new Date(Date.now() + CLIENT_INVITE_TTL_MS);
    const organization = await this.db
      .selectFrom('organizations')
      .select(['name', 'deactivatedAt'])
      .where('id', '=', client.organizationId)
      .executeTakeFirst();
    if (!organization) throw new NotFoundException('Organization not found.');
    if (organization.deactivatedAt) {
      throw new ForbiddenException('This organization is currently inactive.');
    }

    await this.db.transaction().execute(async (tx) => {
      await this.repository.expirePendingInvites(client.id, tx);
      await this.repository.createInvite(
        { clientId: client.id, tokenHash, expiresAt },
        tx,
      );
    });

    await this.mailer.sendInvite({
      to: client.email,
      clientName: client.name,
      organizationName: organization.name,
      inviteUrl: this.buildInviteUrl(rawToken),
    });
  }

  async createClient(
    organizationId: string,
    creatorUserId: string,
    input: CreateClientRequest,
  ): Promise<ClientRecord> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.repository.findClientByEmail(
      organizationId,
      email,
    );
    if (existing) {
      throw new BadRequestException(
        'A client with this email already exists in this organization.',
      );
    }
    const client = await this.repository.createClient({
      organizationId,
      name: input.name.trim(),
      email,
      companyName: input.companyName?.trim() || null,
      createdByUserId: creatorUserId,
    });
    await this.issueInvite(client);
    return serializeClient({ ...client, portalStatus: 'invited' });
  }

  async listClients(organizationId: string): Promise<ClientRecord[]> {
    const rows = await this.repository.listClients(organizationId);
    return rows.map(serializeClient);
  }

  async resendClientInvite(
    organizationId: string,
    clientId: string,
  ): Promise<void> {
    const client = await this.repository.getClient(organizationId, clientId);
    if (!client) throw new NotFoundException('Client not found.');
    await this.issueInvite(client);
  }

  async createDocumentRequest(
    organizationId: string,
    requesterUserId: string,
    clientId: string,
    input: CreateDocumentRequest,
  ): Promise<ClientDocumentRequest> {
    const client = await this.repository.getClient(organizationId, clientId);
    if (!client) throw new NotFoundException('Client not found.');
    const row = await this.repository.createRequest({
      organizationId,
      clientId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      dueDate: input.dueDate ?? null,
      requestedByUserId: requesterUserId,
    });
    return {
      id: row.id,
      clientId: row.clientId,
      clientName: client.name,
      title: row.title,
      description: row.description,
      dueDate: row.dueDate,
      status: row.status,
      createdAt: isoDate(row.createdAt),
      documents: [],
    };
  }

  private async addDocuments(
    rows: Array<{
      id: string;
      organizationId: string;
      clientId: string;
      clientName?: string;
      title: string;
      description: string | null;
      dueDate: string | null;
      status: 'requested' | 'received';
      createdAt: Date;
      organizationName?: string;
    }>,
  ): Promise<ClientDocumentRequest[]> {
    const documents = await this.repository.listDocumentsByRequestIds(
      rows.map((row) => row.id),
    );
    const byRequest = new Map<string, typeof documents>();
    for (const document of documents) {
      const current = byRequest.get(document.requestId) ?? [];
      current.push(document);
      byRequest.set(document.requestId, current);
    }
    return rows.map((row) => ({
      id: row.id,
      clientId: row.clientId,
      clientName: row.clientName,
      organizationName: row.organizationName,
      title: row.title,
      description: row.description,
      dueDate: row.dueDate,
      status: row.status,
      createdAt: isoDate(row.createdAt),
      documents: (byRequest.get(row.id) ?? []).map((document) => ({
        id: document.id,
        originalFilename: document.originalFilename,
        contentType: document.contentType,
        sizeBytes: Number(document.sizeBytes),
        createdAt: isoDate(document.createdAt),
      })),
    }));
  }

  async listOrganizationRequests(
    organizationId: string,
    clientId?: string,
  ): Promise<ClientDocumentRequest[]> {
    return this.addDocuments(
      await this.repository.listOrganizationRequests(organizationId, clientId),
    );
  }

  async listPortalRequests(userId: string): Promise<ClientDocumentRequest[]> {
    return this.addDocuments(await this.repository.listPortalRequests(userId));
  }

  async previewInvite(token: string): Promise<ClientInvitePreview> {
    const invite = await this.repository.findInviteByTokenHash(
      hashInviteToken(token),
    );
    if (!invite) throw new NotFoundException('Invitation not found.');
    if (invite.status !== 'pending' || invite.expiresAt <= new Date()) {
      throw new BadRequestException('This invitation is no longer available.');
    }
    return {
      organizationName: invite.organizationName,
      clientName: invite.clientName,
      invitedEmail: invite.clientEmail,
      expiresAt: isoDate(invite.expiresAt),
      status: invite.status,
    };
  }

  async acceptInvite(token: string, caller: Caller): Promise<void> {
    if (!caller.emailVerified) {
      throw new ForbiddenException(
        'Verify your email before accepting this invite.',
      );
    }
    const invite = await this.repository.findInviteByTokenHash(
      hashInviteToken(token),
    );
    if (!invite) throw new NotFoundException('Invitation not found.');
    if (invite.clientEmail.toLowerCase() !== caller.email.toLowerCase()) {
      throw new ForbiddenException(
        'Sign in with the email address that received this invitation.',
      );
    }
    if (invite.status !== 'pending' || invite.expiresAt <= new Date()) {
      throw new BadRequestException('This invitation is no longer available.');
    }
    const organization = await this.db
      .selectFrom('organizations')
      .select('deactivatedAt')
      .where('id', '=', invite.organizationId)
      .executeTakeFirst();
    if (organization?.deactivatedAt) {
      throw new ForbiddenException('This organization is currently inactive.');
    }

    const accepted = await this.db
      .transaction()
      .execute((tx) =>
        this.repository.acceptInvite(
          invite.inviteId,
          invite.clientId,
          caller.userId,
          tx,
        ),
      );
    if (!accepted) {
      throw new BadRequestException('This invitation has already been used.');
    }
  }

  async uploadDocument(input: {
    requestId: string;
    userId: string;
    filename: string;
    contentType: string;
    body: Buffer;
  }) {
    const request = await this.repository.canClientAccessRequest(
      input.userId,
      input.requestId,
    );
    if (!request) {
      throw new NotFoundException('Document request not found.');
    }
    if (request.deactivatedAt) {
      throw new ForbiddenException(
        'This organization is currently inactive; document uploads are disabled.',
      );
    }
    if (input.body.length === 0 || input.body.length > MAX_FILE_BYTES) {
      throw new BadRequestException('Files must be between 1 byte and 10 MiB.');
    }

    const filename = Array.from(input.filename)
      .filter((character) => {
        const code = character.charCodeAt(0);
        return code >= 32 && code !== 127;
      })
      .join('')
      .trim();
    if (!filename || filename.length > 255) {
      throw new BadRequestException(
        'Provide a valid filename up to 255 characters.',
      );
    }
    const contentType = input.contentType.toLowerCase().split(';')[0].trim();
    const allowedExtensions = ALLOWED_FILE_TYPES.get(contentType);
    if (
      !allowedExtensions ||
      !allowedExtensions.includes(extname(filename).toLowerCase())
    ) {
      throw new BadRequestException(
        'Upload a PDF, JPG, PNG, CSV, XLSX, or DOCX file.',
      );
    }

    const objectKey = `client-documents/${input.requestId}/${randomUUID()}`;
    await this.storage.upload({
      key: objectKey,
      body: input.body,
      contentType: 'application/octet-stream',
    });
    try {
      const document = await this.repository.addDocumentAndMarkReceived({
        requestId: input.requestId,
        objectKey,
        originalFilename: filename,
        contentType,
        sizeBytes: input.body.length,
        uploadedByUserId: input.userId,
      });
      return {
        id: document.id,
        originalFilename: document.originalFilename,
        contentType: document.contentType,
        sizeBytes: Number(document.sizeBytes),
        createdAt: isoDate(document.createdAt),
      };
    } catch (error) {
      try {
        await this.storage.delete(objectKey);
      } catch (cleanupError) {
        this.logger.error(
          'Failed to clean up an object after its database record could not be saved.',
          cleanupError instanceof Error ? cleanupError.stack : undefined,
        );
      }
      throw error;
    }
  }

  async getClientDownload(
    userId: string,
    documentId: string,
  ): Promise<ClientPortalDocumentDownload> {
    const document = await this.repository.getDocumentForClient(
      userId,
      documentId,
    );
    if (!document) throw new NotFoundException('Document not found.');
    return this.storage.createDownloadUrl(
      document.objectKey,
      document.originalFilename,
    );
  }

  async getFirmDownload(
    organizationId: string,
    documentId: string,
  ): Promise<ClientPortalDocumentDownload> {
    const document = await this.repository.getDocumentForOrganization(
      organizationId,
      documentId,
    );
    if (!document) throw new NotFoundException('Document not found.');
    return this.storage.createDownloadUrl(
      document.objectKey,
      document.originalFilename,
    );
  }
}
