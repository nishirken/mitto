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
  isRead: boolean;
  media?: MessageMedia;
};

export type ReadMarkers = { inbox: MessageId; outbox: MessageId };

export const NO_READ_MARKERS: ReadMarkers = { inbox: 0 as MessageId, outbox: 0 as MessageId };

export function isMessageRead(message: StoredMessage, markers: ReadMarkers): boolean {
  return message.isOutgoing ? message.id <= markers.outbox : message.id <= markers.inbox;
}

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

export function toMessageListItem(
  message: StoredMessage,
  media?: StoredMedia,
  markers: ReadMarkers = NO_READ_MARKERS,
): MessageListItem {
  return {
    id: message.id,
    text: message.text,
    date: message.date,
    isOutgoing: message.isOutgoing,
    isRead: isMessageRead(message, markers),
    media: media ? toMessageMedia(media) : undefined,
  };
}

export class ChatViewProjection {
  readonly messages = signal<MessageListItem[]>([]);
  readonly firstUnreadId = computed<number | undefined>(() => {
    let first: number | undefined;

    for (const message of this.messages.get()) {
      if (message.isOutgoing || message.isRead) continue;
      if (first === undefined || message.id < first) first = message.id;
    }

    return first;
  });
  private readonly _messages = new Map<MessageId, StoredMessage>();
  private readonly _media = new Map<MediaId, StoredMedia>();
  private readonly _readInboxMaxId = signal(0 as MessageId);
  private readonly _readOutboxMaxId = signal(0 as MessageId);
  readonly peer = signal<StoredPeer | null>(null);
  readonly peerName = computed(() => {
    const p = this.peer.get();
    if (p && isUser(p?.id)) return [p.firstName, p.lastName].filter(Boolean).join(' ') ?? p.username ?? 'Unknown';

    return '';
  });
  private _newMessageUnsub?: VoidFunction;
  private _newMessagesUnsub?: VoidFunction;
  private _dialogReadUnsub?: VoidFunction;
  private _readMarkersLoaded?: Promise<void>;

  constructor(
    private readonly _db: Database,
    private readonly _hub: DatabaseHub,
    private readonly _peerId: PeerId,
   ) {}

  async init(): Promise<void> {
    this._readMarkersLoaded = this._loadReadMarkers();
    this._newMessageUnsub = this._hub.subscribe('newMessage', ({ id, peerId }) => {
      if (this._peerId !== peerId) {
        return;
      }
      void this._handleNewMessage(id, peerId);
    });
    this._newMessagesUnsub = this._hub.subscribe('newMessages', () => {
      void this._db.loadMessages(this._peerId).then(msgs => this._applyMessages(msgs));
    });
    this._dialogReadUnsub = this._hub.subscribe('dialogRead', (peerId) => {
      if (this._peerId !== peerId) {
        return;
      }
      void this._loadReadMarkers().then(() => this._notify());
    });
    const peer = await this._db.getPeer(this._peerId);
    if (peer) {
      this.peer.set(peer);
    }
    await this._readMarkersLoaded;
  }

  private async _loadReadMarkers(): Promise<void> {
    const dialog = await this._db.getDialog(this._peerId);

    if (!dialog) return;

    this._readInboxMaxId.set(dialog.readInboxMaxId);
    this._readOutboxMaxId.set(dialog.readOutboxMaxId);
  }

  private async _handleNewMessage(id: MessageId, peerId: PeerId): Promise<void> {
      const message = await this._db.getMessage(peerId, id);
      if (message) {
        await this._applyMessages([message]);
      }
  }

  private async _applyMessages(messages: StoredMessage[]): Promise<void> {
    await this._readMarkersLoaded;
    await this._loadMedia(messages);
    for (const message of messages) {
      this._messages.set(message.id, message);
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
    const markers: ReadMarkers = {
      inbox: this._readInboxMaxId.get(),
      outbox: this._readOutboxMaxId.get(),
    };

    this.messages.set(
      [...this._messages.values()].map((message) =>
        toMessageListItem(
          message,
          message.mediaId ? this._media.get(message.mediaId) : undefined,
          markers,
        ),
      ),
    );
  }

  dispose(): void {
    this._newMessageUnsub?.();
    this._newMessagesUnsub?.();
    this._dialogReadUnsub?.();
  }
}

