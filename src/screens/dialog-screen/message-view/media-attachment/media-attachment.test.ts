import { describe, expect, test } from 'vitest';
import { fixture, html } from '@open-wc/testing';
import { settled, tid } from '../../../../test-utils';
import type { MediaId } from '../../../../services/database';
import type { Services } from '../../../../api/services-context';
import { MockMediaFileService } from '../../../../services/media/__mocks__/media-file-service';
import type { MessageMedia, MessageViewableMessage } from '../../dialog-projection';
import './media-attachment';
import type { MediaAttachment, MediaOpenDetail } from './media-attachment';

const photo = {
  id: 'photo:1' as MediaId,
  type: 'photo',
  size: 240640,
  width: 800,
  height: 600,
} satisfies MessageViewableMessage;

const video = { id: 'video:1' as MediaId, type: 'video', size: 1468006 } satisfies MessageMedia;

async function mount(media: MessageViewableMessage, url: string | null = 'blob:media') {
  const mediaFileService = new MockMediaFileService();
  mediaFileService.url.mockResolvedValue(url);
  const el = await fixture<MediaAttachment>(
    html`<media-attachment .media=${media}></media-attachment>`,
  );
  el.services = { mediaFileService } as unknown as Services;

  return { el, mediaFileService };
}

describe('media-attachment', () => {
  test('shows the file size before anything is downloaded', async () => {
    const { el } = await mount(photo);

    expect(tid(el, 'media.download')!.textContent).toContain('235 KB');
  });

  test('renders the photo inline once downloaded', async () => {
    const { el, mediaFileService } = await mount(photo);

    tid(el, 'media.download')!.click();
    await settled(el);

    expect(mediaFileService.url).toHaveBeenCalledWith('photo:1');
    const img = tid(el, 'media.photo')!.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('blob:media');
  });

  test('asks for full screen when the inline photo is tapped', async () => {
    const { el } = await mount(photo);
    const opened: MediaOpenDetail[] = [];
    el.addEventListener('mediaopen', (e) => opened.push(e.detail));

    tid(el, 'media.download')!.click();
    await settled(el);
    tid(el, 'media.photo')!.click();

    expect(opened).toEqual([{ url: 'blob:media', type: 'photo' }]);
  });

  test('goes straight to full screen for a video', async () => {
    const { el } = await mount(video);
    const opened: MediaOpenDetail[] = [];
    el.addEventListener('mediaopen', (e) => opened.push(e.detail));

    tid(el, 'media.download')!.click();
    await settled(el);

    expect(opened).toEqual([{ url: 'blob:media', type: 'video' }]);
    expect(tid(el, 'media.photo')).toBeNull();
  });

  test('disables the chip when the file cannot be downloaded', async () => {
    const { el } = await mount(photo, null);

    tid(el, 'media.download')!.click();
    await settled(el);

    const chip = tid<HTMLButtonElement>(el, 'media.download')!;
    expect(chip.disabled).toBe(true);
    expect(chip.textContent).toContain('Unavailable');
  });
});
