import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fixture, html } from '@open-wc/testing';
import './dialog-item';
import type { DialogItem } from './dialog-item';

describe('dialog-item', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const seconds = (date: Date): number => Math.floor(date.getTime() / 1000);

  it('renders all fields', async () => {
    const now = new Date(2026, 8, 1, 14, 32);
    vi.setSystemTime(now);
    const el = await fixture<DialogItem>(html`
      <dialog-item
        name="Alice"
        timestamp=${seconds(now)}
        message="Hello there"
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
    const now = new Date(2026, 8, 1, 14, 0);
    vi.setSystemTime(now);
    const el = await fixture<DialogItem>(html`
      <dialog-item
        name="Bob"
        timestamp=${seconds(now)}
        message="Hi"
        .unreadCount=${0}
      ></dialog-item>
    `);

    expect(el.shadowRoot!.querySelector('.badge')).toBeNull();
  });
});
