import { beforeEach, describe, expect, test, vi } from 'vitest';
import telegram from 'telegram';
import type { Api as ApiTypes, events, TelegramClient } from 'telegram';
import { MockDatabase } from '../../services/database/__mocks__/database';
import { DatabaseHub } from '../../services/database/database-hub';
import type { PeerId } from '../../services/database';
import {
  mockStoredDialog,
  mockStoredUser,
} from '../../services/database/__mocks__/database-schema';
import { MediaRepository } from '../../services/repositories/media/media-repository';
import { MessageRepository } from '../../services/repositories/message/message-repository';
import { DialogRepository } from '../../services/repositories/dialog/dialog-repository';
import { DialogSyncService } from './dialog-sync-service';

const { Api } = telegram;
const big = (n: string) => n as unknown as BigInteger;
const peerId = 'user:1' as PeerId;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function photoMessage() {
  return new Api.Message({
    id: 5,
    peerId: new Api.PeerUser({ userId: big('1') }),
    date: 1000,
    message: '',
    media: new Api.MessageMediaPhoto({
      photo: new Api.Photo({
        id: big('10'),
        accessHash: big('99'),
        fileReference: new Uint8Array([1, 2]),
        date: 1000,
        sizes: [new Api.PhotoSize({ type: 'x', w: 800, h: 600, size: 4000 })],
        dcId: 2,
      }),
    }),
  });
}

describe('DialogSyncService', () => {
  let database: MockDatabase;
  let client: { addEventHandler: ReturnType<typeof vi.fn>; invoke: ReturnType<typeof vi.fn> };
  let service: DialogSyncService;

  const handlerFor = (index: number) => client.addEventHandler.mock.calls[index][0];

  beforeEach(async () => {
    database = new MockDatabase();
    await database.putUsers([mockStoredUser({ id: 'user:1' })]);
    await database.putDialogs([mockStoredDialog({ peerId, unreadCount: 3 })]);

    client = {
      addEventHandler: vi.fn(),
      invoke: vi.fn(
        async () =>
          new Api.messages.Messages({
            messages: [],
            chats: [],
            users: [],
          }),
      ),
    };

    const hub = new DatabaseHub();
    const media = new MediaRepository(database);
    const repo = new MessageRepository(database, hub, media);
    const dialogRepo = new DialogRepository(database, hub, media);
    service = new DialogSyncService(
      client as unknown as TelegramClient,
      repo,
      dialogRepo,
      database,
      peerId,
    );
    await service.loadInitial();
  });

  test('stores media for a message that arrives live', async () => {
    const handler = handlerFor(0) as (e: events.NewMessageEvent) => void;

    handler({ message: photoMessage() } as events.NewMessageEvent);
    await flush();

    const message = await database.getMessage(peerId, 5);
    expect(message?.mediaId).toBe('photo:10');
    expect(database.media.get('photo:10')).toMatchObject({ type: 'photo', thumbSize: 'x' });
  });

  test('advances the inbox marker when the chat is read elsewhere', async () => {
    const handler = handlerFor(1) as (update: ApiTypes.TypeUpdate) => void;

    handler(
      new Api.UpdateReadHistoryInbox({
        peer: new Api.PeerUser({ userId: big('1') }),
        maxId: 42,
        stillUnreadCount: 0,
        pts: 1,
        ptsCount: 1,
      }),
    );
    await flush();

    expect(database.dialogs.get(peerId)).toMatchObject({ readInboxMaxId: 42, unreadCount: 0 });
  });

  test('advances the outbox marker when the peer reads our messages', async () => {
    const handler = handlerFor(1) as (update: ApiTypes.TypeUpdate) => void;

    handler(
      new Api.UpdateReadHistoryOutbox({
        peer: new Api.PeerUser({ userId: big('1') }),
        maxId: 7,
        pts: 1,
        ptsCount: 1,
      }),
    );
    await flush();

    expect(database.dialogs.get(peerId)).toMatchObject({ readOutboxMaxId: 7 });
  });

  test('ignores a read update that moves the marker backwards', async () => {
    const handler = handlerFor(1) as (update: ApiTypes.TypeUpdate) => void;
    const peer = new Api.PeerUser({ userId: big('1') });

    handler(
      new Api.UpdateReadHistoryInbox({ peer, maxId: 42, stillUnreadCount: 0, pts: 1, ptsCount: 1 }),
    );
    await flush();
    handler(
      new Api.UpdateReadHistoryInbox({ peer, maxId: 10, stillUnreadCount: 5, pts: 2, ptsCount: 1 }),
    );
    await flush();

    expect(database.dialogs.get(peerId)).toMatchObject({ readInboxMaxId: 42, unreadCount: 0 });
  });

  test('never marks the history read on the server', async () => {
    const handler = handlerFor(0) as (e: events.NewMessageEvent) => void;

    handler({ message: photoMessage() } as events.NewMessageEvent);
    await flush();

    const invoked = client.invoke.mock.calls.map(([request]) => request);
    expect(invoked.some((r) => r instanceof Api.messages.ReadHistory)).toBe(false);
  });
});
