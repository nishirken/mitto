import type { Api } from 'telegram';
import type { Database, MessageId, PeerId } from '../../database';
import { mapDialogsResponse } from './mappers';
import { mergeUser } from '../user/mappers';
import type { IMediaRepository } from '../media/media-repository';

export interface IDialogRepository {
  applyDialogsResponse(result: Api.messages.Dialogs | Api.messages.DialogsSlice): Promise<void>;
  applyReadInbox(peerId: PeerId, maxId: MessageId, stillUnreadCount: number): Promise<void>;
  applyReadOutbox(peerId: PeerId, maxId: MessageId): Promise<void>;
}

// Writes to the database. Each method commits in a single transaction so `liveQuery`
// subscribers observe one update per operation rather than one per table.
export class DialogRepository implements IDialogRepository {
  constructor(
    private readonly _storage: Database,
    private readonly _media: IMediaRepository,
  ) {}

  async applyDialogsResponse(
    result: Api.messages.Dialogs | Api.messages.DialogsSlice,
  ): Promise<void> {
    const { users, messages, dialogs } = mapDialogsResponse(result);
    const { media, users: userTable, messages: messageTable, dialogs: dialogTable } = this._storage;

    await this._storage.transaction('rw', media, userTable, messageTable, dialogTable, async () => {
      await this._media.applyMessagesMedia(result.messages);
      await this._storage.putAll(users, mergeUser, messages, dialogs);
    });
  }

  async applyReadInbox(peerId: PeerId, maxId: MessageId, stillUnreadCount: number): Promise<void> {
    await this._storage.transaction('rw', this._storage.dialogs, async () => {
      const dialog = await this._storage.dialogs.get(peerId);

      if (!dialog || maxId <= dialog.readInboxMaxId) return;

      await this._storage.dialogs.put({
        ...dialog,
        readInboxMaxId: maxId,
        unreadCount: stillUnreadCount,
      });
    });
  }

  async applyReadOutbox(peerId: PeerId, maxId: MessageId): Promise<void> {
    await this._storage.transaction('rw', this._storage.dialogs, async () => {
      const dialog = await this._storage.dialogs.get(peerId);

      if (!dialog || maxId <= dialog.readOutboxMaxId) return;

      await this._storage.dialogs.put({ ...dialog, readOutboxMaxId: maxId });
    });
  }
}
