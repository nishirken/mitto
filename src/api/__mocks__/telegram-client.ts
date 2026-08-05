import { vi } from 'vitest';
import { signal } from '@lit-labs/signals';
import telegram from 'telegram';
import type { Services } from '../services-context';
import type { AuthState, TelegramAuthStore } from '../../screens/auth/auth-store';
import type { Database } from '../../services/database';
import { DatabaseHub } from '../../services/database/database-hub';
import { SettingsStore } from '../../services/settings/settings-store';

export const mockDatabase = {
  getSession: vi.fn(async () => null),
  setSession: vi.fn(async () => {}),
  clearSession: vi.fn(async () => {}),
  getSettings: vi.fn(async () => null),
  setSettings: vi.fn(async () => {}),
  putUsers: vi.fn(async () => {}),
  putPeers: vi.fn(async () => {}),
  putMessages: vi.fn(async () => {}),
  putDialogs: vi.fn(async () => {}),
  putAll: vi.fn(async () => {}),
  applyDialogsBatch: vi.fn(async () => {}),
  getUser: vi.fn(async () => undefined),
  getUsers: vi.fn(async () => []),
  getPeer: vi.fn(async () => undefined),
  getPeers: vi.fn(async () => []),
  getMessage: vi.fn(async () => undefined),
  loadDialogs: vi.fn(async () => []),
  getDialog: vi.fn(async () => undefined),
  getDialogs: vi.fn(async () => []),
  loadMessages: vi.fn(async () => []),
  clearCache: vi.fn(async () => {}),
} as unknown as Database;

const { Api } = telegram;

/** Empty result so dialog sync completes as a no-op instead of throwing. */
export const emptyDialogs = new Api.messages.Dialogs({
  dialogs: [],
  messages: [],
  chats: [],
  users: [],
});

export const mockClient: Record<string, unknown> = {
  connect: vi.fn(async () => true),
  invoke: vi.fn(async () => emptyDialogs),
  addEventHandler: vi.fn(),
  removeEventHandler: vi.fn(),
  checkAuthorization: vi.fn(),
  sendCode: vi.fn(),
  session: { save: vi.fn() },
};

export const mockAuthStore = {
  state: signal<AuthState>('loading'),
  init: vi.fn(),
  dispose: vi.fn(),
  sendPhoneNumber: vi.fn(),
  sendAuthCode: vi.fn(),
  resendCodeViaSms: vi.fn(),
  logout: vi.fn(),
} as unknown as TelegramAuthStore;

export const mockDialogRepository = {
  applyDialogsResponse: vi.fn(async () => {}),
} as unknown as Services['dialogRepository'];

export const mockMessageRepository = {
  applyNewMessage: vi.fn(async () => {}),
  applyMessagesResponse: vi.fn(async () => {}),
} as unknown as Services['messageRepository'];

export const mockMediaRepository = {
  applyMessagesMedia: vi.fn(async () => {}),
  applyMedia: vi.fn(async () => null),
} as unknown as Services['mediaRepository'];

export const mockMediaFileService = {
  url: vi.fn(async () => null),
  dispose: vi.fn(),
} as unknown as Services['mediaFileService'];

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
