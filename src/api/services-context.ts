import { createContext } from '@lit/context';
import type { ApiClient } from './api-client';
import type { ChatsClient } from './chats/chats-client';
import { TelegramAuthStore } from '../screens/auth/auth-store';

export type Services = {
  apiClient: ApiClient;
  authStore: TelegramAuthStore;
  chatsClient: ChatsClient;
};

export const servicesContext = createContext<Services>('services');
