import type { Api } from 'telegram';
import telegram from 'telegram';
import type { StoredMedia } from '../database';

const { Api: A, helpers } = telegram;

/**
 * The TL writer checks `fileReference` with `instanceof` against the GramJS bundle's own
 * `Buffer`, which it never exports — a stored `Uint8Array` is rejected. `bufferXor` reads its
 * arguments by index and returns a real `Buffer`, so xoring against zeroes converts the bytes
 * without changing them.
 */
export function toTelegramBytes(bytes: Uint8Array): Uint8Array {
  return helpers.bufferXor(bytes as never, new Uint8Array(bytes.length) as never);
}

/**
 * Rebuilds the download location for a stored media row. Photos need the rendition designator
 * recorded at ingest; rows written before it was stored are not downloadable.
 */
export function toInputLocation(media: StoredMedia): Api.TypeInputFileLocation | null {
  const bi = helpers.returnBigInt;
  const location = {
    id: bi(media.fileId),
    accessHash: bi(media.accessHash),
    fileReference: toTelegramBytes(media.fileReference) as never,
  };

  if (media.type === 'photo') {
    if (!media.thumbSize) return null;

    return new A.InputPhotoFileLocation({ ...location, thumbSize: media.thumbSize });
  }

  return new A.InputDocumentFileLocation({ ...location, thumbSize: '' });
}
