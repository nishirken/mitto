import { describe, it, expect } from 'vitest';
import { fixture, html } from '@open-wc/testing';
import { Chat } from '../types/telegram';
import './chat-list-screen';
import type { ChatListScreen } from './chat-list-screen';

const testChats: Chat[] = [
  { id: 1, name: 'Alice', lastMessage: 'Hi', timestamp: '14:32', unreadCount: 3, avatarLetter: 'A' },
  { id: 2, name: 'Bob', lastMessage: 'Hey', timestamp: '13:15', unreadCount: 0, avatarLetter: 'B' },
];

describe('chat-list-screen', () => {
  it('shows correct chat count', async () => {
    const el = await fixture<ChatListScreen>(html`
      <chat-list-screen .chats=${testChats}></chat-list-screen>
    `);

    const count = el.shadowRoot!.querySelector('.count')!;
    expect(count.textContent).toBe('2 chats');
  });

  it('renders correct number of chat items', async () => {
    const el = await fixture<ChatListScreen>(html`
      <chat-list-screen .chats=${testChats}></chat-list-screen>
    `);

    const items = el.shadowRoot!.querySelectorAll('chat-item');
    expect(items.length).toBe(2);
  });
});
