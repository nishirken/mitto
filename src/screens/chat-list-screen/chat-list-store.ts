import { signal } from '@lit-labs/signals';
import type { TelegramClient, Api, events } from 'telegram';
import telegram from 'telegram';

export type ChatEntry = {
  id: number;
  name: string;
  lastMessage: { id: number; text: string };
  timestamp: string;
  unreadCount: number;
};

export class ChatListStore {
  readonly chats = signal<ChatEntry[]>([]);
  private readonly _chatsMap = new Map<number, ChatEntry>();
  private readonly _newMessageEvent = {};

  constructor(private readonly _client: TelegramClient) {}

  async init(limit = 50) {
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
      const chatsById = new Map<string, Api.Chat | Api.Channel | Api.User>();
      for (const c of result.chats) {
        chatsById.set(c.id.toString(), c as Api.Chat | Api.Channel);
      }
      for (const u of result.users) {
        chatsById.set(u.id.toString(), u as Api.User);
      }
      const messagesById = new Map<number, Api.Message>();
      for (const m of result.messages) {
        if (m instanceof telegram.Api.Message) {
          messagesById.set(m.id, m);
        }
      }

      for (const dialog of result.dialogs) {
        if (!(dialog instanceof telegram.Api.Dialog)) continue;
        const peerId = getPeerId(dialog.peer);
        const entity = chatsById.get(peerId.toString());
        const topMsg = messagesById.get(dialog.topMessage);

        const name = entityName(entity);
        const lastMessage = topMsg
          ? { id: topMsg.id, text: topMsg.message || '' }
          : { id: 0, text: '' };
        const timestamp = topMsg ? formatTimestamp(topMsg.date) : '';

        const entry: ChatEntry = {
          id: peerId,
          name,
          lastMessage,
          timestamp,
          unreadCount: dialog.unreadCount,
        };
        this._chatsMap.set(peerId, entry);
      }
      this.chats.set([...this._chatsMap.values()]);
    }

    this._client.addEventHandler(this._handleNewMessage, this._newMessageEvent);
  }

  dispose(): void {
    this._client.removeEventHandler(this._handleNewMessage, this._newMessageEvent);
  }

  getChat(id: number): ChatEntry | null {
    return this._chatsMap.get(id) ?? null;
  }

  private _handleNewMessage = (event: events.NewMessageEvent): void => {
    const msg = event.message;
    const chatId = msg.chatId?.toJSNumber?.() ?? Number(msg.chatId);
    const existing = this._chatsMap.get(chatId);
    if (!existing) return;

    existing.lastMessage = { id: msg.id, text: msg.message || '' };
    existing.timestamp = formatTimestamp(msg.date);
    this._chatsMap.set(chatId, existing);
    this.chats.set([...this._chatsMap.values()]);
  };
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

function formatTimestamp(unix: number): string {
  const date = new Date(unix * 1000);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
