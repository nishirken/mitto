import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing';
import { ContextProvider } from '@lit/context';
import { servicesContext } from 'api/services-context';
import type { Services } from 'api/services-context';
import { mockServices, mockSettingsStore } from 'api/__mocks__/telegram-client';
import { createFakeStorage, type FakeDatabase } from 'services/database/__mocks__/database';
import { DatabaseHub } from 'services/database/database-hub';
import { mockStoredMessage } from 'services/database/database-schema.mocks';
import type { MessageId, PeerId } from 'services/database';
import { DEFAULT_SETTINGS } from 'services/settings/settings-store';
import { InfiniteScrollContainer, PagedScrollContainer } from 'mudita-ui';
import { settled } from 'test-utils';
import './chat-view-screen';
import type { ChatViewScreen } from './chat-view-screen';

const peerId = 'user:1' as PeerId;

let fake: FakeDatabase;
let hub: DatabaseHub;
let services: Services;
let scrollToBottom: ReturnType<typeof vi.spyOn>;
let scrollToElement: ReturnType<typeof vi.spyOn>;

function withContext() {
  const provider = document.createElement('div');
  new ContextProvider(provider, { context: servicesContext, initialValue: services });

  return provider;
}

const mount = () =>
  fixture<ChatViewScreen>(html`<chat-view-screen .chatId=${peerId}></chat-view-screen>`, {
    parentNode: withContext(),
  });

// The screen scrolls only once the first batch of messages has been projected, which takes a
// hub round-trip through the database on top of the render.
async function deliverMessages(el: ChatViewScreen) {
  hub.notify('newMessages', []);
  await new Promise((resolve) => setTimeout(resolve, 0));
  await settled(el);
}

// Spying on the implementation rather than on `scroll-container` keeps the assertion honest:
// the outer element happily forwards into nothing while its inner container is unrendered.
describe('chat-view-screen initial scroll', () => {
  beforeEach(() => {
    const storage = createFakeStorage();
    fake = storage.fake;
    hub = new DatabaseHub();
    services = { ...mockServices, database: storage.storage, databaseHub: hub };
    mockSettingsStore.settings.set(DEFAULT_SETTINGS);
    scrollToBottom = vi.spyOn(InfiniteScrollContainer.prototype, 'scrollToBottom');
    scrollToElement = vi.spyOn(InfiniteScrollContainer.prototype, 'scrollToElement');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('scrolls to the bottom once the first messages arrive', async () => {
    await fake.putMessages([
      mockStoredMessage({ peerId, id: 1 as MessageId, isOutgoing: true }),
      mockStoredMessage({ peerId, id: 2 as MessageId, isOutgoing: true }),
    ]);
    const el = await mount();

    expect(scrollToBottom).not.toHaveBeenCalled();

    await deliverMessages(el);

    expect(scrollToBottom).toHaveBeenCalledTimes(1);
  });

  it('scrolls to the first unread message once the first messages arrive', async () => {
    await fake.putMessages([
      mockStoredMessage({ peerId, id: 1 as MessageId, isOutgoing: true }),
      mockStoredMessage({ peerId, id: 2 as MessageId }),
      mockStoredMessage({ peerId, id: 3 as MessageId }),
    ]);
    const el = await mount();

    await deliverMessages(el);

    expect(scrollToBottom).not.toHaveBeenCalled();
    expect(scrollToElement).toHaveBeenCalledTimes(1);
    const [target, options] = scrollToElement.mock.calls[0] as [Element, unknown];
    expect(target.getAttribute('data-message-id')).toBe('2');
    expect(options).toEqual({ position: 'start' });
  });

  it('reaches the paged implementation in paged mode', async () => {
    mockSettingsStore.settings.set({ ...DEFAULT_SETTINGS, messages: { pagedScroll: true } });
    const scrollToLastPage = vi.spyOn(PagedScrollContainer.prototype, 'scrollToLastPage');
    await fake.putMessages([mockStoredMessage({ peerId, id: 1 as MessageId, isOutgoing: true })]);
    const el = await mount();

    await deliverMessages(el);

    expect(scrollToLastPage).toHaveBeenCalledTimes(1);
  });

  it('waits instead of scrolling an empty chat', async () => {
    const el = await mount();

    await deliverMessages(el);

    expect(scrollToBottom).not.toHaveBeenCalled();
    expect(scrollToElement).not.toHaveBeenCalled();
  });
});
