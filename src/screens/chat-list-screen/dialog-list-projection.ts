import type { Timestamp } from 'utils/flavour';
import type { Database, PeerId } from 'services/database';
import type {
  StoredDialog,
  StoredMessage,
  StoredPeer,
  UserId,
} from 'services/database/database-schema';
import { isUser } from 'services/peer-key';
import { signal } from '@lit-labs/signals';
import { liveQuery, type Subscription } from 'dexie';

export type ChatListItem = {
  id: PeerId;
  name: string;
  topMessage?: { text: string; isOutgoing: boolean };
  date: Timestamp;
  unreadCount: number;
  pinned: boolean;
};

function peerName(peer: StoredPeer): string {
  if ('firstName' in peer || 'lastName' in peer) {
    return [peer.firstName, peer.lastName].filter(Boolean).join(' ');
  }
  if ('username' in peer && typeof peer.username === 'string') return peer.username;
  if ('title' in peer && typeof peer.title === 'string') return peer.title;

  return 'Unknown';
}

export function toChatListItem(
  dialog: StoredDialog,
  peer: StoredPeer,
  topMessage?: StoredMessage,
): ChatListItem {
  return {
    id: dialog.peerId,
    name: peerName(peer),
    topMessage: topMessage
      ? {
          text: topMessage.text,
          isOutgoing: topMessage.isOutgoing,
        }
      : undefined,
    date: dialog.date,
    unreadCount: dialog.unreadCount,
    pinned: dialog.pinned,
  };
}

export class DialogListProjection {
  readonly chats = signal<ChatListItem[]>([]);
  private _sub?: Subscription;

  constructor(private readonly _db: Database) {}

  init(): void {
    this._sub = liveQuery(async () => {
      const dialogs = (await this._db.dialogs.toArray()).filter((d) => isUser(d.peerId));
      const [users, topMessages] = await Promise.all([
        this._db.users.bulkGet(dialogs.map((d) => d.peerId as UserId)),
        this._db.messages.bulkGet(dialogs.map((d) => [d.peerId, d.topMessageId])),
      ]);

      return dialogs
        .map((dialog, i) => {
          const user = users[i];

          return user ? toChatListItem(dialog, user, topMessages[i]) : undefined;
        })
        .filter((chat) => !!chat)
        .sort((a, b) => b.date - a.date);
    }).subscribe({
      next: (chats) => this.chats.set(chats),
      error: () => {},
    });
  }

  dispose(): void {
    this._sub?.unsubscribe();
  }
}
