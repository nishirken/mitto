import { beforeEach, describe, expect, test, vi } from 'vitest';
import telegram from 'telegram';
import type { events, TelegramClient } from 'telegram';
import { createFakeStorage, FakeDatabase } from '../../services/database/__mocks__/database';
import { DatabaseHub } from '../../services/database/database-hub';
import { Database, PeerId } from '../../services/database';
import { mockStoredUser } from '../../services/database/database-schema.mocks';
import { MediaRepository } from '../../services/repositories/media/media-repository';
import { MessageRepository } from '../../services/repositories/message/message-repository';
import { DialogSyncService } from './dialog-sync-service';

const { Api } = telegram;
const big = (n: string) => n as unknown as BigInteger;
const peerId = 'user:1' as PeerId;

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
  let storage: Database;
  let fake: FakeDatabase;
  let client: { addEventHandler: ReturnType<typeof vi.fn>; invoke: ReturnType<typeof vi.fn> };
  let service: DialogSyncService;

  beforeEach(async () => {
    ({ storage, fake } = createFakeStorage());
    await fake.putUsers([mockStoredUser({ id: 'user:1' })]);

    client = {
      addEventHandler: vi.fn(),
      invoke: vi.fn(async () => new Api.messages.Messages({
        messages: [], chats: [], users: [],
      })),
    };

    const repo = new MessageRepository(storage, new DatabaseHub(), new MediaRepository(storage));
    service = new DialogSyncService(client as unknown as TelegramClient, repo, storage, peerId);
    await service.loadInitial();
  });

  test('stores media for a message that arrives live', async () => {
    const handler = client.addEventHandler.mock.calls[0][0] as (e: events.NewMessageEvent) => void;

    handler({ message: photoMessage() } as events.NewMessageEvent);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const message = await storage.getMessage(peerId, 5);
    expect(message?.mediaId).toBe('photo:10');
    expect(fake.media.get('photo:10')).toMatchObject({ type: 'photo', thumbSize: 'x' });
  });
});
