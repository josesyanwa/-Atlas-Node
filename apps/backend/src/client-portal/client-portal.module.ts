import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import * as express from 'express';
import {
  ClientPortalController,
  FirmClientsController,
} from './client-portal.controller';
import { ClientDocumentsController } from './client-documents.controller';
import { ClientDocumentStorageService } from './client-document-storage.service';
import { ClientPortalMailer } from './client-portal.mailer';
import { ClientPortalRepository } from './client-portal.repository';
import { ClientPortalService } from './client-portal.service';

@Module({
  controllers: [
    FirmClientsController,
    ClientPortalController,
    ClientDocumentsController,
  ],
  providers: [
    ClientPortalRepository,
    ClientPortalMailer,
    ClientDocumentStorageService,
    ClientPortalService,
  ],
})
export class ClientPortalModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(express.json())
      .forRoutes(FirmClientsController, ClientPortalController);
    consumer
      .apply(
        express.raw({
          type: [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'text/csv',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ],
          limit: '10mb',
        }),
      )
      .forRoutes({
        path: 'api/client-portal/requests/:requestId/files',
        method: RequestMethod.PUT,
      });
  }
}
