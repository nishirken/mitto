import { describe, it, expect, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing';
import { ContextProvider } from '@lit/context';
import { servicesContext } from 'api/services-context';
import type { Services } from 'api/services-context';
import { Chat } from 'types/telegram';
import './chat-list-screen';
import type { ChatListScreen } from './chat-list-screen';

const testChats: Chat[] = [
  { id: 1, name: 'Alice', lastMessage: 'Hi', timestamp: '14:32', unreadCount: 3, avatarLetter: 'A' },
  { id: 2, name: 'Bob', lastMessage: 'Hey', timestamp: '13:15', unreadCount: 0, avatarLetter: 'B' },
];

type Listener = (event: Record<string, unknown>) => void;

function mockServices() {
  const listeners = new Map<string, Set<Listener>>();
  const services: Services = {
    apiClient: {
      init: vi.fn(),
      send: vi.fn(),
      addEventListener: vi.fn((event: string, cb: Listener) => {
        let set = listeners.get(event);
        if (!set) {
          set = new Set();
          listeners.set(event, set);
        }
        set.add(cb);
      }),
      removeEventListener: vi.fn(),
    },
    authClient: {
      sendPhoneNumber: vi.fn(),
      sendAuthCode: vi.fn(),
    },
    chatsClient: {
      loadChats: vi.fn(),
      getChat: vi.fn(),
    },
  };

  return { services, listeners };
}

function withContext(services: Services) {
  const provider = document.createElement('div');
  new ContextProvider(provider, { context: servicesContext, initialValue: services });

  return provider;
}

function emitNewChat(listeners: Map<string, Set<Listener>>, chat: Chat) {
  const set = listeners.get('updateNewChat');
  if (set) {
    for (const cb of set) {
      cb({
        '@type': 'updateNewChat',
        chat: {
          id: chat.id,
          title: chat.name,
          unread_count: chat.unreadCount,
          last_message: chat.lastMessage ? {
            content: { '@type': 'messageText', text: { text: chat.lastMessage } },
          } : undefined,
        },
      });
    }
  }
}

describe('chat-list-screen', () => {
  it('shows correct chat count', async () => {
    const { services, listeners } = mockServices();
    const el = await fixture<ChatListScreen>(html`
      <chat-list-screen></chat-list-screen>
    `, { parentNode: withContext(services) });

    for (const chat of testChats) {
      emitNewChat(listeners, chat);
    }
    await el.updateComplete;

    const count = el.shadowRoot!.querySelector('.count')!;
    expect(count.textContent).toBe('2 chats');
  });

  it('renders correct number of chat items', async () => {
    const { services, listeners } = mockServices();
    const el = await fixture<ChatListScreen>(html`
      <chat-list-screen></chat-list-screen>
    `, { parentNode: withContext(services) });

    for (const chat of testChats) {
      emitNewChat(listeners, chat);
    }
    await el.updateComplete;

    const items = el.shadowRoot!.querySelectorAll('chat-item');
    expect(items.length).toBe(2);
  });
});
