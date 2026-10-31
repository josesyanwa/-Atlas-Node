import {
  BadRequestException,
  ForbiddenException,
  Controller,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { Session } from '@thallesp/nestjs-better-auth';
import type { Request } from 'express';
import type { ApiResponse, ClientDocument } from '@atlas-node/api-interfaces';
import { ClientPortalService } from './client-portal.service';

type SessionPayload = {
  user: { id: string; email: string; emailVerified: boolean };
};

type RawUploadRequest = Request & { body: unknown };

@Controller('api/client-portal')
export class ClientDocumentsController {
  constructor(private readonly portal: ClientPortalService) {}

  @Put('requests/:requestId/files')
  async upload(
    @Session() session: SessionPayload,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Query('filename') filename: string | undefined,
    @Req() request: RawUploadRequest,
  ): Promise<ApiResponse<ClientDocument>> {
    if (!session.user.emailVerified) {
      throw new ForbiddenException(
        'Verify your email before uploading client documents.',
      );
    }
    if (!filename || !Buffer.isBuffer(request.body)) {
      throw new BadRequestException('A file and its filename are required.');
    }

    const data = await this.portal.uploadDocument({
      requestId,
      userId: session.user.id,
      filename,
      contentType: request.header('content-type') ?? '',
      body: request.body,
    });
    return { data, message: 'Document uploaded', success: true };
  }
}
