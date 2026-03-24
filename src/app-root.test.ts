import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fixture, html } from '@open-wc/testing';
import { signal } from '@lit-labs/signals';
import type { AuthState } from 'screens/auth/auth-store';

const mockState = signal<AuthState>('loading');
const mockSend = vi.fn();
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

vi.mock('api/telegram-api-client', () => ({
  TelegramApiClient: function () {
    return { send: mockSend, addEventListener: mockAddEventListener, removeEventListener: mockRemoveEventListener };
  },
}));

vi.mock('./screens/auth/auth-store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./screens/auth/auth-store')>();

  return {
    ...actual,
    TelegramAuthStore: function () {
      return {
        state: mockState,
        init: vi.fn(),
        dispose: vi.fn(),
        sendPhoneNumber: vi.fn(),
        sendAuthCode: vi.fn(),
        resendCodeViaSms: vi.fn(),
      };
    },
  };
});

vi.mock('api/chats/telegram-chats-client', () => ({
  TelegramChatsClient: function () { return { loadChats: vi.fn(), getChat: vi.fn() }; },
}));

import 'app-root';
import type { AppRoot } from 'app-root';

beforeEach(() => {
  vi.clearAllMocks();
  mockState.set('loading');
});

describe('app-root', () => {
  it('renders chat-list-screen for #/chats', async () => {
    mockState.set('ready');
    window.location.hash = '#/chats';
    const el = await fixture<AppRoot>(html`<app-root></app-root>`);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('chat-list-screen')).not.toBeNull();
  });

  it('renders auth-screen for #/auth', async () => {
    mockState.set('wait_phone');
    window.location.hash = '#/auth';
    const el = await fixture<AppRoot>(html`<app-root></app-root>`);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('auth-screen')).not.toBeNull();
  });

  it('renders chat-view-screen for #/chat/1', async () => {
    mockState.set('ready');
    window.location.hash = '#/chat/1';
    const el = await fixture<AppRoot>(html`<app-root></app-root>`);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('chat-view-screen')).not.toBeNull();
  });
});
