import { vi } from 'vitest';
import { signal } from '@lit-labs/signals';
import type { Services } from '../services-context';
import type { AuthState, TelegramAuthStore } from '../../screens/auth/auth-store';

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
  authStore: mockAuthStore,
  chatListStore: {} as Services['chatListStore'],
};
