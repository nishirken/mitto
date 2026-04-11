import { describe, it, expect, vi } from 'vitest';
import { signal } from '@lit-labs/signals';
import { fixture, html } from '@open-wc/testing';
import { ContextProvider } from '@lit/context';
import { servicesContext } from 'api/services-context';
import type { Services } from 'api/services-context';
import type { ChatEntry } from './chat-list-store';
import './chat-list-screen';
import type { ChatListScreen } from './chat-list-screen';

const testChats: ChatEntry[] = [
  { id: 1, name: 'Alice', lastMessage: { id: 100, text: 'Hi' }, timestamp: '14:32', unreadCount: 3 },
  { id: 2, name: 'Bob', lastMessage: { id: 200, text: 'Hey' }, timestamp: '13:15', unreadCount: 0 },
];

function mockServices() {
  const chatsSignal = signal<ChatEntry[]>([]);
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
    authStore: {} as Services['authStore'],
    chatListStore: {
      chats: chatsSignal,
      getChat: vi.fn(() => null),
      init: vi.fn(),
      dispose: vi.fn(),
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
});
