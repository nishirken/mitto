import { describe, expect, test } from 'vitest';
import { fixture, html } from '@open-wc/testing';
import './mk-icon';
import type { IconType, MkIcon } from './mk-icon';

const paths: Record<IconType, string> = {
  'arrow-up': 'M12 19V5M5 12l7-7 7 7',
  'arrow-left': 'M19 12H5M12 5l-7 7 7 7',
  close: 'M18 6L6 18M6 6l12 12',
  image: 'M21 15l-5-5L5 21',
  play: 'M8 5v14l11-7z',
  pause: 'M7 5h4v14H7zM13 5h4v14h-4z',
};

const mount = (type: IconType) => fixture<MkIcon>(html`<mk-icon type=${type}></mk-icon>`);

describe('mk-icon', () => {
  test.each(Object.entries(paths))('renders a distinct glyph for %s', async (type, d) => {
    const el = await mount(type as IconType);

    expect(el.shadowRoot!.querySelector('path')).toHaveProperty(
      'attributes.d.value',
      d,
    );
  });

  test('hides the glyph from assistive technology', async () => {
    const el = await mount('close');

    expect(el.shadowRoot!.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
  });

  test('inherits colour from its container', async () => {
    const el = await mount('play');

    expect(el.shadowRoot!.querySelector('svg')!.getAttribute('fill')).toBe('currentColor');
  });
});
