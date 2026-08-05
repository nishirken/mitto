import type { Api } from 'telegram';
import telegram from 'telegram';
import {
  type MessageId,
  type StoredMessage,
} from '../../database';
import { peerKey } from '../../peer-key';
import { mediaKey } from '../media/mappers';

const { Api: A } = telegram;

export function toStoredMessage(m: Api.TypeMessage): StoredMessage | null {
  if (m instanceof A.Message) {
    const peerId = peerKey(m.peerId);

    return {
      peerId,
      id: m.id as MessageId,
      senderId: m.fromId ? peerKey(m.fromId) : undefined,
      text: m.message ?? '',
      date: m.date,
      isOutgoing: !!m.out,
      mediaId: m.media ? (mediaKey(m.media) ?? undefined) : undefined,
    };
  }

  return null;
}

