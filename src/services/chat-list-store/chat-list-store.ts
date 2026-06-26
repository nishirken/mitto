import { signal } from '@lit-labs/signals';
import type { TelegramClient, events, Api } from 'telegram';
import type { OfflineStorage, StoredChat } from 'services/offline-storage';
import telegram from 'telegram';
import { ChatId } from '../offline-storage-schema';

const { NewMessage } = telegram.events;

export class ChatListStore {
  readonly chats = signal<StoredChat[]>([]);
  readonly loading = signal(false);
  readonly hasMore = signal(true);

  private readonly _chatsMap = new Map<number, StoredChat>();
  private readonly _newMessageEvent = new NewMessage({});

  private _offsetDate = 0;
  private _offsetId = 0;
  private _offsetPeer: Api.TypeInputPeer = new telegram.Api.InputPeerEmpty();

  constructor(
    private readonly _client: TelegramClient,
    private readonly _storage: OfflineStorage,
  ) {}

  async init(limit = 20) {
    const cached = await this._storage.loadChats();

    if (cached.length > 0) {
      for (const c of cached) this._chatsMap.set(c.id, c);
      this._emit();
    }

    const result = await this._client.invoke(
      new telegram.Api.messages.GetDialogs({
        offsetDate: 0,
        offsetId: 0,
        offsetPeer: new telegram.Api.InputPeerEmpty(),
        limit,
        hash: 0 as unknown as Api.long,
      }),
    );

    if (result instanceof telegram.Api.messages.Dialogs || result instanceof telegram.Api.messages.DialogsSlice) {
      const { chatsById, messagesById } = buildEntityMaps(result);
      this._processDialogs(result.dialogs, chatsById, messagesById);
      this._updateOffsets(result.dialogs, chatsById, messagesById);
      if (result.dialogs.length < limit) this.hasMore.set(false);
    }
    this._client.addEventHandler(this._handleNewMessage, this._newMessageEvent);
  }

  async loadMore(limit = 20): Promise<void> {
    if (this.loading.get() || !this.hasMore.get()) return;

    this.loading.set(true);

    try {
      const result = await this._client.invoke(
        new telegram.Api.messages.GetDialogs({
          offsetDate: this._offsetDate,
          offsetId: this._offsetId,
          offsetPeer: this._offsetPeer,
          limit,
          hash: 0 as unknown as Api.long,
        }),
      );

      if (result instanceof telegram.Api.messages.Dialogs || result instanceof telegram.Api.messages.DialogsSlice) {
        const { chatsById, messagesById } = buildEntityMaps(result);
        this._processDialogs(result.dialogs, chatsById, messagesById);
        this._updateOffsets(result.dialogs, chatsById, messagesById);
        if (result.dialogs.length < limit) this.hasMore.set(false);
      } else {
        this.hasMore.set(false);
      }
    } finally {
      this.loading.set(false);
    }
  }

  dispose(): void {
    this._client.removeEventHandler(this._handleNewMessage, this._newMessageEvent);
  }

  getChat(id: ChatId): StoredChat | null {
    return this._chatsMap.get(id) ?? null;
  }

  async getChatAsync(id: ChatId): Promise<StoredChat> {
    const chat = this.getChat(id);

    if (chat) return chat;

    const entity = await this._client.getEntity(id);

    if (['Chat', 'Channel'].includes(entity.className)) {
      const newChat = {
        id,
        name: (entity as Api.Chat).title,
        topMessage: { text: '' },
        date: 0,
        unreadCount: 0,
      };
      this._addChat(newChat);

      return newChat;
    } else {
      throw new Error('Unexpected chat');
    }
  }

  private _addChat(entry: StoredChat): void {
    this._chatsMap.set(entry.id, entry);
    this._emit();
    void this._storage.upsertChat(entry);
  }

  private _processDialogs(
    dialogs: Api.TypeDialog[],
    chatsById: Map<string, Api.Chat | Api.Channel | Api.User>,
    messagesById: Map<number, Api.Message>,
  ): void {
    const written: StoredChat[] = [];
    for (const dialog of dialogs) {
      if (!(dialog instanceof telegram.Api.Dialog)) continue;
      const peerId = getPeerId(dialog.peer);
      const entity = chatsById.get(peerId.toString());
      const topMsg = messagesById.get(dialog.topMessage);

      const entry: StoredChat = {
        id: peerId,
        name: entityName(entity),
        topMessage: { text: topMsg?.message ?? '' },
        date: topMsg?.date ?? 0,
        unreadCount: dialog.unreadCount,
      };
      this._chatsMap.set(peerId, entry);
      written.push(entry);
    }
    this._emit();
    void this._storage.saveChats(written);
  }

