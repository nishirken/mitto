import type { Timestamp } from 'utils/flavour';
import { Database, PeerId } from 'services/database';
import { StoredDialog, StoredMessage, StoredPeer, StoredUser, UserId } from 'services/database/database-schema';
import { isUser } from 'services/peer-key';
import { signal } from '@lit-labs/signals';
import { DatabaseHub } from '../../services/database/database-hub';

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
    topMessage: topMessage ? {
      text: topMessage.text,
      isOutgoing: topMessage.isOutgoing,
    } : undefined,
    date: dialog.date,
    unreadCount: dialog.unreadCount,
    pinned: dialog.pinned,
  };
}

export class DialogListProjection {
  readonly chats = signal<ChatListItem[]>([]);
  private readonly _chats = new Map<UserId, ChatListItem>();
  private readonly _users = new Map<UserId, StoredUser>();

  private _unsub?: () => void;

  constructor(
    private readonly _db: Database,
    private readonly _hub: DatabaseHub,
  ) {}

  async init(): Promise<void> {
    this._unsub = this._hub.subscribe('newDialogs', async (peerIds) => {
      const dialogs = await this._db.getDialogs(peerIds);
      await this._updateChats(dialogs);
    });

    const dialogs = await this._db.loadDialogs();
    this._updateChats(dialogs);
  }

  dispose(): void {
    this._unsub?.();
    this._unsub = undefined;
  }

  private async _updateChats(dialogs: StoredDialog[]): Promise<void> {
    for (const dialog of dialogs) {
      const peerId = dialog.peerId;

      if (!isUser(peerId)) continue;
      
      const topMessage = await this._db.getMessage(peerId, dialog.topMessageId);

      if (!this._users.has(peerId)) {
        const user = await this._db.getUser(peerId);
        if (!user) continue;
        this._users.set(peerId, user);
      }

      this._chats.set(peerId, toChatListItem(dialog, this._users.get(peerId)!, topMessage));
    }
    this.chats.set([...this._chats.values()].sort((a, b) => b.date - a.date));
  }
}
