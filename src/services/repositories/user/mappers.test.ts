import { describe, expect, test } from "vitest";
import telegram from 'telegram';
import { mergeUser, toStoredUser } from "./mappers";
import { StoredUser } from "../../database";

const { Api } = telegram;
const big = (n: string) => n as unknown as BigInteger;

describe('User', () => {
  test('projects a full user', () => {
    const u = new Api.User({
      id: big('123'),
      accessHash: big('999'),
      firstName: 'Ada',
      lastName: 'Lovelace',
      username: 'ada',
      phone: '555',
    });
    expect(toStoredUser(u)).toMatchObject({
      id: 'user:123',
      accessHash: '999',
      firstName: 'Ada',
      lastName: 'Lovelace',
      username: 'ada',
      phone: '555',
      isMin: false,
      isBot: false,
      isDeleted: false,
    });
  });

  test('returns null for UserEmpty', () => {
    expect(toStoredUser(new Api.UserEmpty({ id: big('1') }))).toBeNull();
  });

  describe('Merge', () => {
    const user: StoredUser = {
      id: 'user:1' as StoredUser['id'],
      accessHash: 'HASH',
      firstName: 'Ada',
      lastName: 'L',
      username: 'ada',
      phone: '555',
      isBot: false,
      isDeleted: false,
      isMin: false,
    };
    const minUser: StoredUser = { ...user, isMin: true };

    test('Both incoming and existing are min', () => {
      const incoming: StoredUser = { ...minUser, accessHash: 'newHASH' };
      expect(mergeUser(minUser, incoming)).toEqual(incoming);
    });

    test('Existing is not min, incoming is min', () => {
      const incoming: StoredUser = { ...minUser, accessHash: 'newHASH' };
      expect(mergeUser(user, incoming)).toEqual(user);
    });

    test('Existing is min, incoming is not min', () => {
      const incoming: StoredUser = { ...user, accessHash: 'newHASH' };
      expect(mergeUser(minUser, incoming)).toEqual(incoming);
    });

    test('Both are not min', () => {
      const incoming: StoredUser = { ...user, accessHash: 'newHASH' };
      expect(mergeUser(user, incoming)).toEqual(incoming);
    });
  });
});
