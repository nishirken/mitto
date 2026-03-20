import { describe, it, expect } from 'vitest';
import { fixture, html } from '@open-wc/testing';
import { Message } from '../types/telegram';
import '../components/chat-view-screen';
import type { ChatViewScreen } from '../components/chat-view-screen';

const testMessages: Message[] = [
  { id: 1, chatId: 1, text: 'Hello', timestamp: '14:30', isOutgoing: false },
  { id: 2, chatId: 1, text: 'Hi there', timestamp: '14:31', isOutgoing: true },
];

describe('chat-view-screen', () => {
  it('renders messages', async () => {
    const el = await fixture<ChatViewScreen>(html`
      <chat-view-screen
        contactName="Alice"
        .messages=${testMessages}
      ></chat-view-screen>
    `);

    const messages = el.shadowRoot!.querySelectorAll('.message');
    expect(messages.length).toBe(2);
    expect(messages[0].classList.contains('incoming')).toBe(true);
    expect(messages[1].classList.contains('outgoing')).toBe(true);
  });

  it('renders contact name', async () => {
    const el = await fixture<ChatViewScreen>(html`
      <chat-view-screen
        contactName="Alice"
        .messages=${testMessages}
      ></chat-view-screen>
    `);

    expect(el.shadowRoot!.querySelector('.contact')!.textContent).toBe('Alice');
  });

  it('has a back button', async () => {
    const el = await fixture<ChatViewScreen>(html`
      <chat-view-screen
        contactName="Alice"
        .messages=${[]}
      ></chat-view-screen>
    `);

    expect(el.shadowRoot!.querySelector('.back')).not.toBeNull();
  });
});
