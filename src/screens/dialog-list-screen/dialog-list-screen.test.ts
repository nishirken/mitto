import { expect, beforeEach, describe, it, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing';
import { ContextProvider } from '@lit/context';
import { servicesContext } from 'api/services-context';
import type { Services } from 'api/services-context';
import { createMockServices } from 'api/__mocks__/services-context';
import type { Database } from 'services/database';
import { createTestDatabase } from 'services/database/__mocks__/database';
import {
  mockStoredDialog,
  mockStoredMessage,
  mockStoredUser,
} from 'services/database/__mocks__/database-schema';
import type { MessageId, PeerId, UserId } from 'services/database';
import { MediaRepository } from 'services/repositories/media/media-repository';
import { DialogRepository } from 'services/repositories/dialog/dialog-repository';
import type { Timestamp } from 'utils/flavour';
import { DEFAULT_SETTINGS } from 'services/settings/settings-store';
import './dialog-list-screen';
import type { DialogListScreen } from './dialog-list-screen';
import type { DialogItem } from './dialog-item';

let database: Database;
let services: Services;

function withContext() {
  const provider = document.createElement('div');
  new ContextProvider(provider, { context: servicesContext, initialValue: services });

  return provider;
}

const mount = () =>
  fixture<DialogListScreen>(html`<dialog-list-screen></dialog-list-screen>`, {
    parentNode: withContext(),
  });

type DialogSeed = {
  firstName?: string;
  lastName?: string;
  text?: string;
  date?: number;
  unreadCount?: number;
};

async function seedDialog(n: number, seed: DialogSeed = {}): Promise<UserId> {
  const peerId = `user:${n}` as UserId;
  const topMessageId = n as MessageId;

  await database.users.bulkPut([
    mockStoredUser({
      id: peerId,
      firstName: seed.firstName ?? 'User',
      lastName: seed.lastName ?? String(n),
    }),
  ]);
  await database.messages.bulkPut([
    mockStoredMessage({ peerId, id: topMessageId, text: seed.text ?? `message ${n}` }),
  ]);
  await database.dialogs.bulkPut([
    mockStoredDialog({
      peerId,
      topMessageId,
      date: (seed.date ?? n) as Timestamp,
      unreadCount: seed.unreadCount ?? 0,
    }),
  ]);

  return peerId;
}

const dialogItems = (el: DialogListScreen) => [
  ...el.shadowRoot!.querySelectorAll<DialogItem>('dialog-item'),
];

beforeEach(() => {
  database = createTestDatabase();
  services = createMockServices({ database });
  services.settingsStore.settings.set(DEFAULT_SETTINGS);
  window.location.hash = '#/dialogs';
});

describe('Dialog list screen', () => {
  it('Render dialogs', async () => {
    await seedDialog(1, {
      text: 'Hello',
    });
    await seedDialog(2, {
      text: 'Hi',
    });
    const el = await mount();

    await vi.waitFor(async () => {
      await el.updateComplete;
      expect(dialogItems(el)).toHaveLength(2);
    });
  });

  // Replaces the hub-notification tests the repositories used to carry: a repository write
  // has to reach the read model, which is liveQuery's job now rather than ours.
  it('picks up a dialog written through the repository', async () => {
    await seedDialog(1);
    const el = await mount();
    await vi.waitFor(async () => {
      await el.updateComplete;
      expect(dialogItems(el)).toHaveLength(1);
    });

    const repo = new DialogRepository(database, new MediaRepository(database));
    await repo.applyReadInbox('user:1' as PeerId, 1 as MessageId, 7);

    await vi.waitFor(async () => {
      await el.updateComplete;
      expect(dialogItems(el)[0].unreadCount).toBe(7);
    });
  });
});
