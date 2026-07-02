import { computed, signal } from '@lit-labs/signals';
import { Timestamp } from 'utils/flavour';
import { Database, MessageId, PeerId } from '../../services/database';
import { DatabaseHub } from '../../services/database/database-hub';
import { StoredPeer } from '../../services/database/database-schema';
import { isUser } from '../../services/peer-key';

export type MessageListItem = {
  id: number;
  text: string;
  date: Timestamp;
  isOutgoing: boolean;
};

export class ChatViewProjection {
  readonly messages = signal<MessageListItem[]>([]);
  private readonly _messages = new Map<MessageId, MessageListItem>();
  readonly peer = signal<StoredPeer | null>(null);
  readonly peerName = computed(() => {
    const p = this.peer.get();
    if (p && isUser(p?.id)) return [p.firstName, p.lastName].filter(Boolean).join(' ') ?? p.username ?? 'Unknown';

    return '';
  });
  private _newMessageUnsub?: VoidFunction;
  private _newMessagesUnsub?: VoidFunction;

  constructor(
    private readonly _db: Database,
    private readonly _hub: DatabaseHub,
    private readonly _peerId: PeerId,
   ) {}

  async init(): Promise<void> {
    this._newMessageUnsub = this._hub.subscribe('newMessage', ({ id, peerId }) => {
      if (this._peerId !== peerId) {
        return;
      }
      void this._handleNewMessage(id, peerId);
    });
    this._newMessagesUnsub = this._hub.subscribe('newMessages', () => {
      this._db.loadMessages(this._peerId).then(msgs => {
        for (const msg of msgs) {
          this._messages.set(msg.id, msg);
        }
        this._notify();
      });
    });
    const peer = await this._db.getPeer(this._peerId);
    if (peer) {
      this.peer.set(peer);
    }
  }

  private async _handleNewMessage(id: MessageId, peerId: PeerId): Promise<void> {
      const message = await this._db.getMessage(peerId, id);
      if (message) {
        this._messages.set(id, message);
        this._notify();
      }
  }

  private _notify(): void {
    this.messages.set([...this._messages.values()]);
  } 

  dispose(): void {
    this._newMessageUnsub?.();
    this._newMessagesUnsub?.();
  }
}

