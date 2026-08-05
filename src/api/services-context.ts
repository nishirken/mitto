import { createContext } from '@lit/context';
import type { TelegramClient } from 'telegram';
import { TelegramAuthStore } from '../screens/auth/auth-store';
import { Database } from '../services/database';
import { MessageRepository } from '../services/repositories/message/message-repository';
import { DatabaseHub } from '../services/database/database-hub';
import { DialogRepository } from '../services/repositories/dialog/dialog-repository';
import { MediaRepository } from '../services/repositories/media/media-repository';
import { MediaFileService } from '../services/media/media-file-service';

export type Services = {
  client: TelegramClient;
  database: Database;
  databaseHub: DatabaseHub;
  authStore: TelegramAuthStore;
  dialogRepository: DialogRepository;
  messageRepository: MessageRepository;
  mediaRepository: MediaRepository;
  mediaFileService: MediaFileService;
};

export const servicesContext = createContext<Services>('services');
