import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { Database } from '../../services/database';
import { createTestDatabase } from '../../services/database/__mocks__/database';
import {
  mockStoredDialog,
  mockStoredMedia,
  mockStoredMessage,
} from '../../services/database/__mocks__/database-schema';
import type { MediaId, MessageId, PeerId } from '../../services/database/database-schema';
import { MediaRepository } from '../../services/repositories/media/media-repository';
import { MessageRepository } from '../../services/repositories/message/message-repository';
import { DialogRepository } from '../../services/repositories/dialog/dialog-repository';
import { ChatViewProjection, isMessageRead, toMessageListItem } from './chat-view-projection';

const peerId = 'user:1' as PeerId;
// Real IndexedDB writes take several macrotask turns to settle, and the handlers under test
// fire and forget, so one turn is not enough to observe them.
const flush = async () => {
  for (let i = 0; i < 10; i++) await new Promise((resolve) => setTimeout(resolve, 0));
};

describe('Message media', () => {
  test('projects a photo with its dimensions', () => {
    const media = mockStoredMedia({ id: 'photo:9' as MediaId, width: 1280, height: 960 });
    const message = mockStoredMessage({ mediaId: media.id });

    expect(toMessageListItem(message, media).media).toEqual({
      id: 'photo:9',
      type: 'photo',
      width: 1280,
      height: 960,
    });
  });

  test('projects a video with dimensions and duration', () => {
    const media = mockStoredMedia({
      id: 'video:9' as MediaId,
      type: 'video',
      width: 640,
      height: 480,
      duration: 12,
    });

    expect(toMessageListItem(mockStoredMessage({ mediaId: media.id }), media).media).toEqual({
      id: 'video:9',
      type: 'video',
      width: 640,
      height: 480,
      duration: 12,
    });
  });

  test('projects a voice with duration only', () => {
    const media = mockStoredMedia({ id: 'voice:9' as MediaId, type: 'voice', duration: 7 });

    expect(toMessageListItem(mockStoredMessage({ mediaId: media.id }), media).media).toEqual({
      id: 'voice:9',
      type: 'voice',
      duration: 7,
    });
  });

  test('leaves media unset without a media row', () => {
    expect(toMessageListItem(mockStoredMessage()).media).toBeUndefined();
  });
});

describe('isMessageRead', () => {
  const markers = { inbox: 10 as MessageId, outbox: 5 as MessageId };

  test('reads an incoming message against the inbox marker', () => {
    const at = (id: number) => mockStoredMessage({ id: id as MessageId, isOutgoing: false });

    expect(isMessageRead(at(10), markers)).toBe(true);
    expect(isMessageRead(at(11), markers)).toBe(false);
  });

  test('reads an outgoing message against the outbox marker', () => {
    const at = (id: number) => mockStoredMessage({ id: id as MessageId, isOutgoing: true });

    expect(isMessageRead(at(5), markers)).toBe(true);
    expect(isMessageRead(at(6), markers)).toBe(false);
  });

  test('treats everything as unread without markers', () => {
    expect(toMessageListItem(mockStoredMessage({ id: 1 as MessageId })).isRead).toBe(false);
  });
});

describe('ChatViewProjection', () => {
  let database: Database;
  let projection: ChatViewProjection;

  afterEach(() => projection.dispose());

  beforeEach(async () => {
    database = createTestDatabase();
    projection = new ChatViewProjection(database, peerId);
    projection.init();
  });

  test('fulfills media for a batch of messages', async () => {
    await database.media.bulkPut([
      mockStoredMedia({ id: 'photo:9' as MediaId, width: 800, height: 480 }),
    ]);
    await database.messages.bulkPut([
      mockStoredMessage({ peerId, id: 1 as MessageId }),
      mockStoredMessage({ peerId, id: 2 as MessageId, mediaId: 'photo:9' as MediaId }),
    ]);

    await flush();

    const messages = projection.messages.get();
    expect(messages).toHaveLength(2);
    expect(messages[0].media).toBeUndefined();
    expect(messages[1].media).toEqual({ id: 'photo:9', type: 'photo', width: 800, height: 480 });
  });

  test('fulfills media for a single new message', async () => {
    await database.media.bulkPut([
      mockStoredMedia({ id: 'voice:9' as MediaId, type: 'voice', duration: 3 }),
    ]);
    await database.messages.bulkPut([
      mockStoredMessage({ peerId, id: 5 as MessageId, mediaId: 'voice:9' as MediaId }),
    ]);

    await flush();

    expect(projection.messages.get()[0].media).toEqual({
      id: 'voice:9',
      type: 'voice',
      duration: 3,
    });
  });

  test('leaves media unset when the row is missing', async () => {
    await database.messages.bulkPut([
      mockStoredMessage({ peerId, id: 6 as MessageId, mediaId: 'photo:404' as MediaId }),
    ]);

    await flush();

    expect(projection.messages.get()[0].media).toBeUndefined();
  });
});

