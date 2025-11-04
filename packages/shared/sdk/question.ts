import { BaseClient } from './baseClient';
import { Question } from '../types/question';

export function createQuestionAPI(client: BaseClient) {
  return {
    getQuestion: (id: string) =>
      client.request<Question>(`/api/questions/${id}`),
    searchQuestions: (keyword: string) =>
      client.request<Question[]>(`/api/questions/search?q=${keyword}`),
  };
}
