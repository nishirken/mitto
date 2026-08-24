import { expect, beforeEach, describe, it } from 'vitest';
import { fixture, html } from '@open-wc/testing';
import { ContextProvider } from '@lit/context';
import { servicesContext } from 'api/services-context';
import type { Services } from 'api/services-context';
import { createMockServices } from 'api/__mocks__/services-context';
import { MockDatabase } from 'services/database/__mocks__/database';
import { DatabaseHub } from 'services/database/database-hub';
import {
  mockStoredDialog,
  mockStoredMessage,
  mockStoredUser,
} from 'services/database/__mocks__/database-schema';
import type { MessageId, UserId } from 'services/database';
import type { Timestamp } from 'utils/flavour';
import { DEFAULT_SETTINGS } from 'services/settings/settings-store';
import './chat-list-screen';
import type { ChatListScreen } from './chat-list-screen';
import type { ChatItem } from './chat-item';
import { settled } from '../../test-utils';

let database: MockDatabase;
let hub: DatabaseHub;
let services: Services;

function withContext() {
  const provider = document.createElement('div');
  new ContextProvider(provider, { context: servicesContext, initialValue: services });

  return provider;
}

const mount = () =>
  fixture<ChatListScreen>(html`<chat-list-screen></chat-list-screen>`, {
    parentNode: withContext(),
  });

type ChatSeed = {
  firstName?: string;
  lastName?: string;
  text?: string;
  date?: number;
  unreadCount?: number;
};

async function seedChat(n: number, seed: ChatSeed = {}): Promise<UserId> {
  const peerId = `user:${n}` as UserId;
  const topMessageId = n as MessageId;

  await database.putUsers([
    mockStoredUser({
      id: peerId,
      firstName: seed.firstName ?? 'User',
      lastName: seed.lastName ?? String(n),
    }),
  ]);
  await database.putMessages([
    mockStoredMessage({ peerId, id: topMessageId, text: seed.text ?? `message ${n}` }),
  ]);
  await database.putDialogs([
    mockStoredDialog({
      peerId,
      topMessageId,
      date: (seed.date ?? n) as Timestamp,
      unreadCount: seed.unreadCount ?? 0,
    }),
  ]);

  return peerId;
}

const chatItems = (el: ChatListScreen) => [
  ...el.shadowRoot!.querySelectorAll<ChatItem>('chat-item'),
];

beforeEach(() => {
  database = new MockDatabase();
  hub = new DatabaseHub();
  services = createMockServices({ database, databaseHub: hub });
  services.settingsStore.settings.set(DEFAULT_SETTINGS);
  window.location.hash = '#/chats';
});

describe('Chat list screen', () => {
  it('Render chats', async () => {
    await seedChat(1, {
      text: 'Hello',
    });
    await seedChat(2, {
      text: 'Hi',
    });
    const el = await mount();
    await settled(el);
    const items = chatItems(el);
    expect(items.length).toBe(2);
  });
});
