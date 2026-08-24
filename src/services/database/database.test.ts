import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { DB_NAME, Database } from './database';
import { Dexie } from 'dexie';
import {
  mockStoredDialog,
  mockStoredMedia,
  mockStoredMessage,
  mockStoredUser,
} from './__mocks__/database-schema';
import type { ChatId, MediaId, MessageId, UserId } from './database-schema';
import { mergeUser } from '../repositories/user/mappers';

describe('Database', () => {
  let storage: Database;

  beforeEach(async () => {
    storage = await Database.create();
  });

  afterEach(async () => {
    storage.close();
    await Dexie.delete(DB_NAME);
  });

  describe('Meta', () => {
    test('get session', async () => {
      await storage.setSession('test_session');
      const session = await storage.getSession();
      expect(session).toBe('test_session');
    });

    test('clear session', async () => {
      await storage.setSession('test_session');
      await storage.clearSession();
      const session = await storage.getSession();
      expect(session).toBeNull();
    });

    test('settings default to null', async () => {
      expect(await storage.getSettings()).toBeNull();
    });

    test('get settings', async () => {
      const settings = {
        conversations: { pagedScroll: true },
        messages: { pagedScroll: false },
      };
      await storage.setSettings(settings);
      expect(await storage.getSettings()).toEqual(settings);
    });

    test('settings and session coexist', async () => {
      await storage.setSession('test_session');
      await storage.setSettings({
        conversations: { pagedScroll: false },
        messages: { pagedScroll: true },
      });
      expect(await storage.getSession()).toBe('test_session');
      expect(await storage.getSettings()).toEqual({
        conversations: { pagedScroll: false },
        messages: { pagedScroll: true },
      });
    });
  });

  describe('Users', () => {
    const users = [mockStoredUser({ id: '1' as UserId }), mockStoredUser({ id: '2' as UserId })];

    beforeEach(async () => {
      await storage.users.bulkPut(users);
    });

    test('Get users', async () => {
      const _users = await storage.users.bulkGet(['1', '2']);
      expect(_users).toEqual(users);
    });

    test('Get user', async () => {
      const user = await storage.users.get('1');
      expect(user).toEqual(users[0]);
    });
  });

  describe('Messages', () => {
    const messages = [
      mockStoredMessage({ peerId: '1' as ChatId, id: 1 as MessageId }),
      mockStoredMessage({ peerId: '1' as ChatId, id: 2 as MessageId }),
    ];

    beforeEach(async () => {
      await storage.messages.bulkPut(messages);
    });

    test('Get message', async () => {
      const message = await storage.messages.get(['1' as ChatId, 1 as MessageId]);
      expect(message).toEqual(messages[0]);
    });
  });

  describe('Media', () => {
    const media = [
      mockStoredMedia({ id: 'photo:1' as MediaId, fileId: '1' }),
      mockStoredMedia({
        id: 'voice:2' as MediaId,
        type: 'voice',
        fileId: '2',
        mimeType: 'audio/ogg',
        size: 4096,
        duration: 3,
      }),
    ];

    beforeEach(async () => {
      await storage.media.bulkPut(media);
    });

    test('Get media', async () => {
      const photo = await storage.media.get('photo:1' as MediaId);
      const voice = await storage.media.get('voice:2' as MediaId);
      expect(photo).toEqual(media[0]);
      expect(voice).toEqual(media[1]);
    });

    test('Put media is a no-op when empty', async () => {
      await storage.media.bulkPut([]);
      expect(await storage.media.get('photo:1' as MediaId)).toEqual(media[0]);
    });
  });

  describe('Dialogs', () => {
    const dialogs = [
      mockStoredDialog({ peerId: '1' as ChatId, topMessageId: 1 as MessageId }),
      mockStoredDialog({ peerId: '2' as ChatId, topMessageId: 2 as MessageId }),
    ];

    beforeEach(async () => {
      await storage.dialogs.bulkPut(dialogs);
    });

    test('Get dialog', async () => {
      const dialog = await storage.dialogs.get('2' as ChatId);
      expect(dialog).toEqual(dialogs[1]);
    });
  });

  test('Put all', async () => {
    const users = [mockStoredUser({ id: '1' as UserId })];
    const messages = [mockStoredMessage({ id: 1 as MessageId, peerId: '1' as ChatId })];
    const dialogs = [mockStoredDialog({ peerId: '1' as ChatId })];
    await storage.putAll(users, mergeUser, messages, dialogs);
    const _users = await storage.users.bulkGet(['1']);
    const _message = await storage.messages.get(['1' as ChatId, 1 as MessageId]);
    const _dialog = await storage.dialogs.get('1');
    expect(_users).toEqual(users);
    expect(_message).toEqual(messages[0]);
    expect(_dialog).toEqual(dialogs[0]);
  });
});
