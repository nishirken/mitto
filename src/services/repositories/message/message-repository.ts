import type { Api } from 'telegram';
import type { Database, StoredDialog, StoredMessage } from '../../database';
import { toStoredUser } from '../user/mappers';
import type { IMediaRepository } from '../media/media-repository';
import { toStoredMessage } from './mappers';

export interface IMessageRepository {
  applyMessage(message: Api.TypeMessage): Promise<void>;
  applyNewMessage(msg: StoredMessage): Promise<void>;
  applyMessagesResponse(result: Api.messages.Messages | Api.messages.MessagesSlice): Promise<void>;
  updateNewMessage(result: Api.UpdateNewMessage): Promise<void>;
}

// Writes messages to the database. Each method commits in a single transaction so `liveQuery`
// subscribers never observe a message before the media it references.
export class MessageRepository implements IMessageRepository {
  constructor(
    private readonly _storage: Database,
    private readonly _media: IMediaRepository,
  ) {}

  async applyMessage(message: Api.TypeMessage): Promise<void> {
    const stored = toStoredMessage(message);

    if (!stored) return;

    const { media, messages, dialogs } = this._storage;
    await this._storage.transaction('rw', media, messages, dialogs, async () => {
      await this._media.applyMessagesMedia([message]);
      await this._apply(stored);
    });
  }

  async applyNewMessage(msg: StoredMessage): Promise<void> {
    const { messages, dialogs } = this._storage;
    await this._storage.transaction('rw', messages, dialogs, () => this._apply(msg));
  }

  private async _apply(msg: StoredMessage): Promise<void> {
    await this._storage.messages.put(msg);

    const dialog = await this._storage.dialogs.get(msg.peerId);

    if (dialog && msg.id > dialog.topMessageId) {
      const updated: StoredDialog = {
        ...dialog,
        topMessageId: msg.id,
        date: msg.date,
        unreadCount: msg.isOutgoing ? dialog.unreadCount : dialog.unreadCount + 1,
      };
      await this._storage.dialogs.put(updated);
    }
  }

  async applyMessagesResponse(
    result: Api.messages.Messages | Api.messages.MessagesSlice,
  ): Promise<void> {
    const messages = result.messages.map(toStoredMessage).filter((m) => !!m);
    const { media, messages: messageTable, users } = this._storage;

    await this._storage.transaction('rw', media, messageTable, users, async () => {
      await this._media.applyMessagesMedia(result.messages);
      await messageTable.bulkPut(messages);
      await users.bulkPut(result.users.map(toStoredUser).filter((u) => !!u));
    });
  }

  async updateNewMessage(result: Api.UpdateNewMessage): Promise<void> {
    await this.applyMessage(result.message);
  }
}
