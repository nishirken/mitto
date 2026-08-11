import { describe, test, expect } from 'vitest';
import telegram from 'telegram';
import { mapDialogsResponse } from './mappers';

const { Api } = telegram;
const big = (n: string) => n as unknown as BigInteger;

describe('Dialog', () => {
  test('mapDialogsResponse', () => {
    const peer = new Api.PeerUser({ userId: big('123') });
    const result = new Api.messages.Dialogs({
      dialogs: [
        new Api.Dialog({
          peer,
          topMessage: 5,
          readInboxMaxId: 5,
          readOutboxMaxId: 5,
          unreadCount: 2,
          unreadMentionsCount: 0,
          unreadReactionsCount: 0,
          notifySettings: new Api.PeerNotifySettings({}),
        }),
      ],
      messages: [new Api.Message({ id: 5, peerId: peer, date: 1700, message: 'yo' })],
      chats: [],
      users: [new Api.User({ id: big('123'), firstName: 'Ada' })],
    });

    const mapped = mapDialogsResponse(result);
    expect(mapped.users[0]?.id).toBe('user:123');
    expect(mapped.messages[0]?.id).toBe(5);
    expect(mapped.messages[0]?.peerId).toBe('user:123');
    expect(mapped.dialogs[0]?.peerId).toBe('user:123');
    expect(mapped.dialogs[0]?.topMessageId).toBe(5);
  });
});
