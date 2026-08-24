import type { Services } from '../services-context';
import { DatabaseHub } from '../../services/database/database-hub';
import { SettingsStore } from '../../services/settings/settings-store';
import { MockDatabase } from '../../services/database/__mocks__/database';
import { MockAuthStore } from '../../screens/auth/__mocks__/auth-store';
import { MockDialogRepository } from '../../services/repositories/dialog/__mocks__/dialog-repository';
import { MockMessageRepository } from '../../services/repositories/message/__mocks__/message-repository';
import { MockMediaRepository } from '../../services/repositories/media/__mocks__/media-repository';
import { MockMediaFileService } from '../../services/media/__mocks__/media-file-service';
import { MockClient } from './telegram-client';

export function createMockServices(overrides: Partial<Services> = {}): Services {
  const database = overrides.database ?? new MockDatabase();

  return {
    client: new MockClient() as unknown as Services['client'],
    database,
    databaseHub: new DatabaseHub(),
    authStore: new MockAuthStore(),
    dialogRepository: new MockDialogRepository(),
    messageRepository: new MockMessageRepository(),
    mediaRepository: new MockMediaRepository(),
    mediaFileService: new MockMediaFileService(),
    settingsStore: new SettingsStore(database),
    ...overrides,
  };
}
