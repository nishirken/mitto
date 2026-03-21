import { vi } from 'vitest';

export const telegramClient = {
  onAuthStateChange: vi.fn(),
  init: vi.fn(),
  sendPhoneNumber: vi.fn(),
  sendAuthCode: vi.fn(),
  sendPassword: vi.fn(),
};
