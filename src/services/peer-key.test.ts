import { describe, it, expect } from 'vitest';
import telegram from 'telegram';
import { peerKey, parsePeerKey } from './peer-key';

// Native bigints stand in for gramjs `BigInteger` here — `peerKey` only calls
// `.toString()` on the id, and both share identical decimal-string semantics.
const big = (n: string) => n as unknown as BigInteger & { toString(): string };

describe('peerKey', () => {
  it('builds prefixed keys from Api.TypePeer', () => {
    expect(peerKey(new telegram.Api.PeerUser({ userId: big('123') }))).toBe('user:123');
    expect(peerKey(new telegram.Api.PeerChat({ chatId: big('123') }))).toBe('chat:123');
    expect(peerKey(new telegram.Api.PeerChannel({ channelId: big('123') }))).toBe('channel:123');
  });

  it('builds prefixed keys from a BigInteger + kind', () => {
    expect(peerKey(big('7139858604'), 'user')).toBe('user:7139858604');
    expect(peerKey(big('42'), 'chat')).toBe('chat:42');
    expect(peerKey(big('42'), 'channel')).toBe('channel:42');
  });

  it('does not collide across peer kinds with the same numeric id', () => {
    expect(peerKey(big('5'), 'user')).not.toBe(peerKey(big('5'), 'chat'));
    expect(peerKey(big('5'), 'chat')).not.toBe(peerKey(big('5'), 'channel'));
  });

  it('resolves the same key from a Peer and from its BigInteger id', () => {
    const fromPeer = peerKey(new telegram.Api.PeerUser({ userId: big('999') }));
    const fromId = peerKey(big('999'), 'user');
    expect(fromPeer).toBe(fromId);
  });
});

describe('parsePeerKey', () => {
  it('round-trips every kind', () => {
    for (const key of ['user:123', 'chat:456', 'channel:789'] as const) {
      const { kind, id } = parsePeerKey(key as never);
      expect(`${kind === 'user' ? 'user' : kind}:${id}`).toBe(key);
    }
  });

  it('splits kind and id at the first colon', () => {
    expect(parsePeerKey('channel:789' as never)).toEqual({ kind: 'channel', id: '789' });
  });
});