  private _updateOffsets(
    dialogs: Api.TypeDialog[],
    chatsById: Map<string, Api.Chat | Api.Channel | Api.User>,
    messagesById: Map<number, Api.Message>,
  ): void {
    const lastDialog = dialogs[dialogs.length - 1];
    if (!(lastDialog instanceof telegram.Api.Dialog)) return;

    const lastMsg = messagesById.get(lastDialog.topMessage);
    this._offsetDate = lastMsg?.date ?? 0;
    this._offsetId = lastDialog.topMessage;
    this._offsetPeer = dialogPeerToInputPeer(lastDialog.peer, chatsById);
  }

  private _handleNewMessage = (event: events.NewMessageEvent): void => {
    const msg = event.message;
    const chatId = msg.chatId?.toJSNumber?.() ?? Number(msg.chatId);
    const existing = this._chatsMap.get(chatId);
    if (!existing) return;

    existing.topMessage = { text: msg.message || '' };
    existing.date = msg.date;
    this._chatsMap.set(chatId, existing);
    this._emit();
    void this._storage.upsertChat(existing);
  };

  private _emit(): void {
    this.chats.set([...this._chatsMap.values()]);
  }
}

function buildEntityMaps(result: Api.messages.Dialogs | Api.messages.DialogsSlice): {
  chatsById: Map<string, Api.Chat | Api.Channel | Api.User>;
  usersById: Map<string, Api.User>;
  messagesById: Map<number, Api.Message>;
} {
  const chatsById = new Map<string, Api.Chat | Api.Channel | Api.User>();
  for (const c of result.chats) {
    chatsById.set(c.id.toString(), c as Api.Chat | Api.Channel);
  }
  const usersById = new Map();
  for (const u of result.users) {
    usersById.set(u.id.toString(), u as Api.User);
  }

  const messagesById = new Map<number, Api.Message>();
  for (const m of result.messages) {
    if (m instanceof telegram.Api.Message) {
      messagesById.set(m.id, m);
    }
  }

  return { chatsById, usersById, messagesById };
}

function dialogPeerToInputPeer(
  peer: Api.TypePeer,
  chatsById: Map<string, Api.Chat | Api.Channel | Api.User>,
): Api.TypeInputPeer {
  if (peer instanceof telegram.Api.PeerUser) {
    const userId = peer.userId.toJSNumber?.() ?? Number(peer.userId);
    const user = chatsById.get(userId.toString());
    if (user instanceof telegram.Api.User) {
      return new telegram.Api.InputPeerUser({ userId: peer.userId, accessHash: user.accessHash ?? BigInt(0) });
    }
  } else if (peer instanceof telegram.Api.PeerChat) {
    return new telegram.Api.InputPeerChat({ chatId: peer.chatId });
  } else if (peer instanceof telegram.Api.PeerChannel) {
    const channelId = peer.channelId.toJSNumber?.() ?? Number(peer.channelId);
    const channel = chatsById.get(channelId.toString());
    if (channel instanceof telegram.Api.Channel) {
      return new telegram.Api.InputPeerChannel({ channelId: peer.channelId, accessHash: channel.accessHash ?? BigInt(0) });
    }
  }

  return new telegram.Api.InputPeerEmpty();
}

function getPeerId(peer: Api.TypePeer): number {
  if (peer instanceof telegram.Api.PeerUser) return peer.userId.toJSNumber?.() ?? Number(peer.userId);
  if (peer instanceof telegram.Api.PeerChat) return peer.chatId.toJSNumber?.() ?? Number(peer.chatId);
  if (peer instanceof telegram.Api.PeerChannel) return peer.channelId.toJSNumber?.() ?? Number(peer.channelId);

  return 0;
}

function entityName(entity: Api.Chat | Api.Channel | Api.User | undefined): string {
  if (!entity) return 'Unknown';
  if (entity instanceof telegram.Api.User) {
    return [entity.firstName, entity.lastName].filter(Boolean).join(' ') || 'Unknown';
  }

  return (entity as Api.Chat | Api.Channel).title || 'Unknown';
}
