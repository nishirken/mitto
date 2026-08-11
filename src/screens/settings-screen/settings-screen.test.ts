import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing';
import { ContextProvider } from '@lit/context';
import { servicesContext } from 'api/services-context';
import {
  mockServices,
  mockSettingsStore,
  mockDatabase,
  mockAuthStore,
} from 'api/__mocks__/telegram-client';
import { DEFAULT_SETTINGS } from 'services/settings/settings-store';
import { tid } from 'test-utils';
import './settings-screen';
import type { SettingsScreen } from './settings-screen';
import type { MkCheckbox } from 'components/mk-checkbox/mk-checkbox';
import type { MkButton } from 'components/mk-button/mk-button';

function withContext() {
  const provider = document.createElement('div');
  new ContextProvider(provider, { context: servicesContext, initialValue: mockServices });

  return provider;
}

const mount = () =>
  fixture<SettingsScreen>(html`<settings-screen></settings-screen>`, { parentNode: withContext() });

const checkbox = (el: SettingsScreen, id: string) => tid(el, id) as MkCheckbox;

const signOut = (el: SettingsScreen) => tid(el, 'settings.sign-out') as MkButton;

const originalReload = window.location.reload;
const reload = vi.fn<() => void>();

describe('settings-screen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.hash = '#/settings';
    mockSettingsStore.settings.set(DEFAULT_SETTINGS);
    window.location.reload = reload;
  });

  afterEach(() => {
    window.location.reload = originalReload;
  });

  it('renders both sections', async () => {
    const el = await mount();

    const headings = [...el.shadowRoot!.querySelectorAll('h2')].map((h) => h.textContent);
    expect(headings).toEqual(['Conversations', 'Messages']);
  });

  it('renders a paged scroll checkbox in each section, both off by default', async () => {
    const el = await mount();

    const conversations = checkbox(el, 'settings.conversations.paged-scroll');
    const messages = checkbox(el, 'settings.messages.paged-scroll');
    expect(conversations.label).toBe('Paged scroll');
    expect(messages.label).toBe('Paged scroll');
    expect(conversations.checked).toBe(false);
    expect(messages.checked).toBe(false);
  });

  it('reflects the stored settings', async () => {
    mockSettingsStore.settings.set({
      conversations: { pagedScroll: true },
      messages: { pagedScroll: false },
    });

    const el = await mount();

    expect(checkbox(el, 'settings.conversations.paged-scroll').checked).toBe(true);
    expect(checkbox(el, 'settings.messages.paged-scroll').checked).toBe(false);
  });

  it('persists each section independently', async () => {
    const el = await mount();

    checkbox(el, 'settings.conversations.paged-scroll').shadowRoot!.querySelector('input')!.click();
    await el.updateComplete;

    expect(mockSettingsStore.settings.get()).toEqual({
      conversations: { pagedScroll: true },
      messages: { pagedScroll: false },
    });
    expect(mockDatabase.setSettings).toHaveBeenCalledWith({
      conversations: { pagedScroll: true },
      messages: { pagedScroll: false },
    });
    expect(checkbox(el, 'settings.messages.paged-scroll').checked).toBe(false);
  });

  it('renders a sign out button', async () => {
    const el = await mount();

    expect(signOut(el).textContent!.trim()).toBe('Sign out');
  });

  it('signs out, returns to the chat list and reloads', async () => {
    vi.mocked(mockAuthStore.logout).mockResolvedValue(true);
    const el = await mount();

    signOut(el).click();
    await vi.waitFor(() => expect(reload).toHaveBeenCalled());

    expect(mockAuthStore.logout).toHaveBeenCalledTimes(1);
    expect(window.location.hash).toBe('#/chats');
  });

  it('stays put when signing out fails', async () => {
    vi.mocked(mockAuthStore.logout).mockResolvedValue(false);
    const el = await mount();

    signOut(el).click();
    await vi.waitFor(() => expect(mockAuthStore.logout).toHaveBeenCalled());

    expect(reload).not.toHaveBeenCalled();
    expect(window.location.hash).toBe('#/settings');
  });

  it('disables the button while signing out', async () => {
    let finish!: (ok: boolean) => void;
    vi.mocked(mockAuthStore.logout).mockReturnValue(
      new Promise<boolean>((resolve) => {
        finish = resolve;
      }),
    );
    const el = await mount();

    signOut(el).click();
    await el.updateComplete;

    expect(signOut(el).disabled).toBe(true);
    expect(signOut(el).textContent!.trim()).toBe('Signing out…');

    finish(false);
    await vi.waitFor(async () => {
      await el.updateComplete;
      expect(signOut(el).disabled).toBe(false);
    });
  });

  it('navigates back to the chat list', async () => {
    const el = await mount();

    (tid(el, 'settings.back') as HTMLElement).click();

    expect(window.location.hash).toBe('#/chats');
  });
});
