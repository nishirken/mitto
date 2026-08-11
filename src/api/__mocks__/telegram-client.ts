import { vi } from 'vitest';
import { signal } from '@lit-labs/signals';
import telegram from 'telegram';
import type { Services } from '../services-context';
import type { AuthState, IAuthStore } from '../../screens/auth/auth-store';
import type { IDatabase } from '../../services/database';
import type { IDialogRepository } from '../../services/repositories/dialog/dialog-repository';
import type { IMessageRepository } from '../../services/repositories/message/message-repository';
import type { IMediaRepository } from '../../services/repositories/media/media-repository';
import type { IMediaFileService } from '../../services/media/media-file-service';
import { DatabaseHub } from '../../services/database/database-hub';
import { SettingsStore } from '../../services/settings/settings-store';

const { Api } = telegram;

/** Empty result so dialog sync completes as a no-op instead of throwing. */
export const emptyDialogs = new Api.messages.Dialogs({
  dialogs: [],
  messages: [],
  chats: [],
  users: [],
});

export class MockDatabase implements IDatabase {
  close = vi.fn(() => {});
  getSession = vi.fn(async () => null);
  setSession = vi.fn(async () => {});
  clearSession = vi.fn(async () => {});
  getSettings = vi.fn(async () => null);
  setSettings = vi.fn(async () => {});
  putUsers = vi.fn(async () => {});
  putMessages = vi.fn(async () => {});
  putMedia = vi.fn(async () => {});
  putDialogs = vi.fn(async () => {});
  putAll = vi.fn(async () => {});
  getUser = vi.fn(async () => undefined);
  getPeer = vi.fn(async () => undefined);
  getUsers = vi.fn(async () => []);
  getMedia = vi.fn(async () => undefined);
  getMediaItems = vi.fn(async () => []);
  getMessage = vi.fn(async () => undefined);
  loadDialogs = vi.fn(async () => []);
  getDialog = vi.fn(async () => undefined);
  getDialogs = vi.fn(async () => []);
  loadMessages = vi.fn(async () => []);
  clearCache = vi.fn(async () => {});
}

export const mockDatabase = new MockDatabase();

// Shared across every instance so a `new MockClient()` inside the code under test is
// observable from the exported singleton. Module-level because `useDefineForClassFields:
// false` rules out `private static`.
const clientMembers = {
  connect: vi.fn(async () => true),
  invoke: vi.fn(async () => emptyDialogs),
  addEventHandler: vi.fn(() => {}),
  removeEventHandler: vi.fn(() => {}),
  checkAuthorization: vi.fn(() => {}),
  sendCode: vi.fn(() => {}),
  session: { save: vi.fn(() => {}) },
};

export class MockClient {
  connect = clientMembers.connect;
  invoke = clientMembers.invoke;
  addEventHandler = clientMembers.addEventHandler;
  removeEventHandler = clientMembers.removeEventHandler;
  checkAuthorization = clientMembers.checkAuthorization;
  sendCode = clientMembers.sendCode;
  session = clientMembers.session;
}

export const mockClient = new MockClient();

const authMembers = {
  state: signal<AuthState>('loading'),
  init: vi.fn(async () => {}),
  dispose: vi.fn(() => {}),
  sendPhoneNumber: vi.fn(async () => {}),
  sendAuthCode: vi.fn(async () => {}),
  resendCodeViaSms: vi.fn(async () => {}),
  logout: vi.fn(async () => true),
};

export class MockAuthStore implements IAuthStore {
  readonly state = authMembers.state;
  init = authMembers.init;
  dispose = authMembers.dispose;
  sendPhoneNumber = authMembers.sendPhoneNumber;
  sendAuthCode = authMembers.sendAuthCode;
  resendCodeViaSms = authMembers.resendCodeViaSms;
  logout = authMembers.logout;
}

export const mockAuthStore = new MockAuthStore();

export class MockDialogRepository implements IDialogRepository {
  applyDialogsResponse = vi.fn(async () => {});
  applyReadInbox = vi.fn(async () => {});
  applyReadOutbox = vi.fn(async () => {});
}

export const mockDialogRepository = new MockDialogRepository();

export class MockMessageRepository implements IMessageRepository {
  applyMessage = vi.fn(async () => {});
  applyNewMessage = vi.fn(async () => {});
  applyMessagesResponse = vi.fn(async () => {});
  updateNewMessage = vi.fn(async () => {});
}

export const mockMessageRepository = new MockMessageRepository();

export class MockMediaRepository implements IMediaRepository {
  applyMessagesMedia = vi.fn(async () => {});
  applyMedia = vi.fn(async () => null);
}

export const mockMediaRepository = new MockMediaRepository();

export class MockMediaFileService implements IMediaFileService {
  url = vi.fn(async () => null);
  dispose = vi.fn(() => {});
}

export const mockMediaFileService = new MockMediaFileService();

export const mockSettingsStore = new SettingsStore(mockDatabase);

export const mockServices: Services = {
  client: mockClient as unknown as Services['client'],
  database: mockDatabase,
  databaseHub: new DatabaseHub(),
  authStore: mockAuthStore,
  dialogRepository: mockDialogRepository,
  messageRepository: mockMessageRepository,
  mediaRepository: mockMediaRepository,
  mediaFileService: mockMediaFileService,
  settingsStore: mockSettingsStore,
};
