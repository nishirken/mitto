import type { Api } from 'telegram';
import telegram from 'telegram';
import type { StoredUser } from '../../database';
import { peerKey } from '../../peer-key';

const { Api: A } = telegram;

export function toStoredUser(u: Api.TypeUser): StoredUser | null {
  if (u instanceof A.UserEmpty) return null;

  const { id, bot, deleted, firstName, lastName, username, phone, min, accessHash } = u;

  return {
    id: peerKey(id, 'user'),
    accessHash: accessHash?.toString(),
    firstName: firstName,
    lastName: lastName,
    username: username,
    phone: phone,
    isMin: !!min,
    isBot: !!bot,
    isDeleted: !!deleted,
  };
}

export function mergeUser(existing: StoredUser, incoming: StoredUser): StoredUser {
  if (!incoming.isMin || (existing.isMin && incoming.isMin)) {
    return incoming;
  }

  return existing;
}
