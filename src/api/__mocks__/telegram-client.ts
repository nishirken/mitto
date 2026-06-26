import { vi } from 'vitest';
import { signal } from '@lit-labs/signals';
import type { Services } from '../services-context';
import type { AuthState, TelegramAuthStore } from '../../screens/auth/auth-store';
import type { OfflineStorage } from '../../services/offline-storage';

export const mockOfflineStorage = {
  getSession: vi.fn(async () => null),
  setSession: vi.fn(async () => {}),
  clearSession: vi.fn(async () => {}),
  loadChats: vi.fn(async () => []),
  saveChats: vi.fn(async () => {}),
  upsertChat: vi.fn(async () => {}),
  loadMessages: vi.fn(async () => []),
  saveMessages: vi.fn(async () => {}),
  upsertMessage: vi.fn(async () => {}),
  clearCache: vi.fn(async () => {}),
} as unknown as OfflineStorage;

export const mockClient: Record<string, unknown> = {
  connect: vi.fn(),
  invoke: vi.fn(),
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

export const mockServices: Services = {
  client: mockClient as unknown as Services['client'],
  offlineStorage: mockOfflineStorage,
  authStore: mockAuthStore,
  chatListStore: {} as Services['chatListStore'],
};
