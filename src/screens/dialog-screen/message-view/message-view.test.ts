import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing';
import { tid } from '../../../test-utils';
import type { MediaId } from '../../../services/database';
import type { MessageMedia } from '../dialog-projection';
import './message-view';
import type { MessageView } from './message-view';

const photo: MessageMedia = {
  id: 'photo:1' as MediaId,
  type: 'photo',
  size: 240640,
  width: 800,
  height: 600,
};

const timestamp = Math.floor(new Date(2026, 8, 1, 14, 32).getTime() / 1000);

describe('message-view', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('renders text without a media block', async () => {
    const el = await fixture<MessageView>(
      html`<message-view timestamp=${timestamp} text="hi"></message-view>`,
    );

    expect(tid(el, 'message-view.text')!.textContent).toBe('hi');
    expect(tid(el, 'message-view.media')).toBeNull();
  });

  test('renders media without an empty text row', async () => {
    const el = await fixture<MessageView>(
      html`<message-view timestamp=${timestamp} .media=${photo}></message-view>`,
    );

    expect(tid(el, 'message-view.media')).not.toBeNull();
    expect(tid(el, 'message-view.text')).toBeNull();
  });

  test('renders media above text when a caption is present', async () => {
    const el = await fixture<MessageView>(
      html`<message-view timestamp=${timestamp} text="caption" .media=${photo}></message-view>`,
    );

    const media = tid(el, 'message-view.media')!;
    const text = tid(el, 'message-view.text')!;

    expect(media.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test('marks an outgoing message as sent until the peer reads it', async () => {
    const el = await fixture<MessageView>(
      html`<message-view timestamp=${timestamp} outgoing text="hi"></message-view>`,
    );

    expect(tid(el, 'message-view.status')).toHaveProperty('type', 'check');
  });

  test('marks an outgoing message as read once the peer reads it', async () => {
    const el = await fixture<MessageView>(
      html`<message-view timestamp=${timestamp} outgoing read text="hi"></message-view>`,
    );

    expect(tid(el, 'message-view.status')).toHaveProperty('type', 'check-double');
  });

  test('omits the status mark on an incoming message', async () => {
    const el = await fixture<MessageView>(
      html`<message-view timestamp=${timestamp} read text="hi"></message-view>`,
    );

    expect(tid(el, 'message-view.status')).toBeNull();
  });

  test('renders a voice note with its own player', async () => {
    const voice: MessageMedia = { id: 'voice:1' as MediaId, type: 'voice', duration: 3 };
    const el = await fixture<MessageView>(
      html`<message-view timestamp=${timestamp} .media=${voice}></message-view>`,
    );

    expect(tid(el, 'message-view.voice')).not.toBeNull();
    expect(tid(el, 'message-view.media')).toBeNull();
  });

  test('renders the formatted timestamp', async () => {
    vi.setSystemTime(new Date('2026-09-01T14:32:00Z'));
    const el = await fixture<MessageView>(
      html`<message-view timestamp=${timestamp} text="hi"></message-view>`,
    );

    expect(el.shadowRoot!.querySelector('.msg-time')!.textContent).toBe('14:32');
  });
});
