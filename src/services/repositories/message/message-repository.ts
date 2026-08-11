import type { Api } from 'telegram';
import type { DatabaseHub } from '../../database/database-hub';
import type { IDatabase, StoredDialog, StoredMessage } from '../../database';
import { toStoredUser } from '../user/mappers';
import type { IMediaRepository } from '../media/media-repository';
import { toStoredMessage } from './mappers';

export interface IMessageRepository {
  applyMessage(message: Api.TypeMessage): Promise<void>;
  applyNewMessage(msg: StoredMessage): Promise<void>;
  applyMessagesResponse(result: Api.messages.Messages | Api.messages.MessagesSlice): Promise<void>;
  updateNewMessage(result: Api.UpdateNewMessage): Promise<void>;
}

// Writes messages to the database
export class MessageRepository implements IMessageRepository {
  constructor(
    private readonly _storage: IDatabase,
    private readonly _hub: DatabaseHub,
    private readonly _media: IMediaRepository,
  ) {}

  async applyMessage(message: Api.TypeMessage): Promise<void> {
    const stored = toStoredMessage(message);

    if (!stored) return;

    await this._media.applyMessagesMedia([message]);
    await this._apply(stored);
  }

  async applyNewMessage(msg: StoredMessage): Promise<void> {
    await this._apply(msg);
  }

  private async _apply(msg: StoredMessage): Promise<void> {
    await this._storage.putMessages([msg]);

    const dialog = await this._storage.getDialog(msg.peerId);

    if (dialog && msg.id > dialog.topMessageId) {
      const updated: StoredDialog = {
        ...dialog,
        topMessageId: msg.id,
        date: msg.date,
        unreadCount: msg.isOutgoing ? dialog.unreadCount : dialog.unreadCount + 1,
      };
      await this._storage.putDialogs([updated]);
    }

    this._hub.notify('newMessage', { peerId: msg.peerId, id: msg.id });
  }

  async applyMessagesResponse(
    result: Api.messages.Messages | Api.messages.MessagesSlice,
  ): Promise<void> {
    const messages = result.messages.map(toStoredMessage).filter((m) => !!m);
    await this._media.applyMessagesMedia(result.messages);
    await this._storage.putMessages(messages);
    await this._storage.putUsers(result.users.map(toStoredUser).filter((u) => !!u));
    this._hub.notify('newMessages', messages);
  }

  async updateNewMessage(result: Api.UpdateNewMessage): Promise<void> {
    await this.applyMessage(result.message);
  }
}
