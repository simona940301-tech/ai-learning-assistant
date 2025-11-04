import { BaseClient } from './baseClient';
import { User } from '../types/user';

export function createAuthAPI(client: BaseClient) {
  return {
    login: (email: string, password: string) =>
      client.request<{ user: User; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    register: (email: string, password: string, name: string) =>
      client.request<{ user: User; token: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      }),

    getCurrentUser: () =>
      client.request<User>('/api/auth/me', { method: 'GET' }),
  };
}
