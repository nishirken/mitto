import { describe, test, expect } from 'vitest';
import telegram from 'telegram';
import {
  toStoredMessage,
} from './mappers';

const { Api } = telegram;
const big = (n: string) => n as unknown as BigInteger;

describe('Message', () => {
  const peer = new Api.PeerUser({ userId: big('123') });

  test('projects a text message', () => {
    const m = new Api.Message({ id: 5, peerId: peer, date: 1000, message: 'hi', out: true });
    expect(toStoredMessage(m)).toMatchObject({
      peerId: 'user:123',
      id: 5,
      text: 'hi',
      date: 1000,
      isOutgoing: true,
    });
  });

  test('references supported media by key', () => {
    const m = new Api.Message({
      id: 6,
      peerId: peer,
      date: 1000,
      message: '',
      media: new Api.MessageMediaPhoto({
        photo: new Api.Photo({
          id: big('10'),
          accessHash: big('99'),
          fileReference: new Uint8Array([1]),
          date: 1000,
          sizes: [],
          dcId: 2,
        }),
      }),
    });
    expect(toStoredMessage(m)).toMatchObject({ id: 6, mediaId: 'photo:10' });
  });

  test('leaves mediaId unset for unsupported media', () => {
    const m = new Api.Message({
      id: 7,
      peerId: peer,
      date: 1000,
      message: '',
      media: new Api.MessageMediaUnsupported(),
    });
    expect(toStoredMessage(m)?.mediaId).toBeUndefined();
  });

  test('returns null for MessageService', () => {
    const m = new Api.MessageService({
      id: 9,
      peerId: peer,
      date: 0,
      action: new Api.MessageActionChatDeletePhoto(),
    });
    expect(toStoredMessage(m)).toBeNull();
  });

  test('returns null for MessageEmpty', () => {
    expect(toStoredMessage(new Api.MessageEmpty({ id: 1 }))).toBeNull();
  });
});
