import { vi } from 'vitest';
import { signal } from '@lit-labs/signals';
import type { ApiClient } from '../api-client';
import type { Services } from '../services-context';
import type { AuthState, TelegramAuthStore } from '../../screens/auth/auth-store';

export const mockApiClient: ApiClient = {
  send: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

export const mockAuthStore = {
  state: signal<AuthState>('loading'),
  init: vi.fn(),
  dispose: vi.fn(),
  sendPhoneNumber: vi.fn(),
  sendAuthCode: vi.fn(),
  resendCodeViaSms: vi.fn(),
} as unknown as TelegramAuthStore;

export const mockServices: Services = {
  apiClient: mockApiClient,
  authStore: mockAuthStore,
  chatListStore: {} as Services['chatListStore'],
};
