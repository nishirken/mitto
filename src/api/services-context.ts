import { createContext } from '@lit/context';
import type { ApiClient } from './api-client';
import { TelegramAuthStore } from '../screens/auth/auth-store';
import { ChatListStore } from '../screens/chat-list-screen/chat-list-store';

export type Services = {
  apiClient: ApiClient;
  authStore: TelegramAuthStore;
  chatListStore: ChatListStore;
};

export const servicesContext = createContext<Services>('services');
