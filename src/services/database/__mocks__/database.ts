import type {
  Database,
  MediaId,
  PeerId,
  StoredDialog,
  StoredMedia,
  StoredMessage,
  StoredUser,
  UserId,
} from '../';

/**
 * In-memory stand-in for `Database`, used by repository/read-model tests
 * (the test env has no IndexedDB). Implements only the methods those classes call.
 */
export class FakeDatabase {
  readonly users = new Map<string, StoredUser>();
  readonly messages = new Map<string, StoredMessage>();
  readonly dialogs = new Map<string, StoredDialog>();
  readonly media = new Map<string, StoredMedia>();

  async putUsers(users: StoredUser[]): Promise<void> {
    for (const u of users) this.users.set(u.id, u);
  }

  async putMessages(msgs: StoredMessage[]): Promise<void> {
    for (const m of msgs) this.messages.set(`${m.peerId}:${m.id}`, m);
  }

  async putDialogs(dialogs: StoredDialog[]): Promise<void> {
    for (const d of dialogs) this.dialogs.set(d.peerId, d);
  }

  async putMedia(media: StoredMedia[]): Promise<void> {
    for (const m of media) this.media.set(m.id, m);
  }

  async putAll(
    users: StoredUser[],
    mergeUser: (x: StoredUser, y: StoredUser) => StoredUser,
    messages: StoredMessage[],
    dialogs: StoredDialog[],
  ): Promise<void> {
    await this.putUsers(users);
    await this.putMessages(messages);
    await this.putDialogs(dialogs);
  }

  async getUser(id: UserId): Promise<StoredUser | undefined> {
    return this.users.get(id);
  }

  async getUsers(ids: UserId[]): Promise<(StoredUser | undefined)[]> {
    return ids.map((id) => this.users.get(id));
  }

  async getPeer(id: PeerId): Promise<StoredUser | undefined> {
    return this.users.get(id);
  }

  async getMedia(id: MediaId): Promise<StoredMedia | undefined> {
    return this.media.get(id);
  }

  async getMediaItems(ids: MediaId[]): Promise<StoredMedia[]> {
    return ids.map((id) => this.media.get(id)).filter(m => !!m) as StoredMedia[];
  }

  async getMessage(chatId: PeerId, id: number): Promise<StoredMessage | undefined> {
    return this.messages.get(`${chatId}:${id}`);
  }

  async getDialog(peerId: PeerId): Promise<StoredDialog | undefined> {
    return this.dialogs.get(peerId);
  }

  async getDialogs(ids: PeerId[]): Promise<StoredDialog[]> {
    return ids.map((id) => this.dialogs.get(id)).filter(d => !!d) as StoredDialog[];
  }

  async loadMessages(peerId: PeerId): Promise<StoredMessage[]> {
    return [...this.messages.values()].filter((m) => m.peerId === peerId);
  }

  async loadDialogs(): Promise<StoredDialog[]> {
    return [...this.dialogs.values()];
  }
}

export function createFakeStorage(): { storage: Database; fake: FakeDatabase } {
  const fake = new FakeDatabase();

  return { storage: fake as unknown as Database, fake };
}
