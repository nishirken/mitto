import { describe, expect, test, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing';
import { settled, tid } from '../../../../test-utils';
import type { MediaId } from '../../../../services/database';
import type { Services } from '../../../../api/services-context';
import type { MessageMedia } from '../../chat-view-projection';
import './voice-player';
import type { VoicePlayer } from './voice-player';

const voice = { id: 'voice:1' as MediaId, type: 'voice', duration: 3 } satisfies MessageMedia;

async function mount(url: string | null = 'blob:voice') {
  const play = vi.fn(async () => {});

  class MockAudio {
    play = play;
    pause = vi.fn(() => {});
    addEventListener = vi.fn(() => {});
  }

  vi.spyOn(window, 'Audio').mockImplementation(MockAudio as unknown as typeof Audio);

  const mediaFileService = { url: vi.fn(async () => url) };
  const el = await fixture<VoicePlayer>(html`<voice-player .media=${voice}></voice-player>`);
  el.services = { mediaFileService } as unknown as Services;

  return { el, play, mediaFileService };
}

describe('voice-player', () => {
  test('offers a labelled play button', async () => {
    const { el } = await mount();

    expect(tid(el, 'voice.toggle')).toHaveProperty('label', 'Play');
  });

  test('downloads and plays on tap, then shows pause', async () => {
    const { el, play, mediaFileService } = await mount();

    tid(el, 'voice.toggle')!.click();
    await settled(el);

    expect(mediaFileService.url).toHaveBeenCalledWith('voice:1');
    expect(play).toHaveBeenCalled();
    expect(tid(el, 'voice.toggle')).toHaveProperty('label', 'Pause');
  });

  test('stays on play when the file is unavailable', async () => {
    const { el, play } = await mount(null);

    tid(el, 'voice.toggle')!.click();
    await settled(el);

    expect(play).not.toHaveBeenCalled();
    expect(tid(el, 'voice.toggle')).toHaveProperty('label', 'Play');
  });
});
