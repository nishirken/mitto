import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createFakeStorage, type FakeDatabase } from '../../database/__mocks__/database';
import { DatabaseHub } from '../../database/database-hub';
import { mockStoredDialog } from '../../database/database-schema.mocks';
import type { Database, MessageId, PeerId } from '../../database';
import { MediaRepository } from '../media/media-repository';
import { DialogRepository } from './dialog-repository';

const peerId = 'user:1' as PeerId;

describe('DialogRepository read markers', () => {
  let storage: Database;
  let fake: FakeDatabase;
  let hub: DatabaseHub;
  let repo: DialogRepository;

  beforeEach(async () => {
    ({ storage, fake } = createFakeStorage());
    hub = new DatabaseHub();
    repo = new DialogRepository(storage, hub, new MediaRepository(storage));
    await fake.putDialogs([
      mockStoredDialog({
        peerId,
        unreadCount: 4,
        readInboxMaxId: 10 as MessageId,
        readOutboxMaxId: 6 as MessageId,
      }),
    ]);
  });

  test('advances the inbox marker and adopts the remaining unread count', async () => {
    await repo.applyReadInbox(peerId, 20 as MessageId, 1);

    expect(fake.dialogs.get(peerId)).toMatchObject({ readInboxMaxId: 20, unreadCount: 1 });
  });

  test('advances the outbox marker without touching the unread count', async () => {
    await repo.applyReadOutbox(peerId, 12 as MessageId);

    expect(fake.dialogs.get(peerId)).toMatchObject({ readOutboxMaxId: 12, unreadCount: 4 });
  });

  test('keeps the markers monotonic when updates arrive out of order', async () => {
    await repo.applyReadInbox(peerId, 5 as MessageId, 9);
    await repo.applyReadOutbox(peerId, 3 as MessageId);

    expect(fake.dialogs.get(peerId)).toMatchObject({
      readInboxMaxId: 10,
      readOutboxMaxId: 6,
      unreadCount: 4,
    });
  });

  test('announces a read dialog so read models can refresh', async () => {
    const listener = vi.fn();
    hub.subscribe('dialogRead', listener);

    await repo.applyReadInbox(peerId, 20 as MessageId, 0);

    expect(listener).toHaveBeenCalledWith(peerId);
  });

  test('stays silent when the markers do not move', async () => {
    const listener = vi.fn();
    hub.subscribe('dialogRead', listener);

    await repo.applyReadInbox(peerId, 10 as MessageId, 0);

    expect(listener).not.toHaveBeenCalled();
  });

  test('ignores a read update for a dialog it has never seen', async () => {
    await repo.applyReadInbox('user:404' as PeerId, 20 as MessageId, 0);

    expect(fake.dialogs.has('user:404')).toBe(false);
  });
});
