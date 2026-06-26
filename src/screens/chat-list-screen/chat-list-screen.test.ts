import { describe, it, expect, vi } from 'vitest';
import { signal } from '@lit-labs/signals';
import { fixture, html } from '@open-wc/testing';
import { ContextProvider } from '@lit/context';
import { servicesContext } from 'api/services-context';
import type { Services } from 'api/services-context';
import './chat-list-screen';
import type { ChatListScreen } from './chat-list-screen';
import type { StoredChat } from 'services/offline-storage';

const testChats: StoredChat[] = [
  { id: 1, name: 'Alice', topMessage: { text: 'Hi' }, date: 0, unreadCount: 3 },
  { id: 2, name: 'Bob', topMessage: { text: 'Hey' }, date: 0, unreadCount: 0 },
];

function mockServices() {
  const chatsSignal = signal<StoredChat[]>([]);
  const services: Services = {
    client: {
      connect: vi.fn(),
      invoke: vi.fn(),
      addEventHandler: vi.fn(),
      removeEventHandler: vi.fn(),
      checkAuthorization: vi.fn(),
      sendCode: vi.fn(),
      session: { save: vi.fn() },
    } as unknown as Services['client'],
    offlineStorage: {} as Services['offlineStorage'],
    authStore: {} as Services['authStore'],
    chatListStore: {
      chats: chatsSignal,
      getChat: vi.fn(() => null),
      init: vi.fn(),
      dispose: vi.fn(),
      loadMore: vi.fn(),
    } as unknown as Services['chatListStore'],
  };

  return { services, chatsSignal };
}

function withContext(services: Services) {
  const provider = document.createElement('div');
  new ContextProvider(provider, { context: servicesContext, initialValue: services });

  return provider;
}

describe('chat-list-screen', () => {
  it('shows correct chat count', async () => {
    const { services, chatsSignal } = mockServices();
    const el = await fixture<ChatListScreen>(html`
      <chat-list-screen></chat-list-screen>
    `, { parentNode: withContext(services) });

    chatsSignal.set(testChats);
    await el.updateComplete;

    const count = el.shadowRoot!.querySelector('.count')!;
    expect(count.textContent).toBe('2 chats');
  });

  it('renders correct number of chat items', async () => {
    const { services, chatsSignal } = mockServices();
    const el = await fixture<ChatListScreen>(html`
      <chat-list-screen></chat-list-screen>
    `, { parentNode: withContext(services) });

    chatsSignal.set(testChats);
    await el.updateComplete;

    const items = el.shadowRoot!.querySelectorAll('chat-item');
    expect(items.length).toBe(2);
  });

  it('calls loadMore when scrolled to the last page', async () => {
    const { services, chatsSignal } = mockServices();
    const el = await fixture<ChatListScreen>(html`
      <chat-list-screen></chat-list-screen>
    `, { parentNode: withContext(services) });

    chatsSignal.set(testChats);
    await el.updateComplete;

    const scrollContainer = el.shadowRoot!.querySelector('scroll-container')!;
    const root = scrollContainer.shadowRoot!.querySelector('.root') as HTMLElement;
    Object.defineProperty(root, 'clientHeight', { value: 100, configurable: true });
    Object.defineProperty(root, 'scrollHeight', { value: 300, configurable: true });
    Object.defineProperty(root, 'scrollTop', { value: 200, configurable: true });

    // Flush any initial rAF from firstUpdated, then fire the page-change.
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    root.dispatchEvent(new Event('scroll'));
    await new Promise<void>((r) => requestAnimationFrame(() => r()));

    expect(services.chatListStore.loadMore).toHaveBeenCalled();
  });
});
