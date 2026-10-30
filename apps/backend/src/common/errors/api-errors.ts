import { HttpException, HttpStatus } from '@nestjs/common';
import type { ApiError } from '@atlas-node/api-interfaces';

export class ApiException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: number = HttpStatus.BAD_REQUEST,
    public readonly details?: Record<string, unknown>,
  ) {
    const body: ApiError = details
      ? { code, message, details }
      : { code, message };
    super(body, status);
  }
}
