import { vi } from 'vitest';
import { signal } from '@lit-labs/signals';
import type { AuthState, IAuthStore } from '../auth-store';

// Shared across every instance so a `new MockAuthStore()` inside the code under test is
// observable from the instance the test constructs. Module-level because
// `useDefineForClassFields: false` rules out `private static`.
const authMembers = {
  state: signal<AuthState>({ type: 'loading' }),
  init: vi.fn(() => {}),
  checkAuthorization: vi.fn(async () => {}),
  sendCode: vi.fn(async () => {}),
  signIn: vi.fn(async () => {}),
  checkPassword: vi.fn(async () => {}),
  resendCode: vi.fn(async () => {}),
  logout: vi.fn(async () => true),
};

export class MockAuthStore implements IAuthStore {
  readonly state = authMembers.state;
  init = authMembers.init;
  checkAuthorization = authMembers.checkAuthorization;
  sendCode = authMembers.sendCode;
  signIn = authMembers.signIn;
  checkPassword = authMembers.checkPassword;
  resendCode = authMembers.resendCode;
  logout = authMembers.logout;
}
