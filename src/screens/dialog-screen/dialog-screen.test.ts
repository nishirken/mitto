import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing';
import { ContextProvider } from '@lit/context';
import { servicesContext } from 'api/services-context';
import type { Services } from 'api/services-context';
import { createMockServices } from 'api/__mocks__/services-context';
import type { Database } from 'services/database';
import { createTestDatabase } from 'services/database/__mocks__/database';
import { mockStoredMessage } from 'services/database/__mocks__/database-schema';
import type { MessageId, PeerId } from 'services/database';
import { DEFAULT_SETTINGS } from 'services/settings/settings-store';
import { InfiniteScrollContainer, PagedScrollContainer } from 'mudita-ui';
import { settled } from 'test-utils';
import './dialog-screen';
import type { DialogScreen } from './dialog-screen';

const peerId = 'user:1' as PeerId;

let database: Database;
let services: Services;
let scrollToBottom: ReturnType<typeof vi.spyOn>;
let scrollToElement: ReturnType<typeof vi.spyOn>;

function withContext() {
  const provider = document.createElement('div');
  new ContextProvider(provider, { context: servicesContext, initialValue: services });

  return provider;
}

const mount = () =>
  fixture<DialogScreen>(html`<dialog-screen .peerId=${peerId}></dialog-screen>`, {
    parentNode: withContext(),
  });

// The screen scrolls only once the first batch of messages has been projected, which takes a
// liveQuery round-trip through the database on top of the render.
async function deliverMessages(el: DialogScreen) {
  for (let i = 0; i < 10; i++) await new Promise((resolve) => setTimeout(resolve, 0));
  await settled(el);
}

// Spying on the implementation rather than on `scroll-container` keeps the assertion honest:
// the outer element happily forwards into nothing while its inner container is unrendered.
describe('dialog-screen initial scroll', () => {
  beforeEach(() => {
    database = createTestDatabase();
    services = createMockServices({ database });
    services.settingsStore.settings.set(DEFAULT_SETTINGS);
    scrollToBottom = vi.spyOn(InfiniteScrollContainer.prototype, 'scrollToBottom');
    scrollToElement = vi.spyOn(InfiniteScrollContainer.prototype, 'scrollToElement');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('scrolls to the bottom once the first messages arrive', async () => {
    await database.messages.bulkPut([
      mockStoredMessage({ peerId, id: 1 as MessageId, isOutgoing: true }),
      mockStoredMessage({ peerId, id: 2 as MessageId, isOutgoing: true }),
    ]);
    const el = await mount();

    expect(scrollToBottom).not.toHaveBeenCalled();

    await deliverMessages(el);

    expect(scrollToBottom).toHaveBeenCalledTimes(1);
  });

  it('scrolls to the first unread message once the first messages arrive', async () => {
    await database.messages.bulkPut([
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
    services.settingsStore.settings.set({ ...DEFAULT_SETTINGS, messages: { pagedScroll: true } });
    const scrollToLastPage = vi.spyOn(PagedScrollContainer.prototype, 'scrollToLastPage');
    await database.messages.bulkPut([
      mockStoredMessage({ peerId, id: 1 as MessageId, isOutgoing: true }),
    ]);
    const el = await mount();

    await deliverMessages(el);

    expect(scrollToLastPage).toHaveBeenCalledTimes(1);
  });

  it('waits instead of scrolling an empty dialog', async () => {
    const el = await mount();

    await deliverMessages(el);

    expect(scrollToBottom).not.toHaveBeenCalled();
    expect(scrollToElement).not.toHaveBeenCalled();
  });
});
