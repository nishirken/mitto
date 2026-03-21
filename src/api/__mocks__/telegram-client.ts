import { vi } from 'vitest';
import type { ApiClient } from '../api-client';

export const mockApiClient: ApiClient = {
  init: vi.fn(),
  getChats: vi.fn().mockReturnValue([]),
  getChat: vi.fn(),
  loadChats: vi.fn(),
  onAuthStateChange: vi.fn(),
  onChatsChange: vi.fn(),
  sendPhoneNumber: vi.fn(),
  sendAuthCode: vi.fn(),
  sendPassword: vi.fn(),
};
