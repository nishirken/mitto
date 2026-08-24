import { createContext } from '@lit/context';
import type { TelegramClient } from 'telegram';
import type { IAuthStore } from '../screens/auth/auth-store';
import type { Database } from '../services/database';
import type { IMessageRepository } from '../services/repositories/message/message-repository';
import type { IDialogRepository } from '../services/repositories/dialog/dialog-repository';
import type { IMediaRepository } from '../services/repositories/media/media-repository';
import type { IMediaFileService } from '../services/media/media-file-service';
import type { SettingsStore } from '../services/settings/settings-store';

export type Services = {
  client: TelegramClient;
  database: Database;
  authStore: IAuthStore;
  dialogRepository: IDialogRepository;
  messageRepository: IMessageRepository;
  mediaRepository: IMediaRepository;
  mediaFileService: IMediaFileService;
  settingsStore: SettingsStore;
};

export const servicesContext = createContext<Services>('services');
