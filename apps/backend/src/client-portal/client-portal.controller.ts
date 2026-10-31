import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { AllowAnonymous, Session } from '@thallesp/nestjs-better-auth';
import {
  ClientInviteTokenSchema,
  CreateClientSchema,
  CreateDocumentRequestSchema,
  type ApiResponse,
  type ClientDocumentRequest,
  type ClientInvitePreview,
  type ClientPortalInvite,
  type ClientRecord,
  type CreateClientRequest,
  type CreateDocumentRequest,
} from '@atlas-node/api-interfaces';
import {
  OrgMembership,
  type OrgMembershipContext,
} from '../organizations/decorators/org-membership.decorator';
import { RequireOrgRole } from '../organizations/decorators/require-org-role.decorator';
import { ZodValidationPipe } from '../organizations/dto/zod-validation.pipe';
import { ClientPortalService } from './client-portal.service';

type SessionPayload = {
  user: { id: string; email: string; emailVerified: boolean };
};

@Controller('api/organizations/current')
export class FirmClientsController {
  constructor(private readonly portal: ClientPortalService) {}

  @Get('clients')
  @RequireOrgRole('member')
  async listClients(
    @OrgMembership() membership: OrgMembershipContext,
  ): Promise<ApiResponse<ClientRecord[]>> {
    const data = await this.portal.listClients(membership.organizationId);
    return { data, message: 'OK', success: true };
  }

  @Post('clients')
  @RequireOrgRole('admin')
  async createClient(
    @OrgMembership() membership: OrgMembershipContext,
    @Body(new ZodValidationPipe(CreateClientSchema))
    body: CreateClientRequest,
  ): Promise<ApiResponse<ClientRecord>> {
    const data = await this.portal.createClient(
      membership.organizationId,
      membership.userId,
      body,
    );
    return { data, message: 'Client invitation sent', success: true };
  }

  @Post('clients/:clientId/invite')
  @RequireOrgRole('admin')
  async resendInvite(
    @OrgMembership() membership: OrgMembershipContext,
    @Param('clientId', ParseUUIDPipe) clientId: string,
  ): Promise<ApiResponse<null>> {
    await this.portal.resendClientInvite(membership.organizationId, clientId);
    return { data: null, message: 'Client invitation sent', success: true };
  }

  @Get('clients/:clientId/requests')
  @RequireOrgRole('member')
  async listClientRequests(
    @OrgMembership() membership: OrgMembershipContext,
    @Param('clientId', ParseUUIDPipe) clientId: string,
  ): Promise<ApiResponse<ClientDocumentRequest[]>> {
    const data = await this.portal.listOrganizationRequests(
      membership.organizationId,
      clientId,
    );
    return { data, message: 'OK', success: true };
  }

  @Post('clients/:clientId/requests')
  @RequireOrgRole('admin')
  async createDocumentRequest(
    @OrgMembership() membership: OrgMembershipContext,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Body(new ZodValidationPipe(CreateDocumentRequestSchema))
    body: CreateDocumentRequest,
  ): Promise<ApiResponse<ClientDocumentRequest>> {
    const data = await this.portal.createDocumentRequest(
      membership.organizationId,
      membership.userId,
      clientId,
      body,
    );
    return { data, message: 'Document request created', success: true };
  }

  @Get('client-documents/:documentId/download')
  @RequireOrgRole('member')
  async firmDownload(
    @OrgMembership() membership: OrgMembershipContext,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    const data = await this.portal.getFirmDownload(
      membership.organizationId,
      documentId,
    );
    return { data, message: 'OK', success: true };
  }
}

@Controller('api/client-portal')
export class ClientPortalController {
  constructor(private readonly portal: ClientPortalService) {}

  @Get('invites/preview')
  @AllowAnonymous()
  async previewInvite(
    @Query('token') token: string | undefined,
  ): Promise<ApiResponse<ClientInvitePreview>> {
    const parsed = ClientInviteTokenSchema.safeParse({ token });
    if (!parsed.success) {
      throw new BadRequestException('A valid invitation token is required.');
    }
    const data = await this.portal.previewInvite(parsed.data.token);
    return { data, message: 'OK', success: true };
  }

  @Get('invites/me')
  async listMyInvites(
    @Session() session: SessionPayload,
  ): Promise<ApiResponse<ClientPortalInvite[]>> {
    if (!session.user.emailVerified) {
      throw new ForbiddenException(
        'Verify your email before reviewing client invitations.',
      );
    }
    const data = await this.portal.listPendingInvites(session.user.email);
    return { data, message: 'OK', success: true };
  }

  @Get('access')
  async hasClientPortalAccess(
    @Session() session: SessionPayload,
  ): Promise<ApiResponse<{ hasAccess: boolean }>> {
    if (!session.user.emailVerified) {
      throw new ForbiddenException(
        'Verify your email before accessing client documents.',
      );
    }
    const hasAccess = await this.portal.hasClientPortalAccess(
      session.user.id,
    );
    return { data: { hasAccess }, message: 'OK', success: true };
  }

  @Post('invites/accept')
  async acceptInvite(
    @Session() session: SessionPayload,
    @Body(new ZodValidationPipe(ClientInviteTokenSchema))
    body: { token: string },
  ): Promise<ApiResponse<null>> {
    await this.portal.acceptInvite(body.token, {
      userId: session.user.id,
      email: session.user.email,
      emailVerified: session.user.emailVerified,
    });
    return {
      data: null,
      message: 'Client portal access activated',
      success: true,
    };
  }

  @Post('invites/:inviteId/accept')
  async acceptInviteFromInbox(
    @Session() session: SessionPayload,
    @Param('inviteId', ParseUUIDPipe) inviteId: string,
  ): Promise<ApiResponse<null>> {
    await this.portal.acceptInviteById(inviteId, {
      userId: session.user.id,
      email: session.user.email,
      emailVerified: session.user.emailVerified,
    });
    return {
      data: null,
      message: 'Client portal access activated',
      success: true,
    };
  }

  @Get('requests')
  async listRequests(
    @Session() session: SessionPayload,
  ): Promise<ApiResponse<ClientDocumentRequest[]>> {
    if (!session.user.emailVerified) {
      throw new ForbiddenException(
        'Verify your email before accessing client documents.',
      );
    }
    const data = await this.portal.listPortalRequests(session.user.id);
    return { data, message: 'OK', success: true };
  }

  @Get('documents/:documentId/download')
  async portalDownload(
    @Session() session: SessionPayload,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    if (!session.user.emailVerified) {
      throw new ForbiddenException(
        'Verify your email before accessing client documents.',
      );
    }
    const data = await this.portal.getClientDownload(
      session.user.id,
      documentId,
    );
    return { data, message: 'OK', success: true };
  }
}
