import { beforeEach, describe, expect, test } from 'vitest';
import { createFakeStorage, FakeDatabase } from '../../services/database/__mocks__/database';
import { DatabaseHub } from '../../services/database/database-hub';
import { mockStoredMedia, mockStoredMessage } from '../../services/database/database-schema.mocks';
import { MediaId, MessageId, PeerId } from '../../services/database/database-schema';
import { Database } from '../../services/database';
import { ChatViewProjection, toMessageListItem } from './chat-view-projection';

const peerId = 'user:1' as PeerId;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Message media', () => {
  test('projects a photo with its dimensions', () => {
    const media = mockStoredMedia({ id: 'photo:9' as MediaId, width: 1280, height: 960 });
    const message = mockStoredMessage({ mediaId: media.id });

    expect(toMessageListItem(message, media).media).toEqual({
      id: 'photo:9',
      type: 'photo',
      width: 1280,
      height: 960,
    });
  });

  test('projects a video with dimensions and duration', () => {
    const media = mockStoredMedia({
      id: 'video:9' as MediaId,
      type: 'video',
      width: 640,
      height: 480,
      duration: 12,
    });

    expect(toMessageListItem(mockStoredMessage({ mediaId: media.id }), media).media).toEqual({
      id: 'video:9',
      type: 'video',
      width: 640,
      height: 480,
      duration: 12,
    });
  });

  test('projects a voice with duration only', () => {
    const media = mockStoredMedia({ id: 'voice:9' as MediaId, type: 'voice', duration: 7 });

    expect(toMessageListItem(mockStoredMessage({ mediaId: media.id }), media).media).toEqual({
      id: 'voice:9',
      type: 'voice',
      duration: 7,
    });
  });

  test('leaves media unset without a media row', () => {
    expect(toMessageListItem(mockStoredMessage()).media).toBeUndefined();
  });
});

describe('ChatViewProjection', () => {
  let storage: Database;
  let fake: FakeDatabase;
  let hub: DatabaseHub;
  let projection: ChatViewProjection;

  beforeEach(async () => {
    ({ storage, fake } = createFakeStorage());
    hub = new DatabaseHub();
    projection = new ChatViewProjection(storage, hub, peerId);
    await projection.init();
  });

  test('fulfills media for a batch of messages', async () => {
    await fake.putMedia([mockStoredMedia({ id: 'photo:9' as MediaId, width: 800, height: 480 })]);
    await fake.putMessages([
      mockStoredMessage({ peerId, id: 1 as MessageId }),
      mockStoredMessage({ peerId, id: 2 as MessageId, mediaId: 'photo:9' as MediaId }),
    ]);

    hub.notify('newMessages', []);
    await flush();

    const messages = projection.messages.get();
    expect(messages).toHaveLength(2);
    expect(messages[0].media).toBeUndefined();
    expect(messages[1].media).toEqual({ id: 'photo:9', type: 'photo', width: 800, height: 480 });
  });

  test('fulfills media for a single new message', async () => {
    await fake.putMedia([mockStoredMedia({ id: 'voice:9' as MediaId, type: 'voice', duration: 3 })]);
    await fake.putMessages([
      mockStoredMessage({ peerId, id: 5 as MessageId, mediaId: 'voice:9' as MediaId }),
    ]);

    hub.notify('newMessage', { peerId, id: 5 as MessageId });
    await flush();

    expect(projection.messages.get()[0].media).toEqual({
      id: 'voice:9',
      type: 'voice',
      duration: 3,
    });
  });

  test('leaves media unset when the row is missing', async () => {
    await fake.putMessages([
      mockStoredMessage({ peerId, id: 6 as MessageId, mediaId: 'photo:404' as MediaId }),
    ]);

    hub.notify('newMessage', { peerId, id: 6 as MessageId });
    await flush();

    expect(projection.messages.get()[0].media).toBeUndefined();
  });
});
