import { describe, expect, test } from 'vitest';
import telegram from 'telegram';
import { mockStoredMedia } from '../database/__mocks__/database-schema';
import { toInputLocation, toTelegramBytes } from './input-location';

const { Api } = telegram;

describe('Input location', () => {
  test('builds a photo location from the stored rendition', () => {
    const location = toInputLocation(
      mockStoredMedia({ fileId: '10', accessHash: '99', thumbSize: 'x', dcId: 2 }),
    );

    expect(location).toBeInstanceOf(Api.InputPhotoFileLocation);
    expect(location).toMatchObject({ thumbSize: 'x' });
    expect((location as InstanceType<typeof Api.InputPhotoFileLocation>).id.toString()).toBe('10');
    expect(
      (location as InstanceType<typeof Api.InputPhotoFileLocation>).accessHash.toString(),
    ).toBe('99');
  });

  test('builds a document location that asks for the whole file', () => {
    const location = toInputLocation(mockStoredMedia({ type: 'voice', thumbSize: undefined }));

    expect(location).toBeInstanceOf(Api.InputDocumentFileLocation);
    expect(location).toMatchObject({ thumbSize: '' });
  });

  test('returns null for a photo stored without a rendition', () => {
    expect(toInputLocation(mockStoredMedia({ thumbSize: undefined }))).toBeNull();
  });

  test('converts the file reference without changing its bytes', () => {
    const bytes = new Uint8Array([0, 1, 127, 128, 255]);

    expect([...toTelegramBytes(bytes)]).toEqual([...bytes]);
  });

  test('hands the serializer bytes it accepts', () => {
    const location = toInputLocation(mockStoredMedia({ fileReference: new Uint8Array([7, 8]) }));

    expect(() => location?.getBytes()).not.toThrow();
  });
});
