import { Injectable } from '@nestjs/common';
import type { User, ApiResponse } from '@atlas-node/api-interfaces';
import { generateId, formatDate, API_VERSION } from '@atlas-node/core';

@Injectable()
export class AppService {
  getHello(): ApiResponse<{ message: string; version: string }> {
    return {
      data: {
        message: 'Hello from Atlas Node!',
        version: API_VERSION,
      },
      message: 'Success',
      success: true,
    };
  }

  getUsers(): ApiResponse<User[]> {
    const users: User[] = [
      {
        id: generateId(),
        email: 'john@example.com',
        name: 'John Doe',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    return {
      data: users,
      message: `Users retrieved at ${formatDate(new Date())}`,
      success: true,
    };
  }
}
