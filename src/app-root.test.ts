import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fixture, html } from '@open-wc/testing';
import { mockAuthStore, mockClient, mockDatabase } from 'api/__mocks__/telegram-client';

// Partial mock: the sync services and mappers pull real `Api`/`events`/`utils` off the
// same default export, and app-root needs a working `sessions.StringSession`.
vi.mock('telegram', async (importOriginal) => {
  const actual = await importOriginal<typeof import('telegram')>();

  return {
    ...actual,
    default: {
      ...actual.default,
      TelegramClient: function () {
        return mockClient;
      },
    },
  };
});

vi.mock('./services/database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./services/database')>();

  return {
    ...actual,
    Database: { create: vi.fn(async () => mockDatabase) },
  };
});

vi.mock('./screens/auth/auth-store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./screens/auth/auth-store')>();

  return {
    ...actual,
    TelegramAuthStore: function () {
      return mockAuthStore;
    },
  };
});

import 'app-root';
import type { AppRoot } from 'app-root';

async function flushAsync(el: AppRoot): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
    await el.updateComplete;
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthStore.state.set('loading');
});

describe('app-root', () => {
  it('renders chat-list-screen for #/chats', async () => {
    mockAuthStore.state.set('ready');
    window.location.hash = '#/chats';
    const el = await fixture<AppRoot>(html`<app-root></app-root>`);
    await flushAsync(el);
    expect(el.shadowRoot!.querySelector('chat-list-screen')).not.toBeNull();
  });

  it('renders auth-screen for #/auth', async () => {
    mockAuthStore.state.set('wait_phone');
    window.location.hash = '#/auth';
    const el = await fixture<AppRoot>(html`<app-root></app-root>`);
    await flushAsync(el);
    expect(el.shadowRoot!.querySelector('auth-screen')).not.toBeNull();
  });

  it('renders chat-view-screen for #/chat/1', async () => {
    mockAuthStore.state.set('ready');
    window.location.hash = '#/chat/1';
    const el = await fixture<AppRoot>(html`<app-root></app-root>`);
    await flushAsync(el);
    expect(el.shadowRoot!.querySelector('chat-view-screen')).not.toBeNull();
  });
});
