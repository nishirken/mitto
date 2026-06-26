import type { DBSchema } from 'idb';
import type { Flavour, Timestamp } from 'utils/flavour';

export type ChatId = Flavour<number, 'ChatId'>;
export type MessageId = Flavour<number, 'MessageId'>;

export type MetaKey = 'session';
export type Session = Flavour<string, 'session'>;

export type StoredChat = {
  id: ChatId;
  name: string;
  topMessage: { text: string };
  date: Timestamp;
  unreadCount: number;
};

export type StoredMessage = {
  chatId: ChatId;
  id: MessageId;
  text: string;
  date: Timestamp;
  isOutgoing: boolean;
};

export interface MittoDB extends DBSchema {
  meta: {
    key: MetaKey;
    value: { key: MetaKey; value: Session };
  };
  chats: {
    key: ChatId;
    value: StoredChat;
  };
  messages: {
    key: [ChatId, MessageId];
    value: StoredMessage;
    indexes: { by_chat: ChatId };
  };
}
