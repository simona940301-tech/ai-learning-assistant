import { BaseClient } from './baseClient';
import { ErrorItem } from '../types/errorBook';

export function createErrorBookAPI(client: BaseClient) {
  return {
    getErrors: () => client.request<ErrorItem[]>('/api/error-book'),
    addError: (item: Partial<ErrorItem>) =>
      client.request<ErrorItem>('/api/error-book', {
        method: 'POST',
        body: JSON.stringify(item),
      }),
  };
}
