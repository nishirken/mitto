import { describe, expect, test } from 'vitest';
import type { Api as ApiTypes } from 'telegram';
import telegram from 'telegram';
import { mediaKey, toStoredMedia } from './mappers';

const { Api } = telegram;
const big = (n: string) => n as unknown as BigInteger;
const bytes = (...xs: number[]) => new Uint8Array(xs);

function photo(sizes: ApiTypes.TypePhotoSize[] = []) {
  return new Api.Photo({
    id: big('10'),
    accessHash: big('99'),
    fileReference: bytes(1, 2),
    date: 1000,
    sizes,
    dcId: 2,
  });
}

function document(attributes: ApiTypes.TypeDocumentAttribute[]) {
  return new Api.Document({
    id: big('20'),
    accessHash: big('88'),
    fileReference: bytes(3, 4),
    date: 2000,
    mimeType: 'video/mp4',
    size: big('4096'),
    dcId: 4,
    attributes,
  });
}

describe('Media', () => {
  test('projects a photo using the smallest rendition that fills the screen', () => {
    const media = new Api.MessageMediaPhoto({
      photo: photo([
        new Api.PhotoStrippedSize({ type: 'i', bytes: bytes(0) }),
        new Api.PhotoSize({ type: 'm', w: 320, h: 240, size: 100 }),
        new Api.PhotoSize({ type: 'x', w: 800, h: 600, size: 4000 }),
        new Api.PhotoSize({ type: 'y', w: 1280, h: 960, size: 90000 }),
      ]),
    });

    expect(toStoredMedia(media)).toEqual({
      id: 'photo:10',
      type: 'photo',
      fileId: '10',
      accessHash: '99',
      fileReference: new Uint8Array([1, 2]),
      dcId: 2,
      date: 1000,
      thumbSize: 'x',
      size: 4000,
      width: 800,
      height: 600,
    });
  });

  test('falls back to the largest rendition when none fills the screen', () => {
    const media = new Api.MessageMediaPhoto({
      photo: photo([
        new Api.PhotoSize({ type: 's', w: 90, h: 60, size: 10 }),
        new Api.PhotoSize({ type: 'm', w: 320, h: 240, size: 100 }),
      ]),
    });

    expect(toStoredMedia(media)).toMatchObject({
      thumbSize: 'm',
      size: 100,
      width: 320,
      height: 240,
    });
  });

  test('reads the byte count of a progressive rendition from its last scan', () => {
    const media = new Api.MessageMediaPhoto({
      photo: photo([
        new Api.PhotoSizeProgressive({ type: 'a', w: 640, h: 480, sizes: [100, 900, 7000] }),
      ]),
    });

    expect(toStoredMedia(media)).toMatchObject({ thumbSize: 'a', size: 7000, width: 640 });
  });

  test('projects a photo without sizes', () => {
    const media = new Api.MessageMediaPhoto({ photo: photo() });

    expect(toStoredMedia(media)).toMatchObject({ id: 'photo:10', type: 'photo' });
  });

  test('projects a video document', () => {
    const media = new Api.MessageMediaDocument({
      document: document([new Api.DocumentAttributeVideo({ duration: 12, w: 640, h: 480 })]),
    });

    expect(toStoredMedia(media)).toMatchObject({
      id: 'video:20',
      type: 'video',
      fileId: '20',
      accessHash: '88',
      dcId: 4,
      mimeType: 'video/mp4',
      size: 4096,
      width: 640,
      height: 480,
      duration: 12,
    });
  });

  test('projects a voice document', () => {
    const media = new Api.MessageMediaDocument({
      document: document([new Api.DocumentAttributeAudio({ voice: true, duration: 7 })]),
    });

    expect(toStoredMedia(media)).toMatchObject({
      id: 'voice:20',
      type: 'voice',
      duration: 7,
    });
  });

  test('prefers voice over video when both the flag and attributes are set', () => {
    const media = new Api.MessageMediaDocument({
      voice: true,
      document: document([
        new Api.DocumentAttributeAudio({ voice: true, duration: 7 }),
        new Api.DocumentAttributeVideo({ duration: 7, w: 0, h: 0 }),
      ]),
    });

    expect(toStoredMedia(media)).toMatchObject({ type: 'voice' });
  });

  test('returns null for an unsupported document', () => {
    const media = new Api.MessageMediaDocument({
      document: document([new Api.DocumentAttributeFilename({ fileName: 'notes.pdf' })]),
    });

    expect(toStoredMedia(media)).toBeNull();
  });

  test('returns null for a photo-less MessageMediaPhoto', () => {
    expect(toStoredMedia(new Api.MessageMediaPhoto({}))).toBeNull();
  });

  test('returns null for unsupported media variants', () => {
    expect(toStoredMedia(new Api.MessageMediaEmpty())).toBeNull();
    expect(toStoredMedia(new Api.MessageMediaUnsupported())).toBeNull();
  });

  describe('Key', () => {
    test('matches the projected id', () => {
      const media = new Api.MessageMediaPhoto({ photo: photo() });

      expect(mediaKey(media)).toBe(toStoredMedia(media)?.id);
    });

    test('returns null for unsupported media', () => {
      expect(mediaKey(new Api.MessageMediaEmpty())).toBeNull();
    });
  });
});
