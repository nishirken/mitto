import { beforeEach, describe, expect, test } from 'vitest';
import telegram from 'telegram';
import { MockDatabase } from '../../database/__mocks__/database';
import { DatabaseHub } from '../../database/database-hub';
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
  let database: MockDatabase;
  let hub: DatabaseHub;
  let repo: MessageRepository;

  beforeEach(() => {
    database = new MockDatabase();
    hub = new DatabaseHub();
    repo = new MessageRepository(database, hub, new MediaRepository(database));
  });

  test('writes the media a live message references', async () => {
    await repo.applyMessage(voiceMessage(5));

    const message = await database.getMessage('user:1' as PeerId, 5);
    expect(message?.mediaId).toBe('voice:20');
    expect(await database.getMedia(message!.mediaId as MediaId)).toMatchObject({
      id: 'voice:20',
      type: 'voice',
      duration: 7,
    });
  });

  test('has the media stored by the time newMessage fires', async () => {
    let mediaAtNotify: unknown;
    hub.subscribe('newMessage', () => {
      mediaAtNotify = database.media.get('voice:20');
    });

    await repo.applyMessage(voiceMessage(6));

    expect(mediaAtNotify).toBeDefined();
  });

  test('notifies with the stored peer and id', async () => {
    const events: { peerId: PeerId; id: MessageId }[] = [];
    hub.subscribe('newMessage', (e) => events.push(e));

    await repo.applyMessage(voiceMessage(7));

    expect(events).toEqual([{ peerId: 'user:1', id: 7 }]);
  });

  test('ignores messages that do not project', async () => {
    const events: unknown[] = [];
    hub.subscribe('newMessage', (e) => events.push(e));

    await repo.applyMessage(new Api.MessageEmpty({ id: 8 }));

    expect(events).toEqual([]);
    expect(database.messages.size).toBe(0);
  });

  test('still accepts a synthesized message with no media', async () => {
    const events: unknown[] = [];
    hub.subscribe('newMessage', (e) => events.push(e));

    await repo.applyNewMessage({
      peerId: 'user:1' as PeerId,
      id: 9 as MessageId,
      text: 'sent',
      date: 1000,
      isOutgoing: true,
    });

    expect(await database.getMessage('user:1' as PeerId, 9)).toMatchObject({ text: 'sent' });
    expect(events).toHaveLength(1);
  });

  test('writes media and notifies for an update', async () => {
    const events: unknown[] = [];
    hub.subscribe('newMessage', (e) => events.push(e));

    await repo.updateNewMessage(
      new Api.UpdateNewMessage({ message: voiceMessage(10), pts: 1, ptsCount: 1 }),
    );

    expect(database.media.get('voice:20')).toBeDefined();
    expect(events).toHaveLength(1);
  });
});
