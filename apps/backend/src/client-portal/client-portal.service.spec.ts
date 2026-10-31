import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ClientPortalService } from './client-portal.service';

describe('ClientPortalService', () => {
  const requestId = 'c2fb2509-11f3-4f4a-af67-6fe7dd5981a5';
  const documentId = '80c05e4a-0fed-4a2d-b6f8-9db02fd02434';
  let repository: {
    canClientAccessRequest: jest.Mock;
    addDocumentAndMarkReceived: jest.Mock;
    getDocumentForClient: jest.Mock;
    findInviteByTokenHash: jest.Mock;
    findPendingInviteByIdAndEmail: jest.Mock;
    acceptInvite: jest.Mock;
  };
  let storage: {
    upload: jest.Mock;
    delete: jest.Mock;
    createDownloadUrl: jest.Mock;
  };
  let db: {
    selectFrom: jest.Mock;
    transaction: jest.Mock;
  };
  let service: ClientPortalService;

  beforeEach(() => {
    repository = {
      canClientAccessRequest: jest.fn(),
      addDocumentAndMarkReceived: jest.fn(),
      getDocumentForClient: jest.fn(),
      findInviteByTokenHash: jest.fn(),
      findPendingInviteByIdAndEmail: jest.fn(),
      acceptInvite: jest.fn().mockResolvedValue(true),
    };
    storage = {
      upload: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      createDownloadUrl: jest.fn().mockResolvedValue({
        url: 'https://storage.example/signed',
        expiresAt: new Date().toISOString(),
      }),
    };
    db = {
      selectFrom: jest.fn(),
      transaction: jest.fn().mockReturnValue({
        execute: (callback: (tx: object) => unknown) => callback({}),
      }),
    };
    service = new ClientPortalService(
      repository as never,
      { sendInvite: jest.fn() } as never,
      storage as never,
      { getOrThrow: jest.fn() } as never,
      db as never,
    );
  });

  it('does not upload when the caller has no link to the request', async () => {
    repository.canClientAccessRequest.mockResolvedValue(null);

    await expect(
      service.uploadDocument({
        requestId,
        userId: 'unlinked-client',
        filename: 'tax-return.pdf',
        contentType: 'application/pdf',
        body: Buffer.from('%PDF-1.7'),
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('blocks uploads when the client organization is deactivated', async () => {
    repository.canClientAccessRequest.mockResolvedValue({
      id: requestId,
      deactivatedAt: new Date(),
    });

    await expect(
      service.uploadDocument({
        requestId,
        userId: 'linked-client',
        filename: 'tax-return.pdf',
        contentType: 'application/pdf',
        body: Buffer.from('%PDF-1.7'),
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('validates file type and extension before writing to storage', async () => {
    repository.canClientAccessRequest.mockResolvedValue({
      id: requestId,
      deactivatedAt: null,
    });

    await expect(
      service.uploadDocument({
        requestId,
        userId: 'linked-client',
        filename: 'payload.exe',
        contentType: 'application/pdf',
        body: Buffer.from('not a pdf'),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('persists an uploaded document only for a linked client', async () => {
    repository.canClientAccessRequest.mockResolvedValue({
      id: requestId,
      deactivatedAt: null,
    });
    repository.addDocumentAndMarkReceived.mockResolvedValue({
      id: documentId,
      originalFilename: 'tax-return.pdf',
      contentType: 'application/pdf',
      sizeBytes: 9,
      createdAt: new Date('2026-01-02T03:04:05.000Z'),
    });

    const result = await service.uploadDocument({
      requestId,
      userId: 'linked-client',
      filename: 'tax-return.pdf',
      contentType: 'application/pdf',
      body: Buffer.from('%PDF-1.7'),
    });

    expect(storage.upload).toHaveBeenCalledWith(
      expect.objectContaining({
        key: expect.stringMatching(
          new RegExp(`^client-documents/${requestId}/`),
        ),
        contentType: 'application/octet-stream',
      }),
    );
    expect(repository.addDocumentAndMarkReceived).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId,
        uploadedByUserId: 'linked-client',
        originalFilename: 'tax-return.pdf',
      }),
    );
    expect(result.id).toBe(documentId);
  });

  it('does not mint a download URL for another client’s file', async () => {
    repository.getDocumentForClient.mockResolvedValue(null);

    await expect(
      service.getClientDownload('unlinked-client', documentId),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(storage.createDownloadUrl).not.toHaveBeenCalled();
  });

  it('accepts an inbox invitation only through the invited email identity', async () => {
    repository.findPendingInviteByIdAndEmail.mockResolvedValue({
      inviteId: documentId,
      clientId: requestId,
      status: 'pending',
      expiresAt: new Date(Date.now() + 60_000),
      deactivatedAt: null,
    });

    await service.acceptInviteById(documentId, {
      userId: 'invited-client',
      email: 'CLIENT@example.com',
      emailVerified: true,
    });

    expect(repository.findPendingInviteByIdAndEmail).toHaveBeenCalledWith(
      documentId,
      'CLIENT@example.com',
    );
    expect(repository.acceptInvite).toHaveBeenCalledWith(
      documentId,
      requestId,
      'invited-client',
      expect.any(Object),
    );
  });
});
