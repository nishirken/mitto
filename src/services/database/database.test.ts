import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { DB_NAME, Database } from "./database";
import { deleteDB } from 'idb';
import { mockStoredDialog, mockStoredMessage, mockStoredUser } from "./database-schema.mocks";
import { ChatId, MessageId, UserId } from "./database-schema";
import { mergeUser } from "../repositories/user/mappers";

describe('Database', () => {
  let storage: Database;

  beforeEach(async () => {
    storage = await Database.create();
  });

  afterEach(async () => {
    storage.close();
    await deleteDB(DB_NAME);
  });

  describe('Meta', () => {
    test('get session', async () => {
      await storage.setSession("test_session");
      const session = await storage.getSession();
      expect(session).toBe('test_session');
    });

    test('clear session', async () => {
      await storage.setSession("test_session");
      await storage.clearSession();
      const session = await storage.getSession();
      expect(session).toBeNull();
    });
  });

  describe('Users', () => {
    const users = [
      mockStoredUser({ id: '1' as UserId }),
      mockStoredUser({ id: '2' as UserId })
    ];

    beforeEach(async () => {
      await storage.putUsers(users);
    });


    test('Get users', async () => {
      const _users = await storage.getUsers(['1', '2']);
      expect(_users).toEqual(users);
    });

    test('Get user', async () => {
      const user = await storage.getUser('1');
      expect(user).toEqual(users[0]);
    });
  });

  describe('Messages', () => {
    const messages = [
      mockStoredMessage({ peerId: '1' as ChatId, id: 1 as MessageId }),
      mockStoredMessage({ peerId: '1' as ChatId, id: 2 as MessageId }),
    ];

    beforeEach(async () => {
      await storage.putMessages(messages);
    });

    test('Get message', async () => {
      const message = await storage.getMessage('1' as ChatId, 1);
      expect(message).toEqual(messages[0]);
    });
  });

  describe('Dialogs', () => {
    const dialogs = [
      mockStoredDialog({ peerId: '1' as ChatId, topMessageId: 1 as MessageId }),
      mockStoredDialog({ peerId: '2' as ChatId, topMessageId: 2 as MessageId }),
    ];

    beforeEach(async () => {
      await storage.putDialogs(dialogs);
    });

    test('Get dialog', async () => {
      const dialog = await storage.getDialog('2' as ChatId);
      expect(dialog).toEqual(dialogs[1]);
    });
  });

  test('Put all', async () => {
    const users = [mockStoredUser({ id: '1' as UserId })];
    const messages = [mockStoredMessage({ id: 1 as MessageId, peerId: '1' as ChatId })];
    const dialogs = [mockStoredDialog({ peerId: '1' as ChatId })];
    await storage.putAll(
      users,
      mergeUser,
      messages,
      dialogs,
    );
    const _users = await storage.getUsers(['1']);
    const _message = await storage.getMessage('1', 1);
    const _dialog = await storage.getDialog('1');
    expect(_users).toEqual(users);
    expect(_message).toEqual(messages[0]);
    expect(_dialog).toEqual(dialogs[0]);
  });
});
