import { createContext } from '@lit/context';
import type { TelegramClient } from 'telegram';
import { TelegramAuthStore } from '../screens/auth/auth-store';
import { OfflineStorage } from '../services/offline-storage';
import { ChatListStore } from '../services/chat-list-store/chat-list-store';

export type Services = {
  client: TelegramClient;
  offlineStorage: OfflineStorage;
  authStore: TelegramAuthStore;
  chatListStore: ChatListStore;
};

export const servicesContext = createContext<Services>('services');
