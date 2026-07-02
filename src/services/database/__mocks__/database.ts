import type {
  Database,
  PeerId,
  StoredDialog,
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

  async putUsers(users: StoredUser[]): Promise<void> {
    for (const u of users) this.users.set(u.id, u);
  }

  async putMessages(msgs: StoredMessage[]): Promise<void> {
    for (const m of msgs) this.messages.set(`${m.peerId}:${m.id}`, m);
  }

  async putDialogs(dialogs: StoredDialog[]): Promise<void> {
    for (const d of dialogs) this.dialogs.set(d.peerId, d);
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

  async getMessage(chatId: PeerId, id: number): Promise<StoredMessage | undefined> {
    return this.messages.get(`${chatId}:${id}`);
  }

  async getDialog(peerId: PeerId): Promise<StoredDialog | undefined> {
    return this.dialogs.get(peerId);
  }

  async loadDialogs(): Promise<StoredDialog[]> {
    return [...this.dialogs.values()];
  }
}

export function createFakeStorage(): { storage: Database; fake: FakeDatabase } {
  const fake = new FakeDatabase();

  return { storage: fake as unknown as Database, fake };
}
