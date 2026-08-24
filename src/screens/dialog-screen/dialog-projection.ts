import { computed, signal } from '@lit-labs/signals';
import type { Timestamp } from 'utils/flavour';
import type { Database, MessageId, PeerId } from '../../services/database';
import { liveQuery, type Subscription } from 'dexie';
import type {
  MediaId,
  StoredMedia,
  StoredMessage,
  StoredPeer,
} from '../../services/database/database-schema';
import { isUser } from '../../services/peer-key';

export type MessageMedia =
  | { id: MediaId; type: 'photo'; size?: number; width?: number; height?: number }
  | {
      id: MediaId;
      type: 'video';
      size?: number;
      width?: number;
      height?: number;
      duration?: number;
    }
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

export class DialogProjection {
  readonly messages = signal<MessageListItem[]>([]);
  readonly firstUnreadId = computed<number | undefined>(() => {
    let first: number | undefined;

    for (const message of this.messages.get()) {
      if (message.isOutgoing || message.isRead) continue;
      if (first === undefined || message.id < first) first = message.id;
    }

    return first;
  });
  private _resolveFirstMessages!: VoidFunction;
  readonly firstMessages = new Promise<void>((resolve) => {
    this._resolveFirstMessages = resolve;
  });
  private readonly _media = new Map<MediaId, StoredMedia>();
  readonly peer = signal<StoredPeer | null>(null);
  readonly peerName = computed(() => {
    const p = this.peer.get();
    if (p && isUser(p?.id))
      return [p.firstName, p.lastName].filter(Boolean).join(' ') ?? p.username ?? 'Unknown';

    return '';
  });
  private readonly _subs: Subscription[] = [];

  constructor(
    private readonly _db: Database,
    private readonly _peerId: PeerId,
  ) {}

  init(): void {
    this._subs.push(
      liveQuery(async () => {
        const [messages, dialog] = await Promise.all([
          this._db.loadMessages(this._peerId),
          this._db.dialogs.get(this._peerId),
        ]);
        const markers: ReadMarkers = dialog
          ? { inbox: dialog.readInboxMaxId, outbox: dialog.readOutboxMaxId }
          : NO_READ_MARKERS;
        const media = await this._resolveMedia(messages);

        return messages.map((message) =>
          toMessageListItem(
            message,
            message.mediaId ? media.get(message.mediaId) : undefined,
            markers,
          ),
        );
      }).subscribe({
        next: (items) => {
          this.messages.set(items);
          if (items.length > 0) this._resolveFirstMessages();
        },
        error: () => {},
      }),
      liveQuery(() => this._db.getPeer(this._peerId)).subscribe({
        next: (peer) => this.peer.set(peer ?? null),
        error: () => {},
      }),
    );
  }

  // Media rows are written once and never updated, so anything already seen can be served
  // from the cache instead of re-read on every emission.
  private async _resolveMedia(messages: StoredMessage[]): Promise<Map<MediaId, StoredMedia>> {
    const missing = new Set<MediaId>();

    for (const { mediaId } of messages) {
      if (mediaId && !this._media.has(mediaId)) missing.add(mediaId);
    }

    if (missing.size > 0) {
      for (const media of await this._db.media.bulkGet([...missing])) {
        if (media) this._media.set(media.id, media);
      }
    }

    return this._media;
  }

  dispose(): void {
    for (const sub of this._subs) sub.unsubscribe();
    this._subs.length = 0;
  }
}
