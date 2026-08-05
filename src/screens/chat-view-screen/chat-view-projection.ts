import { computed, signal } from '@lit-labs/signals';
import { Timestamp } from 'utils/flavour';
import { Database, MessageId, PeerId } from '../../services/database';
import { DatabaseHub } from '../../services/database/database-hub';
import { MediaId, StoredMedia, StoredMessage, StoredPeer } from '../../services/database/database-schema';
import { isUser } from '../../services/peer-key';

export type MessageMedia =
  | { id: MediaId; type: 'photo'; size?: number; width?: number; height?: number }
  | { id: MediaId; type: 'video'; size?: number; width?: number; height?: number; duration?: number }
  | { id: MediaId; type: 'voice'; size?: number; duration?: number };

export type MessageListItem = {
  id: number;
  text?: string;
  date: Timestamp;
  isOutgoing: boolean;
  media?: MessageMedia;
};

export function toMessageMedia(media: StoredMedia): MessageMedia {
  const { id, size, width, height, duration } = media;

  switch (media.type) {
    case 'photo':
      return { id, type: 'photo', size, width, height };
    case 'video':
      return { id, type: 'video', size, width, height, duration };
    case 'voice':
      return { id, type: 'voice', size, duration };
  }
}

export function toMessageListItem(message: StoredMessage, media?: StoredMedia): MessageListItem {
  return {
    id: message.id,
    text: message.text,
    date: message.date,
    isOutgoing: message.isOutgoing,
    media: media ? toMessageMedia(media) : undefined,
  };
}

export class ChatViewProjection {
  readonly messages = signal<MessageListItem[]>([]);
  private readonly _messages = new Map<MessageId, MessageListItem>();
  private readonly _media = new Map<MediaId, StoredMedia>();
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
      void this._db.loadMessages(this._peerId).then(msgs => this._applyMessages(msgs));
    });
    const peer = await this._db.getPeer(this._peerId);
    if (peer) {
      this.peer.set(peer);
    }
  }

  private async _handleNewMessage(id: MessageId, peerId: PeerId): Promise<void> {
      const message = await this._db.getMessage(peerId, id);
      if (message) {
        await this._applyMessages([message]);
      }
  }

  private async _applyMessages(messages: StoredMessage[]): Promise<void> {
    await this._loadMedia(messages);
    for (const message of messages) {
      const media = message.mediaId ? this._media.get(message.mediaId) : undefined;
      this._messages.set(message.id, toMessageListItem(message, media));
    }
    this._notify();
  }

  private async _loadMedia(messages: StoredMessage[]): Promise<void> {
    const missing = new Set<MediaId>();

    for (const { mediaId } of messages) {
      if (mediaId && !this._media.has(mediaId)) missing.add(mediaId);
    }

    if (missing.size === 0) return;

    for (const media of await this._db.getMediaItems([...missing])) {
      this._media.set(media.id, media);
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

