import type { Api } from 'telegram';
import telegram from 'telegram';
import type {
  ChannelId,
  ChatId,
  PeerId,
  UserId,
} from './database';
import { StoredPeer } from './database/database-schema';

export type PeerKind = 'user' | 'chat' | 'channel';

const PREFIX: Record<PeerKind, string> = {
  user: 'user',
  chat: 'chat',
  channel: 'channel',
};

/**
 * Produces the single canonical string key for a peer. The `kind:` prefix avoids
 * user/chat/channel id collisions and encodes the peer type (needed later to
 * rebuild an InputPeer). This is the only place a `BigInteger` id crosses into
 * storage — always via `.toString()`.
 */
export function peerKey(peer: Api.TypePeer): PeerId;
export function peerKey(id: BigInteger, kind: 'user'): UserId;
export function peerKey(id: BigInteger, kind: 'chat'): ChatId;
export function peerKey(id: BigInteger, kind: 'channel'): ChannelId;
export function peerKey(peer: Api.TypePeer | BigInteger, kind?: PeerKind): PeerId {
  if (kind) {
    return `${PREFIX[kind]}:${(peer as BigInteger).toString()}` as PeerId;
  }

  const p = peer as Api.TypePeer;
  if (p instanceof telegram.Api.PeerUser) return `user:${p.userId.toString()}` as UserId;
  if (p instanceof telegram.Api.PeerChat) return `chat:${p.chatId.toString()}` as ChatId;

  return `channel:${(p as Api.PeerChannel).channelId.toString()}` as ChannelId;
}

export function parsePeerKey(key: PeerId): { kind: PeerKind; id: string } {
  const [kind, id] = key.split(':');

  if (!kind || !['user', 'chat', 'channel'].includes(kind)) {
    throw new Error(`peerId is invalid: ${key}`);
  }

  if (!id) {
    throw new Error(`peerId is invalid: ${key}`);
  }

  return { kind: kind as PeerKind, id };
}

export function isUser(key: PeerId): key is UserId {
  return parsePeerKey(key).kind === 'user';
}

/**
 * Rebuilds a GramJS `InputPeer` from a stored entity, using the persisted
 * `accessHash`. `helpers.returnBigInt` turns the stored decimal strings back into
 * the `BigInteger` values GramJS expects for `long` fields.
 */
export function toInputPeer(peer: StoredPeer): Api.TypeInputPeer {
  const { kind, id } = parsePeerKey(peer.id);
  const bi = telegram.helpers.returnBigInt;

  if (kind === 'user') {
    return new telegram.Api.InputPeerUser({ userId: bi(id), accessHash: bi(peer.accessHash ?? '0') });
  }
  if (kind === 'channel') {
    return new telegram.Api.InputPeerChannel({
      channelId: bi(id),
      accessHash: bi(peer.accessHash ?? '0'),
    });
  }

  return new telegram.Api.InputPeerChat({ chatId: bi(id) });
}
