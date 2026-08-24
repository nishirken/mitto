import { vi } from 'vitest';
import { signal } from '@lit-labs/signals';
import type { AuthState, IAuthStore } from '../auth-store';

// Shared across every instance so a `new MockAuthStore()` inside the code under test is
// observable from the instance the test constructs. Module-level because
// `useDefineForClassFields: false` rules out `private static`.
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
