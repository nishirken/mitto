import type { Api } from 'telegram';
import telegram from 'telegram';
import { Database, StoredMedia, type MediaId } from '../../database';
import { toStoredMedia } from './mappers';

const { Api: A } = telegram;

// Maps and writes message media to the database
export class MediaRepository {
  constructor(private readonly _storage: Database) {}

  async applyMessagesMedia(messages: Api.TypeMessage[]): Promise<void> {
    const media = new Map<MediaId, StoredMedia>();

    for (const message of messages) {
      if (!(message instanceof A.Message) || !message.media) continue;

      const stored = toStoredMedia(message.media);
      if (stored) media.set(stored.id, stored);
    }

    await this._storage.putMedia([...media.values()]);
  }

  async applyMedia(media: Api.TypeMessageMedia): Promise<MediaId | null> {
    const stored = toStoredMedia(media);

    if (!stored) return null;

    await this._storage.putMedia([stored]);

    return stored.id;
  }
}
