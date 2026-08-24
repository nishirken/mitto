import { describe, it, expect } from 'vitest';
import { fixture, html } from '@open-wc/testing';
import './dialog-item';
import type { DialogItem } from './dialog-item';

describe('dialog-item', () => {
  it('renders all fields', async () => {
    const el = await fixture<DialogItem>(html`
      <dialog-item
        name="Alice"
        timestamp="14:32"
        preview="Hello there"
        .unreadCount=${3}
      ></dialog-item>
    `);

    const shadow = el.shadowRoot!;
    expect(shadow.querySelector('.name')!.textContent).toBe('Alice');
    expect(shadow.querySelector('.time')!.textContent).toBe('14:32');
    expect(shadow.querySelector('.preview')!.textContent).toBe('Hello there');
    expect((shadow.querySelector('.badge') as HTMLElement & { count: number }).count).toBe(3);
  });

  it('hides badge when unreadCount is 0', async () => {
    const el = await fixture<DialogItem>(html`
      <dialog-item
        name="Bob"
        timestamp="13:00"
        preview="Hi"
        .unreadCount=${0}
      ></dialog-item>
    `);

    expect(el.shadowRoot!.querySelector('.badge')).toBeNull();
  });
});
