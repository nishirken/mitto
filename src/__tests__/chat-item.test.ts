import { describe, it, expect } from 'vitest';
import { fixture, html } from '@open-wc/testing';
import '../components/chat-item';
import type { ChatItem } from '../components/chat-item';

describe('chat-item', () => {
  it('renders all fields', async () => {
    const el = await fixture<ChatItem>(html`
      <chat-item
        avatarLetter="A"
        name="Alice"
        timestamp="14:32"
        preview="Hello there"
        .unreadCount=${3}
      ></chat-item>
    `);

    const shadow = el.shadowRoot!;
    expect(shadow.querySelector('.avatar')!.textContent).toBe('A');
    expect(shadow.querySelector('.name')!.textContent).toBe('Alice');
    expect(shadow.querySelector('.time')!.textContent).toBe('14:32');
    expect(shadow.querySelector('.preview')!.textContent).toBe('Hello there');
    expect(shadow.querySelector('.badge')!.textContent).toBe('3');
  });

  it('hides badge when unreadCount is 0', async () => {
    const el = await fixture<ChatItem>(html`
      <chat-item
        avatarLetter="B"
        name="Bob"
        timestamp="13:00"
        preview="Hi"
        .unreadCount=${0}
      ></chat-item>
    `);

    expect(el.shadowRoot!.querySelector('.badge')).toBeNull();
  });
});
