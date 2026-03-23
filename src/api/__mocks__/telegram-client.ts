import { vi } from 'vitest';
import type { ApiClient } from '../api-client';
import type { AuthClient } from '../auth/auth-client';
import type { ChatsClient } from '../chats/chats-client';
import type { Services } from '../services-context';

export const mockApiClient: ApiClient = {
  init: vi.fn(),
  send: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

export const mockAuthClient: AuthClient = {
  sendPhoneNumber: vi.fn(),
  sendAuthCode: vi.fn(),
  resendCodeViaSms: vi.fn(),
};

export const mockChatsClient: ChatsClient = {
  loadChats: vi.fn(),
  getChat: vi.fn(),
};

export const mockServices: Services = {
  apiClient: mockApiClient,
  authClient: mockAuthClient,
  chatsClient: mockChatsClient,
};
