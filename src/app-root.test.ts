import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fixture, html } from '@open-wc/testing';
import { MockAuthStore } from 'screens/auth/__mocks__/auth-store';
import { createTestDatabase } from 'services/database/__mocks__/database';

let authStore: MockAuthStore;
let database: Database;

// Partial mock: the sync services and mappers pull real `Api`/`events`/`utils` off the
// same default export.
vi.mock('telegram', async (importOriginal) => {
  const actual = await importOriginal<typeof import('telegram')>();
  // Safe to import here only because that module has no runtime `telegram` import; a module
  // that does would re-enter this factory and deadlock with no output.
  const { emptyDialogs, MockClient } = await import('api/__mocks__/telegram-client');
  const dialogs = emptyDialogs(actual.default.Api);

  // app-root calls `new TelegramClient(session, apiId, apiHash, params)`, so the shared stub
  // is adapted to that arity here rather than growing a constructor it does not need.
  class MockTelegramClient extends MockClient {
    constructor() {
      super();
      this.invokeResult = dialogs;
    }
  }

  // The real `StringSession` parses what it is given and throws on anything that is not a
  // version-prefixed gramjs payload. Only `MockTelegramClient` receives it, and it ignores
  // its arguments, so a stub lets a test store any string as the session.
  class MockStringSession {
    constructor(private readonly _session?: string) {}

    save() {
      return this._session ?? '';
    }
  }

  return {
    ...actual,
    default: {
      ...actual.default,
      TelegramClient: MockTelegramClient,
      sessions: { ...actual.default.sessions, StringSession: MockStringSession },
    },
  };
});

vi.mock('./services/database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./services/database')>();

  // `database` is read when `create()` runs, not when this factory is hoisted, so the
  // `beforeEach` assignment wins and every test keeps its own database name.
  class TestDatabase extends actual.Database {
    static async create() {
      return database;
    }
  }

  return { ...actual, Database: TestDatabase };
});

vi.mock('./screens/auth/auth-store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./screens/auth/auth-store')>();
  const { MockAuthStore } = await import('screens/auth/__mocks__/auth-store');

  return {
    ...actual,
    TelegramAuthStore: MockAuthStore,
  };
});

import 'app-root';
import type { AppRoot } from 'app-root';
import type { Database } from './services/database';
import { client } from 'telegram';

async function flushAsync(el: AppRoot): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await el.updateComplete;
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  database = createTestDatabase();
  authStore = new MockAuthStore();
  authStore.state.set({ type: 'loading' });
});

describe('app-root', () => {
  describe('routes', () => {
    it('renders dialog-list-screen for #/dialogs', async () => {
      authStore.state.set({ type: 'ready' });
      window.location.hash = '#/dialogs';
      const el = await fixture<AppRoot>(html`<app-root></app-root>`);
      await flushAsync(el);
      expect(el.shadowRoot!.querySelector('dialog-list-screen')).not.toBeNull();
    });

    it('renders dialog-screen for #/dialog/user:1', async () => {
      authStore.state.set({ type: 'ready' });
      window.location.hash = '#/dialog/user:1';
      const el = await fixture<AppRoot>(html`<app-root></app-root>`);
      await flushAsync(el);
      expect(el.shadowRoot!.querySelector('dialog-screen')).not.toBeNull();
    });

    it('renders settings', async () => {
      authStore.state.set({ type: 'ready' });
      window.location.hash = '#/settings';
      const el = await fixture<AppRoot>(html`<app-root></app-root>`);
      await flushAsync(el);
      expect(el.shadowRoot!.querySelector('settings-screen')).not.toBeNull();
    });

    it('renders auth-screen for #/auth', async () => {
      authStore.state.set({ type: 'wait_phone' });
      window.location.hash = '#/auth';
      const el = await fixture<AppRoot>(html`<app-root></app-root>`);
      await flushAsync(el);
      expect(el.shadowRoot!.querySelector('auth-screen')).not.toBeNull();
    });
  });

  it('calls checkAuthorization if there is session', async () => {
    await database.setSession('session');
    const el = await fixture<AppRoot>(html`<app-root></app-root>`);
    await flushAsync(el);
    expect(authStore.checkAuthorization).toHaveBeenCalled();
  });

  it('does not call checkAuthorization without a session', async () => {
    const el = await fixture<AppRoot>(html`<app-root></app-root>`);
    await flushAsync(el);
    expect(authStore.checkAuthorization).not.toHaveBeenCalled();
  });
});
