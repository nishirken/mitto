import { beforeEach, describe, expect, test } from 'vitest';
import type { Database } from '../../database';
import { createTestDatabase } from '../../database/__mocks__/database';
import { mockStoredDialog } from '../../database/__mocks__/database-schema';
import type { MessageId, PeerId } from '../../database';
import { MediaRepository } from '../media/media-repository';
import { DialogRepository } from './dialog-repository';

const peerId = 'user:1' as PeerId;

describe('DialogRepository read markers', () => {
  let database: Database;
  let repo: DialogRepository;

  beforeEach(async () => {
    database = createTestDatabase();
    repo = new DialogRepository(database, new MediaRepository(database));
    await database.dialogs.bulkPut([
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

    expect(await database.dialogs.get(peerId)).toMatchObject({
      readInboxMaxId: 20,
      unreadCount: 1,
    });
  });

  test('advances the outbox marker without touching the unread count', async () => {
    await repo.applyReadOutbox(peerId, 12 as MessageId);

    expect(await database.dialogs.get(peerId)).toMatchObject({
      readOutboxMaxId: 12,
      unreadCount: 4,
    });
  });

  test('keeps the markers monotonic when updates arrive out of order', async () => {
    await repo.applyReadInbox(peerId, 5 as MessageId, 9);
    await repo.applyReadOutbox(peerId, 3 as MessageId);

    expect(await database.dialogs.get(peerId)).toMatchObject({
      readInboxMaxId: 10,
      readOutboxMaxId: 6,
      unreadCount: 4,
    });
  });

  test('ignores a read update for a dialog it has never seen', async () => {
    await repo.applyReadInbox('user:404' as PeerId, 20 as MessageId, 0);

    expect(await database.dialogs.get('user:404' as PeerId)).toBeUndefined();
  });
});
