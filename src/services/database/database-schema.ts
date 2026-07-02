import type { DBSchema } from 'idb';
import type { Flavour, Timestamp } from 'utils/flavour';

// Canonical keys — string flavours so Map lookups and IDB keys use value equality.
// A key is produced only through `peerKey()` in `./peer-key` (e.g. 'user:123').
export type UserId = Flavour<string, 'UserId'>; // 'user:123'
export type ChatId = Flavour<string, 'ChatId'>; // 'chat:123'
export type ChannelId = Flavour<string, 'ChannelId'>; // 'channel:123'
export type PeerId = UserId | ChatId | ChannelId;

export type MessageId = Flavour<number, 'MessageId'>;

export type MetaKey = 'session';
export type Session = Flavour<string, 'session'>;

// --- Normalized projections (persisted; never store raw Api.* objects) -------

export type StoredUser = {
  id: UserId;
  accessHash?: string; // required for InputPeer reconstruction; null only for min
  firstName?: string;
  lastName?: string;
  username?: string;
  phone?: string;
  isMin: boolean;
  isBot: boolean;
  isDeleted: boolean;
};

export type StoredPeer = StoredUser;

export type MediaType = 'photo' | 'video' | 'document' | 'sticker' | 'voice' | 'other';

export type StoredMessage = {
  peerId: PeerId;
  id: MessageId;
  senderId?: PeerId;
  text: string;
  date: Timestamp;
  isOutgoing: boolean;
};

export type StoredDialog = {
  peerId: PeerId;
  topMessageId: MessageId;
  unreadCount: number;
  date: Timestamp;
  pinned: boolean;
  readInboxMaxId: MessageId;
  readOutboxMaxId: MessageId;
};

export interface MittoDB extends DBSchema {
  meta: {
    key: MetaKey;
    value: { key: MetaKey; value: Session };
  };
  users: {
    key: UserId;
    value: StoredUser;
  };
  messages: {
    key: [PeerId, MessageId];
    value: StoredMessage;
  };
  dialogs: {
    key: PeerId;
    value: StoredDialog; 
  };
}
