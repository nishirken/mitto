import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fixture, html } from '@open-wc/testing';
import { MockAuthStore } from 'screens/auth/__mocks__/auth-store';
import type { Database } from 'services/database';
import { createTestDatabase } from 'services/database/__mocks__/database';

let authStore: MockAuthStore;
let database: Database;

// Partial mock: the sync services and mappers pull real `Api`/`events`/`utils` off the
// same default export, and app-root needs a working `sessions.StringSession`.
vi.mock('telegram', async (importOriginal) => {
  const actual = await importOriginal<typeof import('telegram')>();

  // Declared inline rather than imported from `api/__mocks__/telegram-client`: that module
  // imports `telegram` itself (for `emptyDialogs`), so pulling it in here would re-enter
  // this factory and deadlock. app-root only needs the constructor to succeed — it never
  // asserts on the client — so a bare constructible stub is enough.
  const emptyDialogs = new actual.default.Api.messages.Dialogs({
    dialogs: [],
    messages: [],
    chats: [],
    users: [],
  });

  class MockTelegramClient {
    connect = vi.fn(async () => true);
    disconnect = vi.fn(async () => {});
    invoke = vi.fn(async () => emptyDialogs);
    addEventHandler = vi.fn(() => {});
    removeEventHandler = vi.fn(() => {});
    checkAuthorization = vi.fn(async () => true);
    sendCode = vi.fn(() => {});
    downloadFile = vi.fn(async () => null);
    session = { save: vi.fn(() => '') };
  }

  return {
    ...actual,
    default: {
      ...actual.default,
      TelegramClient: MockTelegramClient,
    },
  };
});

vi.mock('./services/database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./services/database')>();

  return {
    ...actual,
    Database: { create: vi.fn(async () => database) },
  };
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
  authStore.state.set('loading');
});

describe('app-root', () => {
  it('renders chat-list-screen for #/chats', async () => {
    authStore.state.set('ready');
    window.location.hash = '#/chats';
    const el = await fixture<AppRoot>(html`<app-root></app-root>`);
    await flushAsync(el);
    expect(el.shadowRoot!.querySelector('chat-list-screen')).not.toBeNull();
  });

  it('renders auth-screen for #/auth', async () => {
    authStore.state.set('wait_phone');
    window.location.hash = '#/auth';
    const el = await fixture<AppRoot>(html`<app-root></app-root>`);
    await flushAsync(el);
    expect(el.shadowRoot!.querySelector('auth-screen')).not.toBeNull();
  });

  it('renders chat-view-screen for #/chat/user:1', async () => {
    authStore.state.set('ready');
    window.location.hash = '#/chat/user:1';
    const el = await fixture<AppRoot>(html`<app-root></app-root>`);
    await flushAsync(el);
    expect(el.shadowRoot!.querySelector('chat-view-screen')).not.toBeNull();
  });
});
