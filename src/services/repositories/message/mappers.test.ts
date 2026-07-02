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
