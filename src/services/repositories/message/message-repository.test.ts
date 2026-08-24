import { beforeEach, describe, expect, test } from 'vitest';
import telegram from 'telegram';
import type { Database } from '../../database';
import { createTestDatabase } from '../../database/__mocks__/database';
import type { MediaId, MessageId, PeerId } from '../../database';
import { MediaRepository } from '../media/media-repository';
import { MessageRepository } from './message-repository';

const { Api } = telegram;
const big = (n: string) => n as unknown as BigInteger;
const peer = new Api.PeerUser({ userId: big('1') });

function voiceMessage(id: number) {
  return new Api.Message({
    id,
    peerId: peer,
    date: 1000,
    message: '',
    media: new Api.MessageMediaDocument({
      document: new Api.Document({
        id: big('20'),
        accessHash: big('88'),
        fileReference: new Uint8Array([3, 4]),
        date: 2000,
        mimeType: 'audio/ogg',
        size: big('4096'),
        dcId: 4,
        attributes: [new Api.DocumentAttributeAudio({ voice: true, duration: 7 })],
      }),
    }),
  });
}

describe('MessageRepository', () => {
  let database: Database;
  let repo: MessageRepository;

  beforeEach(() => {
    database = createTestDatabase();
    repo = new MessageRepository(database, new MediaRepository(database));
  });

  test('writes the media a live message references', async () => {
    await repo.applyMessage(voiceMessage(5));

    const message = await database.messages.get(['user:1' as PeerId, 5 as MessageId]);
    expect(message?.mediaId).toBe('voice:20');
    expect(await database.media.get(message!.mediaId as MediaId)).toMatchObject({
      id: 'voice:20',
      type: 'voice',
      duration: 7,
    });
  });

  test('stores the message under its peer and id', async () => {
    await repo.applyMessage(voiceMessage(7));

    expect(await database.messages.get(['user:1' as PeerId, 7 as MessageId])).toMatchObject({
      peerId: 'user:1',
      id: 7,
    });
  });

  test('ignores messages that do not project', async () => {
    await repo.applyMessage(new Api.MessageEmpty({ id: 8 }));

    expect(await database.messages.count()).toBe(0);
  });

  test('still accepts a synthesized message with no media', async () => {
    await repo.applyNewMessage({
      peerId: 'user:1' as PeerId,
      id: 9 as MessageId,
      text: 'sent',
      date: 1000,
      isOutgoing: true,
    });

    expect(await database.messages.get(['user:1' as PeerId, 9 as MessageId])).toMatchObject({
      text: 'sent',
    });
  });

  test('writes media for an update', async () => {
    await repo.updateNewMessage(
      new Api.UpdateNewMessage({ message: voiceMessage(10), pts: 1, ptsCount: 1 }),
    );

    expect(await database.media.get('voice:20')).toBeDefined();
  });
});
