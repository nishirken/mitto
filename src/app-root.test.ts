import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fixture, html } from '@open-wc/testing';
import { mockApiClient } from 'api/__mocks__/telegram-client';

vi.mock('api/telegram-client', () => ({
  TelegramClient: function () { return mockApiClient; },
}));

import 'app-root';
import type { AppRoot } from 'app-root';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('app-root', () => {
  it('renders chat-list-screen for #/chats', async () => {
    vi.mocked(mockApiClient.onAuthStateChange).mockImplementation((cb) => cb('ready'));
    window.location.hash = '#/chats';
    const el = await fixture<AppRoot>(html`<app-root></app-root>`);
    expect(el.shadowRoot!.querySelector('chat-list-screen')).not.toBeNull();
  });

  it('renders auth-screen for #/auth', async () => {
    vi.mocked(mockApiClient.onAuthStateChange).mockImplementation((cb) => cb('wait_phone'));
    window.location.hash = '#/auth';
    const el = await fixture<AppRoot>(html`<app-root></app-root>`);
    expect(el.shadowRoot!.querySelector('auth-screen')).not.toBeNull();
  });

  it('renders chat-view-screen for #/chat/1', async () => {
    window.location.hash = '#/chat/1';
    vi.mocked(mockApiClient.onAuthStateChange).mockImplementation(() => {});
    const el = await fixture<AppRoot>(html`<app-root></app-root>`);
    (el as unknown as { _authState: string })._authState = 'ready';
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('chat-view-screen')).not.toBeNull();
  });
});
