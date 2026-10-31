import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const BUCKET = 'client-documents';
const DOWNLOAD_URL_TTL_SECONDS = 300;

@Injectable()
export class ClientDocumentStorageService {
  private readonly logger = new Logger(ClientDocumentStorageService.name);
  private client: S3Client | null = null;
  private readonly bucket = BUCKET;

  constructor(private readonly config: ConfigService) {}

  private getClient(): S3Client {
    const endpoint = this.config.get<string>('AWS_ENDPOINT_URL_S3');
    const region = this.config.get<string>('AWS_REGION');
    const accessKeyId = this.config.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('AWS_SECRET_ACCESS_KEY');
    if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
      throw new ServiceUnavailableException(
        'Private document storage is not configured. Set the Neon Object Storage AWS environment variables.',
      );
    }

    if (!this.client) {
      this.client = new S3Client({
        endpoint,
        region,
        forcePathStyle: true,
        credentials: { accessKeyId, secretAccessKey },
      });
    }
    return this.client;
  }

  async upload(input: {
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<void> {
    await this.getClient().send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        CacheControl: 'private, no-store',
      }),
    );
  }

  async delete(key: string): Promise<void> {
    try {
      await this.getClient().send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (error) {
      this.logger.error(
        `Unable to remove orphaned client document object ${key}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async createDownloadUrl(
    key: string,
    filename: string,
  ): Promise<{ url: string; expiresAt: string }> {
    const expiresIn = DOWNLOAD_URL_TTL_SECONDS;
    const safeFilename = filename.replace(/["\\\r\n]/g, '_');
    const url = await getSignedUrl(
      this.getClient(),
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentDisposition: `attachment; filename="${safeFilename}"`,
        ResponseContentType: 'application/octet-stream',
        ResponseCacheControl: 'private, no-store',
      }),
      { expiresIn },
    );
    return {
      url,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    };
  }
}
