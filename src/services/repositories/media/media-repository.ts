import type { Api } from 'telegram';
import telegram from 'telegram';
import type { Database, StoredMedia, MediaId } from '../../database';
import { toStoredMedia } from './mappers';

const { Api: A } = telegram;

// Maps and writes message media to the database
export interface IMediaRepository {
  applyMessagesMedia(messages: Api.TypeMessage[]): Promise<void>;
  applyMedia(media: Api.TypeMessageMedia): Promise<MediaId | null>;
}

export class MediaRepository implements IMediaRepository {
  constructor(private readonly _storage: Database) {}

  async applyMessagesMedia(messages: Api.TypeMessage[]): Promise<void> {
    const media = new Map<MediaId, StoredMedia>();

    for (const message of messages) {
      if (!(message instanceof A.Message) || !message.media) continue;

      const stored = toStoredMedia(message.media);
      if (stored) media.set(stored.id, stored);
    }

    await this._storage.media.bulkPut([...media.values()]);
  }

  async applyMedia(media: Api.TypeMessageMedia): Promise<MediaId | null> {
    const stored = toStoredMedia(media);

    if (!stored) return null;

    await this._storage.media.bulkPut([stored]);

    return stored.id;
  }
}
