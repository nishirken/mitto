import type { Api } from 'telegram';
import telegram from 'telegram';
import { type MediaId, type StoredMedia } from '../../database';

const { Api: A } = telegram;

type ResolvedMedia =
  | { type: 'photo'; file: Api.Photo }
  | { type: 'video'; file: Api.Document }
  | { type: 'voice'; file: Api.Document };

function resolveMedia(media: Api.TypeMessageMedia): ResolvedMedia | null {
  if (media instanceof A.MessageMediaPhoto) {
    return media.photo instanceof A.Photo ? { type: 'photo', file: media.photo } : null;
  }

  if (media instanceof A.MessageMediaDocument) {
    const file = media.document;
    if (!(file instanceof A.Document)) return null;

    const audio = file.attributes.find((a) => a instanceof A.DocumentAttributeAudio);
    if (media.voice || audio?.voice) return { type: 'voice', file };

    const video = file.attributes.find((a) => a instanceof A.DocumentAttributeVideo);
    if (media.video || video) return { type: 'video', file };
  }

  return null;
}

const TARGET_WIDTH = 480;

type Rendition = { width: number; height: number; size: number; thumbSize: string };

function toRendition(size: Api.TypePhotoSize): Rendition | null {
  if (size instanceof A.PhotoSize) {
    return { width: size.w, height: size.h, size: size.size, thumbSize: size.type };
  }

  if (size instanceof A.PhotoSizeProgressive) {
    return {
      width: size.w,
      height: size.h,
      size: size.sizes[size.sizes.length - 1] ?? 0,
      thumbSize: size.type,
    };
  }

  return null;
}

function displaySize(sizes: Api.TypePhotoSize[]): Rendition | undefined {
  let fit: Rendition | undefined;
  let largest: Rendition | undefined;

  for (const size of sizes) {
    const rendition = toRendition(size);
    if (!rendition) continue;

    if (!largest || rendition.width > largest.width) largest = rendition;
    if (rendition.width < TARGET_WIDTH) continue;
    if (!fit || rendition.width < fit.width) fit = rendition;
  }

  return fit ?? largest;
}

function resolvedKey({ type, file }: ResolvedMedia): MediaId {
  return `${type}:${file.id.toString()}` as MediaId;
}

export function mediaKey(media: Api.TypeMessageMedia): MediaId | null {
  const resolved = resolveMedia(media);

  return resolved ? resolvedKey(resolved) : null;
}

export function toStoredMedia(media: Api.TypeMessageMedia): StoredMedia | null {
  const resolved = resolveMedia(media);

  if (!resolved) return null;

  const { type, file } = resolved;
  const base = {
    id: resolvedKey(resolved),
    fileId: file.id.toString(),
    accessHash: file.accessHash.toString(),
    fileReference: new Uint8Array(file.fileReference),
    dcId: file.dcId,
    date: file.date,
  };

  if (type === 'photo') {
    return { ...base, type, ...displaySize(file.sizes) };
  }

  const doc = {
    ...base,
    type,
    mimeType: file.mimeType,
    size: Number(file.size),
  };

  if (type === 'voice') {
    const audio = file.attributes.find((a) => a instanceof A.DocumentAttributeAudio);

    return { ...doc, type, duration: audio?.duration };
  }

  const video = file.attributes.find((a) => a instanceof A.DocumentAttributeVideo);

  return { ...doc, type, width: video?.w, height: video?.h, duration: video?.duration };
}
