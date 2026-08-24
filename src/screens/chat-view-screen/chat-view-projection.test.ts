import { beforeEach, describe, expect, test } from 'vitest';
import { MockDatabase } from '../../services/database/__mocks__/database';
import { DatabaseHub } from '../../services/database/database-hub';
import {
  mockStoredDialog,
  mockStoredMedia,
  mockStoredMessage,
} from '../../services/database/__mocks__/database-schema';
import type { MediaId, MessageId, PeerId } from '../../services/database/database-schema';
import { ChatViewProjection, isMessageRead, toMessageListItem } from './chat-view-projection';

const peerId = 'user:1' as PeerId;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

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
  let database: MockDatabase;
  let hub: DatabaseHub;
  let projection: ChatViewProjection;

  beforeEach(async () => {
    database = new MockDatabase();
    hub = new DatabaseHub();
    projection = new ChatViewProjection(database, hub, peerId);
    await projection.init();
  });

  test('fulfills media for a batch of messages', async () => {
    await database.putMedia([
      mockStoredMedia({ id: 'photo:9' as MediaId, width: 800, height: 480 }),
    ]);
    await database.putMessages([
      mockStoredMessage({ peerId, id: 1 as MessageId }),
      mockStoredMessage({ peerId, id: 2 as MessageId, mediaId: 'photo:9' as MediaId }),
    ]);

    hub.notify('newMessages', []);
    await flush();

    const messages = projection.messages.get();
    expect(messages).toHaveLength(2);
    expect(messages[0].media).toBeUndefined();
    expect(messages[1].media).toEqual({ id: 'photo:9', type: 'photo', width: 800, height: 480 });
  });

  test('fulfills media for a single new message', async () => {
    await database.putMedia([
      mockStoredMedia({ id: 'voice:9' as MediaId, type: 'voice', duration: 3 }),
    ]);
    await database.putMessages([
      mockStoredMessage({ peerId, id: 5 as MessageId, mediaId: 'voice:9' as MediaId }),
    ]);

    hub.notify('newMessage', { peerId, id: 5 as MessageId });
    await flush();

    expect(projection.messages.get()[0].media).toEqual({
      id: 'voice:9',
      type: 'voice',
      duration: 3,
    });
  });

  test('leaves media unset when the row is missing', async () => {
    await database.putMessages([
      mockStoredMessage({ peerId, id: 6 as MessageId, mediaId: 'photo:404' as MediaId }),
    ]);

    hub.notify('newMessage', { peerId, id: 6 as MessageId });
    await flush();

    expect(projection.messages.get()[0].media).toBeUndefined();
  });
});

describe('ChatViewProjection first messages', () => {
  let database: MockDatabase;
  let hub: DatabaseHub;
  let projection: ChatViewProjection;
  let resolved: boolean;

  beforeEach(async () => {
    database = new MockDatabase();
    hub = new DatabaseHub();
    projection = new ChatViewProjection(database, hub, peerId);
    resolved = false;
    void projection.firstMessages.then(() => {
      resolved = true;
    });
    await projection.init();
  });

  test('resolves once the first batch of messages arrives', async () => {
    await database.putMessages([mockStoredMessage({ peerId, id: 1 as MessageId })]);

    hub.notify('newMessages', []);
    await flush();

    expect(resolved).toBe(true);
  });

  test('stays pending while the chat has no messages', async () => {
    await database.putDialogs([mockStoredDialog({ peerId })]);

    hub.notify('newMessages', []);
    hub.notify('dialogRead', peerId);
    await flush();

    expect(resolved).toBe(false);
  });
});

describe('ChatViewProjection read state', () => {
  let database: MockDatabase;
  let hub: DatabaseHub;
  let projection: ChatViewProjection;

  const incoming = (id: number) => mockStoredMessage({ peerId, id: id as MessageId });
  const outgoing = (id: number) =>
    mockStoredMessage({ peerId, id: id as MessageId, isOutgoing: true });

  async function start(dialog: Partial<Parameters<typeof mockStoredDialog>[0]> = {}) {
    await database.putDialogs([mockStoredDialog({ peerId, ...dialog })]);
    projection = new ChatViewProjection(database, hub, peerId);
    await projection.init();
  }

  beforeEach(() => {
    database = new MockDatabase();
    hub = new DatabaseHub();
  });

  test('flags messages up to the dialog markers as read', async () => {
    await start({ readInboxMaxId: 2 as MessageId, readOutboxMaxId: 3 as MessageId });
    await database.putMessages([incoming(1), incoming(3), outgoing(2), outgoing(4)]);

    hub.notify('newMessages', []);
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
    await database.putMessages([incoming(1), incoming(3), incoming(4), outgoing(2)]);

    hub.notify('newMessages', []);
    await flush();

    expect(projection.firstUnreadId.get()).toBe(3);
  });

  test('reports no unread message once everything is read', async () => {
    await start({ readInboxMaxId: 9 as MessageId });
    await database.putMessages([incoming(1), incoming(2), outgoing(3)]);

    hub.notify('newMessages', []);
    await flush();

    expect(projection.firstUnreadId.get()).toBeUndefined();
  });

  test('re-derives read state when the markers advance', async () => {
    await start({ readOutboxMaxId: 0 as MessageId });
    await database.putMessages([outgoing(1)]);

    hub.notify('newMessages', []);
    await flush();
    expect(projection.messages.get()[0].isRead).toBe(false);

    await database.putDialogs([mockStoredDialog({ peerId, readOutboxMaxId: 1 as MessageId })]);
    hub.notify('dialogRead', peerId);
    await flush();

    expect(projection.messages.get()[0].isRead).toBe(true);
  });

  test('ignores read updates for another chat', async () => {
    await start({ readOutboxMaxId: 0 as MessageId });
    await database.putMessages([outgoing(1)]);

    hub.notify('newMessages', []);
    await flush();

    await database.putDialogs([mockStoredDialog({ peerId, readOutboxMaxId: 1 as MessageId })]);
    hub.notify('dialogRead', 'user:2' as PeerId);
    await flush();

    expect(projection.messages.get()[0].isRead).toBe(false);
  });
});
