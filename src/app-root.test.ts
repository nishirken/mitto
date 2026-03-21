import { describe, it, expect, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing';

vi.mock('./telegram-client');

import './app-root';
import type { AppRoot } from './app-root';
import { telegramClient } from './telegram-client';

describe('app-root', () => {
  it('renders chat-list-screen for #/chats', async () => {
    vi.mocked(telegramClient.onAuthStateChange).mockImplementation((cb) => cb('ready'));
    window.location.hash = '#/chats';
    const el = await fixture<AppRoot>(html`<app-root></app-root>`);
    expect(el.shadowRoot!.querySelector('chat-list-screen')).not.toBeNull();
  });

  it('renders auth-screen for #/auth', async () => {
    vi.mocked(telegramClient.onAuthStateChange).mockImplementation((cb) => cb('wait_phone'));
    window.location.hash = '#/auth';
    const el = await fixture<AppRoot>(html`<app-root></app-root>`);
    expect(el.shadowRoot!.querySelector('auth-screen')).not.toBeNull();
  });

  it('renders chat-view-screen for #/chat/1', async () => {
    window.location.hash = '#/chat/1';
    // Set auth to ready without triggering navigate, so the existing hash is preserved
    vi.mocked(telegramClient.onAuthStateChange).mockImplementation(() => {});
    const el = await fixture<AppRoot>(html`<app-root></app-root>`);
    // Manually set auth state to ready so it renders the route
    (el as unknown as { _authState: string })._authState = 'ready';
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('chat-view-screen')).not.toBeNull();
  });
});
