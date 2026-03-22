import { createContext } from '@lit/context';
import type { ApiClient } from './api-client';
import type { AuthClient } from './auth/auth-client';
import type { ChatsClient } from './chats/chats-client';

export interface Services {
  apiClient: ApiClient;
  authClient: AuthClient;
  chatsClient: ChatsClient;
}

export const servicesContext = createContext<Services>('services');
