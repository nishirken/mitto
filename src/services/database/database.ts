import { Dexie, type Table } from 'dexie';
import type {
  StoredPeer,
  MediaId,
  MessageId,
  MetaKey,
  MetaRecord,
  MetaValue,
  PeerId,
  StoredSettings,
  StoredDialog,
  StoredMedia,
  StoredMessage,
  StoredUser,
  UserId,
} from './database-schema';
import { isUser } from '../peer-key';

export const DB_NAME = 'mitto';
export const DB_VERSION = 1;

/**
 * Tables are public: callers read and write them through the Dexie API directly. Only
 * operations that encode something the table API does not — a key range, a multi-table
 * transaction, the shape of the `meta` store — get a method here.
 *
 * Store declarations mirror what the `idb` upgrade callback created, key paths included and
 * without secondary indexes, so Dexie adopts an existing v1 database instead of upgrading it.
 */
export class Database extends Dexie {
  meta!: Table<MetaRecord, MetaKey>;
  users!: Table<StoredUser, UserId>;
  messages!: Table<StoredMessage, [PeerId, MessageId]>;
  dialogs!: Table<StoredDialog, PeerId>;
  media!: Table<StoredMedia, MediaId>;

  constructor(name = DB_NAME) {
    super(name);
    this.version(DB_VERSION).stores({
      meta: 'key',
      users: 'id',
      messages: '[peerId+id]',
      dialogs: 'peerId',
      media: 'id',
    });
  }

  static async create(name = DB_NAME): Promise<Database> {
    const db = new Database(name);
    await db.open();

    return db;
  }

  // --- meta ------------------------------------------------------------------

  private async _getMeta<K extends MetaKey>(key: K): Promise<MetaValue[K] | undefined> {
    const rec = await this.meta.get(key);

    return rec?.value as MetaValue[K] | undefined;
  }

  async getSession(): Promise<string | null> {
    return (await this._getMeta('session')) ?? null;
  }

  async setSession(value: string): Promise<void> {
    await this.meta.put({ key: 'session', value });
  }

  async clearSession(): Promise<void> {
    await this.meta.delete('session');
  }

  async getSettings(): Promise<StoredSettings | null> {
    return (await this._getMeta('settings')) ?? null;
  }

  async setSettings(value: StoredSettings): Promise<void> {
    await this.meta.put({ key: 'settings', value });
  }

  // --- operations the table API does not cover --------------------------------

  async getPeer(id: PeerId): Promise<StoredPeer | undefined> {
    if (isUser(id)) return this.users.get(id);
  }

  async putAll(
    users: StoredUser[],
    mergeUser: (x: StoredUser, y: StoredUser) => StoredUser,
    messages: StoredMessage[],
    dialogs: StoredDialog[],
  ): Promise<void> {
    await this.transaction('rw', this.users, this.messages, this.dialogs, async () => {
      const existing = await this.users.bulkGet(users.map((u) => u.id));
      const merged = users.map((u, i) => {
        const prev = existing[i];

        return prev ? mergeUser(prev, u) : u;
      });
      await Promise.all([
        this.users.bulkPut(merged),
        this.messages.bulkPut(messages),
        this.dialogs.bulkPut(dialogs),
      ]);
    });
  }

  async loadMessages(peerId: PeerId): Promise<StoredMessage[]> {
    return this.messages
      .where('[peerId+id]')
      .between([peerId, Dexie.minKey], [peerId, Dexie.maxKey])
      .toArray();
  }

  async clearCache(): Promise<void> {
    await this.transaction('rw', this.users, this.messages, this.dialogs, this.media, async () => {
      await Promise.all([
        this.users.clear(),
        this.messages.clear(),
        this.dialogs.clear(),
        this.media.clear(),
      ]);
    });
  }
}
