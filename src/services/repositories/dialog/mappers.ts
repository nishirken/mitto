import type { Api } from 'telegram';
import telegram from 'telegram';
import type { Timestamp } from 'utils/flavour';
import {
  type MessageId,
  type StoredDialog,
  type StoredMessage,
  type StoredUser,
} from '../../database';
import { peerKey } from '../../peer-key';
import { toStoredUser } from '../user/mappers';
import { isNotNull } from '../../../utils/guards';
import { toStoredMessage } from '../message/mappers';

const { Api: A } = telegram;

export function toStoredDialog(d: Api.Dialog, topMessageDate: Timestamp = 0 as Timestamp): StoredDialog {
  return {
    peerId: peerKey(d.peer),
    topMessageId: d.topMessage as MessageId,
    unreadCount: d.unreadCount,
    date: topMessageDate,
    pinned: !!d.pinned,
    readInboxMaxId: d.readInboxMaxId as MessageId,
    readOutboxMaxId: d.readOutboxMaxId as MessageId,
  };
}

export type MappedDialogs = {
  users: StoredUser[];
  messages: StoredMessage[];
  dialogs: StoredDialog[];
};

export function mapDialogsResponse(
  result: Api.messages.Dialogs | Api.messages.DialogsSlice,
): MappedDialogs {
  const users = result.users.map(toStoredUser).filter(isNotNull);
  const messages = result.messages.map(toStoredMessage).filter(isNotNull);
  const dateByKey = new Map<string, Timestamp>();

  for (const m of messages) dateByKey.set(`${m.peerId}:${m.id}`, m.date);

  const dialogs = result.dialogs
    .filter((d): d is Api.Dialog => d instanceof A.Dialog)
    .map((d) => toStoredDialog(d, dateByKey.get(`${peerKey(d.peer)}:${d.topMessage}`)));

  return { users, messages, dialogs };
}

