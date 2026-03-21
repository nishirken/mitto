import { describe, it, expect, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing';
import { Chat } from 'types/telegram';

vi.mock('api/telegram-client');

import { mockApiClient } from 'api/__mocks__/telegram-client';
import './chat-list-screen';
import type { ChatListScreen } from './chat-list-screen';

const testChats: Chat[] = [
  { id: 1, name: 'Alice', lastMessage: 'Hi', timestamp: '14:32', unreadCount: 3, avatarLetter: 'A' },
  { id: 2, name: 'Bob', lastMessage: 'Hey', timestamp: '13:15', unreadCount: 0, avatarLetter: 'B' },
];

describe('chat-list-screen', () => {
  it('shows correct chat count', async () => {
    vi.mocked(mockApiClient.onChatsChange).mockImplementation((cb) => {
      cb(testChats);
    });

    const el = await fixture<ChatListScreen>(html`
      <chat-list-screen .client=${mockApiClient}></chat-list-screen>
    `);

    const count = el.shadowRoot!.querySelector('.count')!;
    expect(count.textContent).toBe('2 chats');
  });

  it('renders correct number of chat items', async () => {
    vi.mocked(mockApiClient.onChatsChange).mockImplementation((cb) => {
      cb(testChats);
    });

    const el = await fixture<ChatListScreen>(html`
      <chat-list-screen .client=${mockApiClient}></chat-list-screen>
    `);

    const items = el.shadowRoot!.querySelectorAll('chat-item');
    expect(items.length).toBe(2);
  });
});
