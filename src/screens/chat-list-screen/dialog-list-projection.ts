import type { Timestamp } from 'utils/flavour';
import type { IDatabase, PeerId } from 'services/database';
import type {
  StoredDialog,
  StoredMessage,
  StoredPeer,
  StoredUser,
  UserId,
} from 'services/database/database-schema';
import { isUser } from 'services/peer-key';
import { signal } from '@lit-labs/signals';
import type { DatabaseHub } from '../../services/database/database-hub';

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
  private readonly _chats = new Map<PeerId, ChatListItem>();
  private readonly _users = new Map<UserId, StoredUser>();

  private _newDialogsUnsub?: () => void;
  private _newMessageUnsub?: () => void;
  private _dialogReadUnsub?: () => void;

  constructor(
    private readonly _db: IDatabase,
    private readonly _hub: DatabaseHub,
  ) {}

  async init(): Promise<void> {
    this._newMessageUnsub = this._hub.subscribe('newMessage', async ({ peerId, id }) => {
      const [dialog, peer, message] = await Promise.all([
        this._db.getDialog(peerId),
        this._db.getPeer(peerId),
        this._db.getMessage(peerId, id),
      ]);
      if (dialog && message && peer) {
        const chat = toChatListItem(dialog, peer, message);
        this._chats.set(chat.id, chat);
        this._emit();
      }
    });
    this._newDialogsUnsub = this._hub.subscribe('newDialogs', async (peerIds) => {
      const dialogs = await this._db.getDialogs(peerIds);
      await this._updateChats(dialogs);
    });

    this._dialogReadUnsub = this._hub.subscribe('dialogRead', async (peerId) => {
      const dialog = await this._db.getDialog(peerId);
      if (dialog) await this._updateChats([dialog]);
    });

    const dialogs = await this._db.loadDialogs();
    this._updateChats(dialogs);
  }

  dispose(): void {
    this._newDialogsUnsub?.();
    this._dialogReadUnsub?.();
    this._newMessageUnsub?.();
  }

  private _emit(): void {
    this.chats.set([...this._chats.values()].sort((a, b) => b.date - a.date));
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
    this._emit();
  }
}