describe('ChatViewProjection first messages', () => {
  let database: Database;
  let projection: ChatViewProjection;

  let resolved: boolean;

  afterEach(() => projection.dispose());

  beforeEach(async () => {
    database = createTestDatabase();
    projection = new ChatViewProjection(database, peerId);
    resolved = false;
    void projection.firstMessages.then(() => {
      resolved = true;
    });
    projection.init();
  });

  test('resolves once the first batch of messages arrives', async () => {
    await database.messages.bulkPut([mockStoredMessage({ peerId, id: 1 as MessageId })]);

    await flush();

    expect(resolved).toBe(true);
  });

  test('stays pending while the chat has no messages', async () => {
    await database.dialogs.bulkPut([mockStoredDialog({ peerId })]);

    await flush();

    expect(resolved).toBe(false);
  });
});

describe('ChatViewProjection read state', () => {
  let database: Database;
  let projection: ChatViewProjection;

  afterEach(() => projection.dispose());

  const incoming = (id: number) => mockStoredMessage({ peerId, id: id as MessageId });
  const outgoing = (id: number) =>
    mockStoredMessage({ peerId, id: id as MessageId, isOutgoing: true });

  async function start(dialog: Partial<Parameters<typeof mockStoredDialog>[0]> = {}) {
    await database.dialogs.bulkPut([mockStoredDialog({ peerId, ...dialog })]);
    projection = new ChatViewProjection(database, peerId);
    projection.init();
  }

  beforeEach(() => {
    database = createTestDatabase();
  });

  test('flags messages up to the dialog markers as read', async () => {
    await start({ readInboxMaxId: 2 as MessageId, readOutboxMaxId: 3 as MessageId });
    await database.messages.bulkPut([incoming(1), incoming(3), outgoing(2), outgoing(4)]);

    await flush();

    const readById = new Map(projection.messages.get().map((m) => [m.id, m.isRead]));
    expect(readById).toEqual(
      new Map([
        [1, true],
        [2, true],
        [3, false],
        [4, false],
      ]),
    );
  });

  test('points at the oldest unread incoming message', async () => {
    await start({ readInboxMaxId: 2 as MessageId });
    await database.messages.bulkPut([incoming(1), incoming(3), incoming(4), outgoing(2)]);

    await flush();

    expect(projection.firstUnreadId.get()).toBe(3);
  });

  test('reports no unread message once everything is read', async () => {
    await start({ readInboxMaxId: 9 as MessageId });
    await database.messages.bulkPut([incoming(1), incoming(2), outgoing(3)]);

    await flush();

    expect(projection.firstUnreadId.get()).toBeUndefined();
  });

  test('re-derives read state when the markers advance', async () => {
    await start({ readOutboxMaxId: 0 as MessageId });
    await database.messages.bulkPut([outgoing(1)]);

    await flush();
    expect(projection.messages.get()[0].isRead).toBe(false);

    await database.dialogs.bulkPut([mockStoredDialog({ peerId, readOutboxMaxId: 1 as MessageId })]);
    await flush();

    expect(projection.messages.get()[0].isRead).toBe(true);
  });

  test('ignores read updates for another chat', async () => {
    await start({ readOutboxMaxId: 0 as MessageId });
    await database.messages.bulkPut([outgoing(1)]);

    await flush();

    await database.dialogs.bulkPut([
      mockStoredDialog({ peerId: 'user:2' as PeerId, readOutboxMaxId: 1 as MessageId }),
    ]);
    await flush();

    expect(projection.messages.get()[0].isRead).toBe(false);
  });
});

// Replaces the hub-notification tests the repositories used to carry: the point is that a
// repository write reaches the read model, which is now liveQuery's job rather than ours.
describe('ChatViewProjection end to end', () => {
  let database: Database;
  let projection: ChatViewProjection;

  afterEach(() => projection.dispose());

  beforeEach(() => {
    database = createTestDatabase();
    projection = new ChatViewProjection(database, peerId);
    projection.init();
  });

  test('picks up a message written through the repository', async () => {
    const repo = new MessageRepository(database, new MediaRepository(database));

    await repo.applyNewMessage(mockStoredMessage({ peerId, id: 5 as MessageId, text: 'sent' }));

    await vi.waitFor(() => {
      const messages = projection.messages.get();
      expect(messages).toHaveLength(1);
      expect(messages[0].text).toBe('sent');
    });
  });

  test('picks up read markers written through the repository', async () => {
    const repo = new DialogRepository(database, new MediaRepository(database));
    await database.dialogs.bulkPut([mockStoredDialog({ peerId, readInboxMaxId: 0 as MessageId })]);
    await database.messages.bulkPut([mockStoredMessage({ peerId, id: 1 as MessageId })]);
    await vi.waitFor(() => expect(projection.messages.get()).toHaveLength(1));
    expect(projection.messages.get()[0].isRead).toBe(false);

    await repo.applyReadInbox(peerId, 1 as MessageId, 0);

    await vi.waitFor(() => expect(projection.messages.get()[0].isRead).toBe(true));
  });
});
