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

export type DialogListItem = {
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

export function toDialogListItem(
  dialog: StoredDialog,
  peer: StoredPeer,
  topMessage?: StoredMessage,
): DialogListItem {
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
  readonly dialogs = signal<DialogListItem[]>([]);
  private _sub?: Subscription;

  constructor(private readonly _db: Database) {}

  init(): void {
    this._sub = liveQuery(async () => {
      const dialogs = await this._db.dialogs.filter((d) => isUser(d.peerId)).toArray();
      const [users, topMessages] = await Promise.all([
        this._db.users.bulkGet(dialogs.map((d) => d.peerId as UserId)),
        this._db.messages.bulkGet(dialogs.map((d) => [d.peerId, d.topMessageId])),
      ]);

      return dialogs
        .map((dialog, i) => {
          const user = users[i];

          return user ? toDialogListItem(dialog, user, topMessages[i]) : undefined;
        })
        .filter((dialog) => !!dialog)
        .sort((a, b) => b.date - a.date);
    }).subscribe({
      next: (dialogs) => this.dialogs.set(dialogs),
      error: () => {},
    });
  }

  dispose(): void {
    this._sub?.unsubscribe();
  }
}
