import { describe, it, expect } from 'vitest';
import { fixture, html } from '@open-wc/testing';
import '../app-root';
import type { AppRoot } from '../app-root';

describe('app-root', () => {
  it('renders chat-list-screen for #/chats', async () => {
    window.location.hash = '#/chats';
    const el = await fixture<AppRoot>(html`<app-root></app-root>`);
    expect(el.shadowRoot!.querySelector('chat-list-screen')).not.toBeNull();
  });

  it('renders auth-screen for #/auth', async () => {
    window.location.hash = '#/auth';
    const el = await fixture<AppRoot>(html`<app-root></app-root>`);
    expect(el.shadowRoot!.querySelector('auth-screen')).not.toBeNull();
  });

  it('renders chat-view-screen for #/chat/1', async () => {
    window.location.hash = '#/chat/1';
    const el = await fixture<AppRoot>(html`<app-root></app-root>`);
    expect(el.shadowRoot!.querySelector('chat-view-screen')).not.toBeNull();
  });
});
