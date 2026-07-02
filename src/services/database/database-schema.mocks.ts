import type {
  MessageId,
  PeerId,
  StoredDialog,
  StoredMessage,
  StoredUser,
  UserId,
} from './database-schema';
import type { Timestamp } from 'utils/flavour';

// Test fixtures: build valid instances of the persisted projections. Every field has a
// sane default so callers only override what the test cares about.

export function mockStoredUser(over: Partial<StoredUser> = {}): StoredUser {
  return {
    id: 'user:1' as UserId,
    accessHash: '0',
    firstName: 'First',
    lastName: 'Last',
    isBot: false,
    isDeleted: false,
    isMin: false,
    ...over,
  };
}

export function mockStoredMessage(over: Partial<StoredMessage> = {}): StoredMessage {
  return {
    peerId: 'chat:1' as PeerId,
    id: 1 as MessageId,
    text: 'message',
    date: 0 as Timestamp,
    isOutgoing: false,
    ...over,
  };
}

export function mockStoredDialog(over: Partial<StoredDialog> = {}): StoredDialog {
  return {
    peerId: 'chat:1' as PeerId,
    topMessageId: 0 as MessageId,
    unreadCount: 0,
    date: 0 as Timestamp,
    pinned: false,
    readInboxMaxId: 0 as MessageId,
    readOutboxMaxId: 0 as MessageId,
    ...over,
  };
}
