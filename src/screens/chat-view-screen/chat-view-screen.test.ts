import { describe, it, expect, vi } from 'vitest';
import { signal } from '@lit-labs/signals';
import { fixture, html } from '@open-wc/testing';
import { ContextProvider } from '@lit/context';
import { servicesContext } from 'api/services-context';
import type { Services } from 'api/services-context';

const mockMessages = signal([]);
const mockInit = vi.fn();
const mockDispose = vi.fn();

vi.mock('./chat-view-store', () => ({
  ChatViewStore: function () {
    return { messages: mockMessages, init: mockInit, dispose: mockDispose };
  },
}));

import './chat-view-screen';
import type { ChatViewScreen } from './chat-view-screen';

function mockServices(): Services {
  return {
    apiClient: {
      send: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    authStore: {} as Services['authStore'],
    chatListStore: {
      chats: signal([]),
      getChat: vi.fn(() => null),
      init: vi.fn(),
      dispose: vi.fn(),
    } as unknown as Services['chatListStore'],
  };
}

function withContext(services: Services) {
  const provider = document.createElement('div');
  new ContextProvider(provider, { context: servicesContext, initialValue: services });

  return provider;
}

describe('chat-view-screen', () => {
  it('renders messages', async () => {
    const el = await fixture<ChatViewScreen>(html`
      <chat-view-screen
        .chatId=${1}
      ></chat-view-screen>
    `, { parentNode: withContext(mockServices()) });
    await el.updateComplete;

    const messages = el.shadowRoot!.querySelectorAll('.message');
    expect(messages.length).toBe(0);
  });

  it('renders contact name', async () => {
    const el = await fixture<ChatViewScreen>(html`
      <chat-view-screen
        .chatId=${1}
      ></chat-view-screen>
    `, { parentNode: withContext(mockServices()) });

    expect(el.shadowRoot!.querySelector('.contact')).not.toBeNull();
  });

  it('has a back button', async () => {
    const el = await fixture<ChatViewScreen>(html`
      <chat-view-screen
        .chatId=${1}
      ></chat-view-screen>
    `, { parentNode: withContext(mockServices()) });

    expect(el.shadowRoot!.querySelector('.back')).not.toBeNull();
  });
});
